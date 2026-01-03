import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

// POST /api/admin/neurocredits/config/publish - Publish draft
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        versionId: "demo-published-1",
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Find draft
    const draftQuery = await db
      .collection("neurocredits_config_versions")
      .where("status", "==", "draft")
      .limit(1)
      .get()

    if (draftQuery.empty) {
      return NextResponse.json({ error: "No draft found to publish." }, { status: 404 })
    }

    const draftDoc = draftQuery.docs[0]
    const draftRef = draftDoc.ref
    const draftData = draftDoc.data()

    // Update draft to published
    await draftRef.update({
      status: "published",
      publishedAt: new Date(),
      publishedByUid: admin.uid,
    })

    // Update meta to point to new active version
    const metaRef = db.collection("neurocredits_config").doc("meta")
    await metaRef.set(
      {
        activeVersionId: draftDoc.id,
        updatedAt: new Date(),
      },
      { merge: true }
    )

    return NextResponse.json({
      success: true,
      versionId: draftDoc.id,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin NeuroCredits Publish] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
