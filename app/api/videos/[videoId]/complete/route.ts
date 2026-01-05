import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { applyEvent, touchDailyActive } from "@/lib/neurocredits"
import { getPeriodId } from "@/lib/neurocredits-rules"

// POST /api/videos/[videoId]/complete - Completa video
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params
    const user = await requireAuth(request)

    if (isDemoMode) {
      return NextResponse.json({
        neuroCreditsTotal: 100,
        videosCompletedTotal: 1,
        periodStats: {
          neuroCredits: 10,
          videosCompleted: 1,
        },
        capsInfo: {
          videoCreditsUsed: 1,
          videoCreditsCap: 3,
        },
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const periodId = getPeriodId()

    // Use transaction to ensure idempotency
    let alreadyCompleted = false
    let neuroCreditsAwarded = 0

    await db.runTransaction(async (transaction) => {
      const progressRef = db.collection("users").doc(user.uid).collection("videoProgress").doc(videoId)
      const progressDoc = await transaction.get(progressRef)

      if (progressDoc.exists && progressDoc.data()?.completed === true) {
        // Already completed - idempotent return
        alreadyCompleted = true
        return
      }

      // Mark as completed
      transaction.set(
        progressRef,
        {
          completed: true,
          completedAt: new Date(),
          lastWatchedAt: new Date(),
        },
        { merge: true }
      )
    })

    if (alreadyCompleted) {
      // Return current stats without awarding credits again
      const userDoc = await db.collection("users").doc(user.uid).get()
      const userData = userDoc.data()

      // Get daily cap info
      const today = new Date().toISOString().split("T")[0]
      const capDoc = await db
        .collection("users")
        .doc(user.uid)
        .collection("dailyCaps")
        .doc(today)
        .get()
      const capData = capDoc.exists ? capDoc.data() : {}

      return NextResponse.json({
        neuroCreditsTotal: userData?.neuroCredits_total || 0,
        videosCompletedTotal: userData?.videosCompleted_total || 0,
        periodStats: {
          neuroCredits: userData?.neuroCredits_monthly?.[periodId] || 0,
          videosCompleted: userData?.videosCompleted_monthly?.[periodId] || 0,
        },
        capsInfo: {
          videoCreditsUsed: capData.videoCreditsUsed || 0,
          videoCreditsCap: 3,
        },
        message: "Video già completato",
      })
    }

    // Apply NeuroCredit event for video completion
    console.log("[API Video Complete] 🎯 Applying VIDEO_COMPLETED event:", {
      videoId,
      targetUid: user.uid,
      periodId,
      deltaNeuroCredits: 1,
      deltaVideosCompleted: 1,
    })

    const eventResult = await applyEvent({
      type: "VIDEO_COMPLETED",
      targetUid: user.uid,
      actorUid: user.uid,
      periodId,
      deltaNeuroCredits: 1, // Will be 0 if cap reached
      deltaVideosCompleted: 1,
      ref: {
        videoId,
      },
    })

    console.log("[API Video Complete] 🎯 NeuroCredit event result:", {
      applied: eventResult.applied,
      eventId: eventResult.eventId,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })

    neuroCreditsAwarded = eventResult.neuroCreditsAwarded

    // Touch daily active (idempotent)
    void touchDailyActive(user.uid).catch((error) => {
      console.error("[API Video Complete] Error touching daily active:", error)
    })

    // Fetch updated user stats
    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.data()

    // Get daily cap info
    const today = new Date().toISOString().split("T")[0]
    const capDoc = await db
      .collection("users")
      .doc(user.uid)
      .collection("dailyCaps")
      .doc(today)
      .get()
    const capData = capDoc.exists ? capDoc.data() : {}

    return NextResponse.json({
      neuroCreditsTotal: userData?.neuroCredits_total || 0,
      videosCompletedTotal: userData?.videosCompleted_total || 0,
      periodStats: {
        neuroCredits: userData?.neuroCredits_monthly?.[periodId] || 0,
        videosCompleted: userData?.videosCompleted_monthly?.[periodId] || 0,
      },
      capsInfo: {
        videoCreditsUsed: capData.videoCreditsUsed || 0,
        videoCreditsCap: 3,
      },
      neuroCreditsAwarded,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    console.error("[API Video Complete] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

