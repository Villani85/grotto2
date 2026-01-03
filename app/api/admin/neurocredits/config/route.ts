import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { NEUROCREDITS_RULES } from "@/lib/neurocredits-rules"

// Import LEVELS from neurocredits-levels (it's not exported, we'll define inline)
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

// GET /api/admin/neurocredits/config - Get active + draft config
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    if (isDemoMode) {
      // Return mock config in demo mode
      const mockActive = {
        versionId: "demo-v1",
        status: "published" as const,
        createdAt: new Date().toISOString(),
        createdByUid: "demo-admin",
        notes: "Demo configuration",
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
        levels: DEFAULT_LEVELS.map((l, idx) => ({
          id: l.level,
          name: `Level ${l.level}`,
          minPoints: l.creditsRequired,
          color: undefined,
          icon: undefined,
        })),
        objectives: [],
        rewards: [],
      }
      return NextResponse.json({
        active: mockActive,
        draft: null,
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get meta to find active version
    const metaDoc = await db.collection("neurocredits_config").doc("meta").get()
    const meta = metaDoc.exists ? metaDoc.data() : null
    const activeVersionId = meta?.activeVersionId || null

    let active = null
    let draft = null

    // Get active version
    if (activeVersionId) {
      const activeDoc = await db
        .collection("neurocredits_config_versions")
        .doc(activeVersionId)
        .get()
      if (activeDoc.exists) {
        active = { versionId: activeVersionId, ...activeDoc.data() }
      }
    }

    // Get draft version (if exists)
    const draftQuery = await db
      .collection("neurocredits_config_versions")
      .where("status", "==", "draft")
      .limit(1)
      .get()

    if (!draftQuery.empty) {
      const draftDoc = draftQuery.docs[0]
      draft = { versionId: draftDoc.id, ...draftDoc.data() }
    }

    // If no active config, return default from hardcoded rules
    if (!active) {
      active = {
        versionId: "default",
        status: "published" as const,
        createdAt: new Date().toISOString(),
        createdByUid: "system",
        notes: "Default hardcoded configuration",
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
          color: undefined,
          icon: undefined,
        })),
        objectives: [],
        rewards: [],
      }
    }

    return NextResponse.json({ active, draft })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin NeuroCredits Config] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
