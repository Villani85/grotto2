import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { adminAdjustSchema } from "@/lib/validations-neurocredits"
import { applyEvent } from "@/lib/neurocredits"
import { getPeriodId } from "@/lib/neurocredits-rules"

// POST /api/admin/neurocredits/users/[uid]/adjust - Admin adjust user NeuroCredits
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const admin = await requireAdmin(request)
    const { uid } = await params
    const body = await request.json()
    const validatedData = adminAdjustSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        eventId: `demo-admin-adjust-${Date.now()}`,
        neuroCreditsAwarded: validatedData.deltaNeuroCredits,
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Verify target user exists
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Apply ADMIN_ADJUST event
    const periodId = getPeriodId()
    const eventResult = await applyEvent({
      type: "ADMIN_ADJUST",
      targetUid: uid,
      actorUid: admin.uid,
      periodId,
      deltaNeuroCredits: validatedData.deltaNeuroCredits,
      ref: {
        reason: validatedData.reason,
        adminUid: admin.uid,
      },
    })

    if (!eventResult.applied) {
      return NextResponse.json(
        { error: "Failed to apply adjustment" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      eventId: eventResult.eventId,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[API Admin NeuroCredits Adjust] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
