import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { isDemoMode } from "@/lib/env"

export const runtime = "nodejs"

// Helper to map AWS S3 errors to readable error codes
function mapS3Error(err: any): {
  errorCode: string
  httpStatus: number
  errorName: string
  httpStatusFromSdk: number | null
  message: string
} {
  const errorName = err?.name || err?.Code || "UnknownError"
  const httpStatusFromSdk = err?.$metadata?.httpStatusCode || null
  const errorMessage = err?.message || String(err) || "Unknown error"
  const truncatedMessage = errorMessage.length > 200 ? errorMessage.substring(0, 200) + "..." : errorMessage

  // Invalid credentials
  if (
    errorName === "InvalidAccessKeyId" ||
    errorName === "SignatureDoesNotMatch" ||
    (httpStatusFromSdk === 403 && errorMessage.includes("The AWS Access Key Id you provided does not exist"))
  ) {
    return {
      errorCode: "AWS_INVALID_CREDENTIALS",
      httpStatus: 401,
      errorName,
      httpStatusFromSdk,
      message: truncatedMessage,
    }
  }

  // Access denied (permissions)
  if (errorName === "AccessDenied" || (httpStatusFromSdk === 403 && errorName !== "InvalidAccessKeyId")) {
    return {
      errorCode: "AWS_ACCESS_DENIED",
      httpStatus: 403,
      errorName,
      httpStatusFromSdk,
      message: truncatedMessage,
    }
  }

  // Bucket not found
  if (errorName === "NoSuchBucket" || httpStatusFromSdk === 404) {
    return {
      errorCode: "AWS_BUCKET_NOT_FOUND",
      httpStatus: 404,
      errorName,
      httpStatusFromSdk,
      message: truncatedMessage,
    }
  }

  // Region mismatch / redirect
  if (
    errorName === "PermanentRedirect" ||
    errorName === "AuthorizationHeaderMalformed" ||
    httpStatusFromSdk === 301 ||
    (errorMessage.includes("redirect") && errorMessage.includes("region"))
  ) {
    return {
      errorCode: "AWS_REGION_MISMATCH",
      httpStatus: 409,
      errorName,
      httpStatusFromSdk,
      message: truncatedMessage,
    }
  }

  // Other errors
  return {
    errorCode: "AWS_S3_ERROR",
    httpStatus: 500,
    errorName,
    httpStatusFromSdk,
    message: truncatedMessage,
  }
}

// GET /api/admin/ivs/recordings/verify - Verifica configurazione AWS S3
export async function GET(request: NextRequest) {
  try {
    const _admin = await requireAdmin(request)

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        status: "OK",
        errorCode: null,
        message: "Demo mode - S3 verification skipped",
        config: {
          hasAccessKey: true,
          hasSecretKey: true,
          region: "eu-central-1",
          bucket: "demo-bucket",
          prefix: "ivs/v1/",
        },
        diagnostics: {
          headBucket: "ok",
          list: "ok",
        },
        count: 0,
        sampleKeys: [],
        error: null,
        demo: true,
      })
    }

    // Check environment variables
    const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID
    const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY
    const region = process.env.AWS_REGION || "eu-central-1"
    const bucket = process.env.AWS_S3_RECORDINGS_BUCKET || "v0-membership-recordings-tuonome2"
    const prefix = process.env.AWS_S3_RECORDINGS_PREFIX || "ivs/v1/"

    const config = {
      hasAccessKey,
      hasSecretKey,
      region,
      bucket: bucket || null,
      prefix,
    }

    // If missing required env, return early
    if (!hasAccessKey || !hasSecretKey || !bucket) {
      return NextResponse.json(
        {
          success: false,
          status: "NOT_CONFIGURED",
          errorCode: "AWS_NOT_CONFIGURED",
          message: "AWS environment variables missing",
          config,
          diagnostics: {
            headBucket: "not_attempted",
            list: "not_attempted",
          },
          count: 0,
          sampleKeys: [],
          error: null,
        },
        { status: 503 }
      )
    }

    // Try to connect to S3
    try {
      const { S3Client, HeadBucketCommand, ListObjectsV2Command } = await import("@aws-sdk/client-s3")

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })

      // Step 1: HeadBucket (check bucket access and region)
      let headBucketOk = false
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucket }))
        headBucketOk = true
      } catch (headError: any) {
        const mappedError = mapS3Error(headError)
        return NextResponse.json(
          {
            success: false,
            status: "ERROR",
            errorCode: mappedError.errorCode,
            message: `S3 bucket access failed: ${mappedError.message}`,
            config,
            diagnostics: {
              headBucket: "failed",
              list: "not_attempted",
            },
            count: 0,
            sampleKeys: [],
            error: {
              name: mappedError.errorName,
              httpStatus: mappedError.httpStatusFromSdk,
              message: mappedError.message,
            },
          },
          { status: mappedError.httpStatus }
        )
      }

      // Step 2: ListObjectsV2 (check prefix and list objects)
      let _listOk = false
      let contents: any[] = []
      try {
        const listCommand = new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix,
          MaxKeys: 10,
        })
        const listResponse = await s3Client.send(listCommand)
        contents = listResponse.Contents || []
        _listOk = true
      } catch (listError: any) {
        const mappedError = mapS3Error(listError)
        return NextResponse.json(
          {
            success: false,
            status: "ERROR",
            errorCode: mappedError.errorCode,
            message: `S3 list objects failed: ${mappedError.message}`,
            config,
            diagnostics: {
              headBucket: headBucketOk ? "ok" : "failed",
              list: "failed",
            },
            count: 0,
            sampleKeys: [],
            error: {
              name: mappedError.errorName,
              httpStatus: mappedError.httpStatusFromSdk,
              message: mappedError.message,
            },
          },
          { status: mappedError.httpStatus }
        )
      }

      // Success: both HeadBucket and ListObjects succeeded
      const keys = contents.map((c) => c.Key).filter((key): key is string => key !== undefined && key !== null)
      const sampleKeys = keys.slice(0, 10)
      const count = keys.length
      const endedJsonCount = keys.filter((k) => k.endsWith("recording-ended.json")).length

      const status = count > 0 ? "OK" : "OK_EMPTY_PREFIX"
      const message =
        count > 0
          ? `S3 reachable and ${count} object(s) found under prefix`
          : "S3 reachable, but no objects found under prefix"

      return NextResponse.json({
        success: true,
        status,
        errorCode: null,
        message,
        config,
        diagnostics: {
          headBucket: "ok",
          list: "ok",
        },
        count,
        sampleKeys,
        endedJsonCount,
        error: null,
      })
    } catch (s3Error: any) {
      // Unexpected error during S3 operations
      const mappedError = mapS3Error(s3Error)
      return NextResponse.json(
        {
          success: false,
          status: "ERROR",
          errorCode: mappedError.errorCode,
          message: `S3 operation failed: ${mappedError.message}`,
          config,
          diagnostics: {
            headBucket: "unknown",
            list: "unknown",
          },
          count: 0,
          sampleKeys: [],
          error: {
            name: mappedError.errorName,
            httpStatus: mappedError.httpStatusFromSdk,
            message: mappedError.message,
          },
        },
        { status: mappedError.httpStatus }
      )
    }
  } catch (error: any) {
    // Auth or other errors
    if (error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin IVS Recordings Verify] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}


