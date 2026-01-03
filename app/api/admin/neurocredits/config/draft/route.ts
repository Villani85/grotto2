import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { neuroCreditDraftUpdateSchema } from "@/lib/validations-neurocredits"

// POST /api/admin/neurocredits/config/draft - Create draft from active
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    if (isDemoMode) {
      return NextResponse.json({
        versionId: "demo-draft-1",
        status: "draft",
        createdAt: new Date().toISOString(),
        createdByUid: admin.uid,
        notes: "Demo draft",
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Check if draft already exists
    const existingDraftQuery = await db
      .collection("neurocredits_config_versions")
      .where("status", "==", "draft")
      .limit(1)
      .get()

    if (!existingDraftQuery.empty) {
      return NextResponse.json(
        { error: "Draft already exists. Delete or publish existing draft first." },
        { status: 400 }
      )
    }

    // Get active version
    const metaDoc = await db.collection("neurocredits_config").doc("meta").get()
    const meta = metaDoc.exists ? metaDoc.data() : null
    const activeVersionId = meta?.activeVersionId || null

    let sourceData: any = null

    if (activeVersionId) {
      const activeDoc = await db
        .collection("neurocredits_config_versions")
        .doc(activeVersionId)
        .get()
      if (activeDoc.exists) {
        sourceData = activeDoc.data()
      }
    }

    // If no active, use default from hardcoded rules
    if (!sourceData) {
      const { NEUROCREDITS_RULES } = await import("@/lib/neurocredits-rules")
      const DEFAULT_LEVELS = [
        { level: 1, creditsRequired: 0 },
        { level: 2, creditsRequired: 100 },
        { level: 3, creditsRequired: 250 },
        { level: 4, creditsRequired: 500 },
        { level: 5, creditsRequired: 1000 },
        { level: 6, creditsRequired: 2000 },
        { level: 7, creditsRequired: 3500 },
        { level: 8, creditsRequired: 5000 },
        { level: 9, creditsRequired: 7500 },
        { level: 10, creditsRequired: 10000 },
        { level: 11, creditsRequired: 15000 },
        { level: 12, creditsRequired: 25000 },
        { level: 13, creditsRequired: 40000 },
        { level: 14, creditsRequired: 60000 },
        { level: 15, creditsRequired: 100000 },
      ]
      sourceData = {
        rules: Object.fromEntries(
          Object.entries(NEUROCREDITS_RULES).map(([key, rule]) => [
            key,
            {
              points: rule.neuroCredits,
              enabled: true,
              dailyCap: rule.hasDailyCap ? rule.dailyCap : null,
              description: rule.description,
            },
          ])
        ),
        levels: DEFAULT_LEVELS.map((l) => ({
          id: l.level,
          name: `Level ${l.level}`,
          minPoints: l.creditsRequired,
        })),
        objectives: [],
        rewards: [],
      }
    }

    // Create draft
    const draftRef = db.collection("neurocredits_config_versions").doc()
    const draftData = {
      status: "draft" as const,
      createdAt: new Date(),
      createdByUid: admin.uid,
      notes: "",
      rules: sourceData.rules || {},
      levels: sourceData.levels || [],
      objectives: sourceData.objectives || [],
      rewards: sourceData.rewards || [],
    }

    await draftRef.set(draftData)

    return NextResponse.json({
      versionId: draftRef.id,
      ...draftData,
      createdAt: draftData.createdAt.toISOString(),
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin NeuroCredits Draft] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// PUT /api/admin/neurocredits/config/draft - Update draft
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)
    const body = await request.json()
    const validatedData = neuroCreditDraftUpdateSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({ success: true })
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
      return NextResponse.json({ error: "No draft found. Create a draft first." }, { status: 404 })
    }

    const draftRef = draftQuery.docs[0].ref
    const updateData: any = {
      updatedAt: new Date(),
      updatedByUid: admin.uid,
    }

    if (validatedData.rules !== undefined) updateData.rules = validatedData.rules
    if (validatedData.levels !== undefined) updateData.levels = validatedData.levels
    if (validatedData.objectives !== undefined) updateData.objectives = validatedData.objectives
    if (validatedData.rewards !== undefined) updateData.rewards = validatedData.rewards
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes

    await draftRef.update(updateData)

    return NextResponse.json({ success: true })
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
    console.error("[API Admin NeuroCredits Draft Update] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
