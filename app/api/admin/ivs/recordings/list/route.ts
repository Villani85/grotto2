import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { isDemoMode } from "@/lib/env"

export const runtime = "nodejs"

// GET /api/admin/ivs/recordings/list - Lista registrazioni IVS da S3
export async function GET(request: NextRequest) {
  try {
    const _admin = await requireAdmin(request)

    if (isDemoMode) {
      return NextResponse.json({
        recordings: [],
        message: "Demo mode - S3 not accessible",
        demo: true,
      })
    }

    // AWS S3 Configuration
    const bucketName = process.env.AWS_S3_RECORDINGS_BUCKET || "v0-membership-recordings-tuonome2"
    const region = process.env.AWS_REGION || "eu-central-1"
    const prefix = process.env.AWS_S3_RECORDINGS_PREFIX || "ivs/v1/"

    // Check AWS credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.warn("[IVS Recordings] AWS credentials not configured")
      return NextResponse.json(
        {
          recordings: [],
          error: "AWS credentials not configured",
          errorCode: "AWS_NOT_CONFIGURED",
          config: {
            hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
            hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || "eu-central-1",
            bucket: process.env.AWS_S3_RECORDINGS_BUCKET || "v0-membership-recordings-tuonome2",
            prefix: process.env.AWS_S3_RECORDINGS_PREFIX || "ivs/v1/",
          },
        },
        { status: 503 }
      )
    }

    try {
      // Import AWS SDK v3
      const { S3Client, ListObjectsV2Command, GetObjectCommand } = await import("@aws-sdk/client-s3")
      
      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      // Get pagination params from query string
      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get("limit") || "30"), 100) // Max 100, default 30
      const continuationToken = searchParams.get("cursor") || undefined

      // List objects with prefix (paginated)
      const listCommand = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        MaxKeys: limit * 10, // Get more keys to filter, then limit results
        ContinuationToken: continuationToken,
      })

      const listResponse = await s3Client.send(listCommand)
      
      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        return NextResponse.json({
          recordings: [],
          message: "No recordings found in S3",
        })
      }

      // Filter for recording-ended.json files
      const endedJsonKeys = listResponse.Contents
        .map((obj) => obj.Key)
        .filter((key): key is string => key !== undefined && key.endsWith("/events/recording-ended.json"))

      if (endedJsonKeys.length === 0) {
        return NextResponse.json({
          recordings: [],
          message: "No recording-ended.json files found",
          count: 0,
        })
      }

      // Parse each recording-ended.json
      const recordings = await Promise.all(
        endedJsonKeys.map(async (endedKey) => {
          try {
            // Extract prefix (everything before /events/recording-ended.json)
            const prefix = endedKey.replace("/events/recording-ended.json", "")
            
            // Get the JSON file
            const getObjectCommand = new GetObjectCommand({
              Bucket: bucketName,
              Key: endedKey,
            })

            const objectResponse = await s3Client.send(getObjectCommand)
            
            if (!objectResponse.Body) {
              return null
            }

            // Read and parse JSON
            const bodyString = await objectResponse.Body.transformToString()
            const recordingData = JSON.parse(bodyString)

            // Check if media/hls exists - look for ANY .m3u8 file (not just index.m3u8)
            const mediaPrefix = `${prefix}/media/hls/`
            const mediaListCommand = new ListObjectsV2Command({
              Bucket: bucketName,
              Prefix: mediaPrefix,
              MaxKeys: 10, // Check first 10 files to find .m3u8
            })

            let hasMediaHls = false
            try {
              const mediaResponse = await s3Client.send(mediaListCommand)
              // Check if any file ends with .m3u8 (IVS can use different manifest names)
              hasMediaHls = (mediaResponse.Contents || []).some(
                (obj) => obj.Key?.endsWith(".m3u8") || false
              )
            } catch (_e) {
              // Ignore errors checking for media
            }

            return {
              endedKey,
              prefix,
              endedAt: recordingData.endedAt || recordingData.endTime || null,
              channelId: recordingData.channelId || recordingData.channelArn?.split("/").pop() || null,
              region,
              hasMediaHls,
              // Additional metadata from recording-ended.json
              duration: recordingData.duration || null,
              streamId: recordingData.streamId || null,
            }
          } catch (error: any) {
            console.error(`[IVS Recordings] Error parsing ${endedKey}:`, error)
            return null
          }
        })
      )

      // Filter out nulls
      const validRecordings = recordings.filter((r): r is NonNullable<typeof r> => r !== null)

      // Sort by endedAt (most recent first)
      validRecordings.sort((a, b) => {
        const aTime = a.endedAt ? new Date(a.endedAt).getTime() : 0
        const bTime = b.endedAt ? new Date(b.endedAt).getTime() : 0
        return bTime - aTime
      })

      // Apply limit after sorting
      const limitedRecordings = validRecordings.slice(0, limit)

      return NextResponse.json({
        recordings: limitedRecordings,
        count: limitedRecordings.length,
        total: validRecordings.length,
        hasMore: listResponse.IsTruncated || false,
        nextCursor: listResponse.NextContinuationToken || null,
      })
    } catch (s3Error: any) {
      console.error("[IVS Recordings] S3 error:", s3Error)
      return NextResponse.json(
        {
          recordings: [],
          error: s3Error.message || "Failed to list recordings from S3",
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin IVS Recordings List] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

