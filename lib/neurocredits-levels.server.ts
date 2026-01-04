import "server-only"
import { unstable_cache } from "next/cache"
import { getAdminApp } from "./firebase-admin"
import { isDemoMode } from "./env"

/**
 * Cache tag for levels configuration
 */
export const LEVELS_TAG = "gamification-levels"

/**
 * Default levels configuration (fallback)
 * Matches the structure in lib/neurocredits-levels.ts
 */
const DEFAULT_LEVELS = [
  { levelId: 1, minPoints: 0, name: "Principiante" },
  { levelId: 2, minPoints: 100, name: "Apprendista" },
  { levelId: 3, minPoints: 250, name: "Studioso" },
  { levelId: 4, minPoints: 500, name: "Esperto" },
  { levelId: 5, minPoints: 1000, name: "Maestro" },
  { levelId: 6, minPoints: 2000, name: "Guru" },
  { levelId: 7, minPoints: 3500, name: "Saggio" },
  { levelId: 8, minPoints: 5000, name: "Illuminato" },
  { levelId: 9, minPoints: 7500, name: "Genio" },
  { levelId: 10, minPoints: 10000, name: "Leggenda" },
  { levelId: 11, minPoints: 15000, name: "Mito" },
  { levelId: 12, minPoints: 25000, name: "Immortale" },
  { levelId: 13, minPoints: 40000, name: "Divino" },
  { levelId: 14, minPoints: 60000, name: "Trascendente" },
  { levelId: 15, minPoints: 100000, name: "Supremo" },
] as const

export interface LevelConfig {
  levelId: number
  minPoints: number
  name: string
  color?: string
  icon?: string
}

/**
 * Read levels configuration from Firestore (no cache)
 */
async function getLevelsFromFirestore(): Promise<LevelConfig[] | null> {
  if (isDemoMode) {
    return null
  }

  try {
    const app = await getAdminApp()
    if (!app) {
      return null
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const snapshot = await db.collection("gamification_levels").orderBy("minPoints", "asc").get()

    if (snapshot.empty) {
      return null
    }

    const levels: LevelConfig[] = []

    snapshot.docs.forEach((doc) => {
      const data = doc.data()

      // Defensive mapping: try multiple field names
      const levelId = data.levelId ?? data.level ?? (typeof doc.id === "string" && !isNaN(Number(doc.id)) ? Number(doc.id) : null)
      const minPoints = data.minPoints ?? data.creditsRequired ?? 0
      const name = data.name ?? data.label ?? (levelId ? `Level ${levelId}` : "Unknown")

      // Skip if levelId or minPoints is invalid
      if (typeof levelId !== "number" || isNaN(levelId) || typeof minPoints !== "number" || isNaN(minPoints)) {
        console.warn(`[Levels Adapter] Skipping invalid level doc: ${doc.id}`, { levelId, minPoints, name })
        return
      }

      levels.push({
        levelId,
        minPoints,
        name,
        color: data.color,
        icon: data.icon,
      })
    })

    // Sort by minPoints to ensure correct order
    levels.sort((a, b) => a.minPoints - b.minPoints)

    return levels.length > 0 ? levels : null
  } catch (error) {
    console.error("[Levels Adapter] Error reading from Firestore:", error)
    return null
  }
}

/**
 * Get levels configuration with cache and fallback
 * Uses unstable_cache with tag for invalidation
 */
export async function getLevelsConfig(): Promise<LevelConfig[]> {
  const getCachedLevels = unstable_cache(
    async () => {
      const firestoreLevels = await getLevelsFromFirestore()
      return firestoreLevels || DEFAULT_LEVELS
    },
    ["gamification-levels"], // Cache key
    {
      tags: [LEVELS_TAG], // Tag for revalidateTag()
      revalidate: 300, // 5 minutes TTL
    }
  )

  return getCachedLevels()
}

export interface LevelSummary {
  current: number
  name: string
  progress: {
    current: number
    next: number
    progress: number
  }
  nextLevelPoints: number
  pointsToNext: number
}

/**
 * Get level summary for a given neuroCredits total
 * Compatible with API payload structure
 */
export async function getLevelSummary(neuroCreditsTotal: number): Promise<LevelSummary> {
  const levels = await getLevelsConfig()

  // Find current level: maximum level with minPoints <= neuroCreditsTotal
  let currentLevel: LevelConfig | null = null
  for (let i = levels.length - 1; i >= 0; i--) {
    if (neuroCreditsTotal >= levels[i].minPoints) {
      currentLevel = levels[i]
      break
    }
  }

  // Fallback to first level if none found
  if (!currentLevel) {
    currentLevel = levels[0]
  }

  // Find next level (immediately following current by minPoints)
  const currentIndex = levels.findIndex((l) => l.levelId === currentLevel!.levelId)
  const nextLevel = currentIndex >= 0 && currentIndex < levels.length - 1 ? levels[currentIndex + 1] : null

  // Calculate progress
  let progressValue: number
  let nextPoints: number

  if (nextLevel) {
    const range = nextLevel.minPoints - currentLevel.minPoints
    if (range > 0) {
      progressValue = Math.max(0, Math.min(100, ((neuroCreditsTotal - currentLevel.minPoints) / range) * 100))
    } else {
      progressValue = 100
    }
    nextPoints = nextLevel.minPoints
  } else {
    // Max level reached
    progressValue = 100
    nextPoints = currentLevel.minPoints
  }

  // Calculate points to next
  const pointsToNext = nextLevel ? Math.max(0, nextLevel.minPoints - neuroCreditsTotal) : 0

  return {
    current: currentLevel.levelId,
    name: currentLevel.name,
    progress: {
      current: neuroCreditsTotal,
      next: nextPoints,
      progress: progressValue,
    },
    nextLevelPoints: nextPoints,
    pointsToNext,
  }
}

/**
 * TODO: When admin save/publish route is implemented, call revalidateTag(LEVELS_TAG) after saving
 * Example:
 *   import { revalidateTag } from 'next/cache'
 *   await revalidateTag(LEVELS_TAG)
 */
