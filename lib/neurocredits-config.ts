import { getAdminApp } from "./firebase-admin"
import { isDemoMode } from "./env"
import { NEUROCREDITS_RULES } from "./neurocredits-rules"

// Default levels (same as neurocredits-levels.ts)
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
import type { NeuroCreditEventType } from "./neurocredits-rules"

export interface NeuroCreditConfigRule {
  points: number
  enabled: boolean
  dailyCap: number | null
  description?: string
}

export interface NeuroCreditConfig {
  versionId: string
  status: "draft" | "published"
  rules: Record<NeuroCreditEventType, NeuroCreditConfigRule>
  levels: Array<{
    id: number
    name: string
    minPoints: number
    color?: string
    icon?: string
  }>
  objectives: Array<{
    id: string
    title: string
    metric: string
    target: number
    windowDays: number
    rewardPoints: number
    enabled: boolean
  }>
  rewards: Array<{
    id: string
    title: string
    description?: string
    cost: number
    enabled: boolean
    stock: number | null
    minLevel: number | null
    expiresAt: string | null
  }>
}

// Cache for active config (TTL: 60 seconds)
let cachedConfig: NeuroCreditConfig | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 60 * 1000 // 60 seconds

/**
 * Get active NeuroCredits configuration from Firestore
 * Uses cache with 60s TTL for performance
 * Falls back to hardcoded rules if config not found
 */
export async function getActiveNeuroCreditsConfig(): Promise<NeuroCreditConfig> {
  // Check cache
  const now = Date.now()
  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig
  }

  if (isDemoMode) {
    // Return default config in demo mode
    const defaultConfig: NeuroCreditConfig = {
      versionId: "default",
      status: "published",
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
      ) as Record<NeuroCreditEventType, NeuroCreditConfigRule>,
      levels: DEFAULT_LEVELS.map((l) => ({
        id: l.level,
        name: `Level ${l.level}`,
        minPoints: l.creditsRequired,
      })),
      objectives: [],
      rewards: [],
    }
    cachedConfig = defaultConfig
    cacheTimestamp = now
    return defaultConfig
  }

  const app = await getAdminApp()
  if (!app) {
    console.warn("[NeuroCredits Config] Firebase Admin not initialized, using default")
    return getDefaultConfig()
  }

  try {
    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get meta to find active version
    const metaDoc = await db.collection("neurocredits_config").doc("meta").get()
    const meta = metaDoc.exists ? metaDoc.data() : null
    const activeVersionId = meta?.activeVersionId || null

    if (!activeVersionId) {
      console.log("[NeuroCredits Config] No active version found, using default")
      return getDefaultConfig()
    }

    // Get active version
    const activeDoc = await db
      .collection("neurocredits_config_versions")
      .doc(activeVersionId)
      .get()

    if (!activeDoc.exists) {
      console.warn("[NeuroCredits Config] Active version not found, using default")
      return getDefaultConfig()
    }

    const activeData = activeDoc.data()
    if (activeData?.status !== "published") {
      console.warn("[NeuroCredits Config] Active version not published, using default")
      return getDefaultConfig()
    }

    // Build config object
    const config: NeuroCreditConfig = {
      versionId: activeVersionId,
      status: "published",
      rules: (activeData.rules || {}) as Record<NeuroCreditEventType, NeuroCreditConfigRule>,
      levels: activeData.levels || [],
      objectives: activeData.objectives || [],
      rewards: activeData.rewards || [],
    }

    // Validate and fill missing rules with defaults
    for (const [key, defaultRule] of Object.entries(NEUROCREDITS_RULES)) {
      if (!config.rules[key as NeuroCreditEventType]) {
        config.rules[key as NeuroCreditEventType] = {
          points: defaultRule.neuroCredits,
          enabled: true,
          dailyCap: defaultRule.hasDailyCap ? defaultRule.dailyCap : null,
          description: defaultRule.description,
        }
      }
    }

    // Cache it
    cachedConfig = config
    cacheTimestamp = now

    return config
  } catch (error) {
    console.error("[NeuroCredits Config] Error loading config:", error)
    return getDefaultConfig()
  }
}

/**
 * Get default config from hardcoded rules
 */
function getDefaultConfig(): NeuroCreditConfig {
  return {
    versionId: "default",
    status: "published",
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
    ) as Record<NeuroCreditEventType, NeuroCreditConfigRule>,
    levels: LEVELS.map((l) => ({
      id: l.level,
      name: `Level ${l.level}`,
      minPoints: l.creditsRequired,
    })),
    objectives: [],
    rewards: [],
  }
}

/**
 * Clear config cache (useful after publish)
 */
export function clearNeuroCreditsConfigCache(): void {
  cachedConfig = null
  cacheTimestamp = 0
}
