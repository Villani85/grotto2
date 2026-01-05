import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

// POST /api/admin/ivs/recordings - Salva metadati registrazione diretta IVS o importa da S3
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    
    // Robust JSON parsing - always return JSON
    let body: any
    try {
      body = await request.json()
    } catch (_parseError: any) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      )
    }
    
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body is required" },
        { status: 400 }
      )
    }

    // Check if this is an import request (from S3)
    if (body.title && body.endedKey && body.prefix) {
      // Import recording from S3
      const { title, endedKey, prefix } = body

      if (isDemoMode) {
        return NextResponse.json({
          success: true,
          id: "demo-id",
          message: "Demo mode - recording not saved",
          demo: true,
        })
      }

      const app = await getAdminApp()
      if (!app) {
        throw new Error("Firebase Admin not initialized")
      }

      const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
      const db = getFirestore(app)

      // Check for duplicates (unique key: endedKey or s3Prefix)
      const existingQuery = await db
        .collection("ivsRecordings")
        .where("endedKey", "==", endedKey)
        .limit(1)
        .get()

      if (!existingQuery.empty) {
        return NextResponse.json(
          {
            success: false,
            error: "Recording already imported",
            id: existingQuery.docs[0].id,
          },
          { status: 409 }
        )
      }

      // Extract endedAt from S3 JSON if possible
      // Try to fetch the recording-ended.json to get the actual endedAt
      let endedAt = new Date() // Fallback to current time
      
      try {
        // Import AWS SDK to fetch endedAt from S3
        const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3")
        const bucketName = process.env.AWS_S3_RECORDINGS_BUCKET || "v0-membership-recordings-tuonome2"
        const region = process.env.AWS_REGION || "eu-central-1"
        
        if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
          const s3Client = new S3Client({
            region,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
          })
          
          const getObjectCommand = new GetObjectCommand({
            Bucket: bucketName,
            Key: endedKey,
          })
          
          const objectResponse = await s3Client.send(getObjectCommand)
          if (objectResponse.Body) {
            const bodyString = await objectResponse.Body.transformToString()
            const recordingData = JSON.parse(bodyString)
            if (recordingData.endedAt || recordingData.endTime) {
              endedAt = new Date(recordingData.endedAt || recordingData.endTime)
            }
          }
        }
      } catch (e) {
        // If fetching from S3 fails, use current time as fallback
        console.warn("[IVS Recordings] Could not fetch endedAt from S3, using current time:", e)
      }

      // Create recording document in ivsRecordings collection
      const recordingRef = db.collection("ivsRecordings").doc()
      await recordingRef.set({
        title: title || `Registrazione ${new Date().toISOString()}`,
        s3Prefix: prefix,
        endedKey,
        endedAt, // Save endedAt for sorting without recalculating
        status: "READY",
        createdAt: FieldValue.serverTimestamp(),
        createdBy: admin.uid,
        updatedAt: FieldValue.serverTimestamp(),
        // Placeholder for future CloudFront URL
        playbackUrl: null,
        cloudFrontDistributionId: null,
      })

      return NextResponse.json({
        success: true,
        id: recordingRef.id,
        message: "Recording imported successfully",
      })
    }

    // Legacy: start/stop stream metadata
    const { action, streamKey, startedBy, stoppedBy, startedAt, stoppedAt } = body

    if (!action || (action !== "start" && action !== "stop")) {
      return NextResponse.json(
        { error: "Invalid action. Must be 'start' or 'stop', or provide title/endedKey/prefix for import" },
        { status: 400 }
      )
    }

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        message: "Demo mode - metadata not saved",
        demo: true,
      })
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    if (action === "start") {
      // Create new recording document
      const recordingRef = db.collection("ivs_recordings").doc()
      await recordingRef.set({
        streamKey: streamKey || "unknown",
        startedBy: startedBy || admin.uid,
        startedAt: startedAt ? new Date(startedAt) : FieldValue.serverTimestamp(),
        status: "live",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Best-effort: Update live event status if eventId/eventSlug provided
      if (body.eventId || body.eventSlug) {
        try {
          const { LiveEventsRepository } = await import("@/lib/repositories/live-events")
          const eventId = body.eventId
          const eventSlug = body.eventSlug

          let event
          if (eventId) {
            event = await LiveEventsRepository.getById(eventId)
          } else if (eventSlug) {
            event = await LiveEventsRepository.getBySlug(eventSlug, false)
          }

          if (event) {
            await LiveEventsRepository.update(event.id, {
              status: "live",
              startedAt: new Date(),
            })
            console.log("[IVS Recordings] Updated live event status to 'live':", event.id)
          }
        } catch (eventError) {
          // Don't fail the recording save if event update fails
          console.warn("[IVS Recordings] Could not update live event status:", eventError)
        }
      }

      return NextResponse.json({
        success: true,
        recordingId: recordingRef.id,
        message: "Stream start metadata saved",
      })
    } else {
      // action === "stop" - Make it idempotent
      // Find the most recent live recording for this stream key
      // Use try/catch to handle query errors gracefully
      let recordingsSnapshot
      try {
        recordingsSnapshot = await db
          .collection("ivs_recordings")
          .where("streamKey", "==", streamKey || "unknown")
          .where("status", "==", "live")
          .orderBy("startedAt", "desc")
          .limit(1)
          .get()
      } catch (_queryError: any) {
        // If query fails (e.g., missing index), try without orderBy
        try {
          recordingsSnapshot = await db
            .collection("ivs_recordings")
            .where("streamKey", "==", streamKey || "unknown")
            .where("status", "==", "live")
            .limit(1)
            .get()
        } catch (fallbackError: any) {
          // If still fails, return success anyway (idempotent)
          console.warn("[IVS Recordings] Query failed, but stop is idempotent:", fallbackError)
          return NextResponse.json({
            success: true,
            message: "Stream stop acknowledged (no live recording found or query failed)",
            warning: "Could not update recording metadata",
          })
        }
      }

      if (recordingsSnapshot.empty) {
        // No live recording found - this is OK (idempotent)
        return NextResponse.json({
          success: true,
          message: "Stream stop acknowledged (no live recording found)",
        })
      }

      // Update the most recent live recording
      const recordingDoc = recordingsSnapshot.docs[0]
      await recordingDoc.ref.update({
        stoppedBy: stoppedBy || admin.uid,
        stoppedAt: stoppedAt ? new Date(stoppedAt) : FieldValue.serverTimestamp(),
        status: "completed",
        updatedAt: FieldValue.serverTimestamp(),
      })

      // Best-effort: Update live event status if eventId/eventSlug provided
      if (body.eventId || body.eventSlug) {
        try {
          const { LiveEventsRepository } = await import("@/lib/repositories/live-events")
          const eventId = body.eventId
          const eventSlug = body.eventSlug

          let event
          if (eventId) {
            event = await LiveEventsRepository.getById(eventId)
          } else if (eventSlug) {
            event = await LiveEventsRepository.getBySlug(eventSlug, false)
          }

          if (event) {
            // Try to find the most recent recording for this event (by endedAt matching event end time)
            let recordingId: string | null = null
            let recordingUrl: string | null = null

            try {
              const recordingsSnapshot = await db
                .collection("ivsRecordings")
                .where("status", "==", "READY")
                .orderBy("endedAt", "desc")
                .limit(5)
                .get()

              // Find recording that ended around the same time as the event
              const eventEndTime = new Date()
              for (const recDoc of recordingsSnapshot.docs) {
                const recData = recDoc.data()
                const recEndTime = recData.endedAt?.toDate?.() || new Date(recData.endedAt)
                const timeDiff = Math.abs(eventEndTime.getTime() - recEndTime.getTime())
                // If recording ended within 5 minutes of event end, associate it
                if (timeDiff < 5 * 60 * 1000) {
                  recordingId = recDoc.id
                  // Try to construct HLS URL from S3 prefix
                  if (recData.s3Prefix) {
                    const bucketName = process.env.AWS_S3_RECORDINGS_BUCKET || "v0-membership-recordings-tuonome2"
                    const region = process.env.AWS_REGION || "eu-central-1"
                    // Construct S3 URL (admin can update to CloudFront later)
                    recordingUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${recData.s3Prefix}/media/hls/master.m3u8`
                  }
                  break
                }
              }
            } catch (recError) {
              console.warn("[IVS Recordings] Could not auto-associate recording:", recError)
            }

            await LiveEventsRepository.update(event.id, {
              status: "ended",
              endedAt: new Date(),
              ...(recordingId && { recordingId }),
              ...(recordingUrl && { recordingUrl }),
            })
            console.log("[IVS Recordings] Updated live event status to 'ended':", event.id, { recordingId })
          }
        } catch (eventError) {
          // Don't fail the recording save if event update fails
          console.warn("[IVS Recordings] Could not update live event status:", eventError)
        }
      }

      return NextResponse.json({
        success: true,
        recordingId: recordingDoc.id,
        message: "Stream stop metadata saved",
      })
    }
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin IVS Recordings] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}

