import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

// GET /api/neurocredits/events - Debug: ultimi eventi NeuroCredits dell'utente
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "20")

    if (isDemoMode) {
      return NextResponse.json({
        events: [
          {
            id: "demo-event-1",
            type: "POST_CREATED",
            targetUid: user.uid,
            actorUid: user.uid,
            deltaNeuroCredits: 2,
            createdAt: new Date().toISOString(),
          },
        ],
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Query events where targetUid or actorUid matches user
    const eventsSnapshot = await db
      .collection("neurocredit_events")
      .where("targetUid", "==", user.uid)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const events = eventsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        type: data.type,
        targetUid: data.targetUid,
        actorUid: data.actorUid,
        periodId: data.periodId,
        deltaNeuroCredits: data.deltaNeuroCredits || 0,
        deltaVideosCompleted: data.deltaVideosCompleted || 0,
        deltaActiveDays: data.deltaActiveDays || 0,
        ref: data.ref || {},
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    return NextResponse.json({ events })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    console.error("[API NeuroCredits Events] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




