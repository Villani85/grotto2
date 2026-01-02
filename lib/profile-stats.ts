import { getAdminApp } from "./firebase-admin"
import { isDemoMode } from "./env"
import { calculateLevel, getProgressToNextLevel, getLevelName, getCreditsForNextLevel } from "./neurocredits-levels"
import { getPeriodId } from "./neurocredits-rules"

export interface LevelInfo {
  levelId: number
  title: string
  minPoints: number
  nextLevelPoints: number | null
  pointsToNext: number
}

export interface ProfileStats {
  neuroCredits_total: number
  neuroCredits_month_current: number
  level: LevelInfo
  rank: {
    all_time: number | null
    month_current: number | null
  }
}

/**
 * Compute level info from total NeuroCredits
 */
export function computeLevel(neuroCreditsTotal: number): LevelInfo {
  const levelId = calculateLevel(neuroCreditsTotal)
  const nextLevelPoints = getCreditsForNextLevel(neuroCreditsTotal)
  const progress = getProgressToNextLevel(neuroCreditsTotal)

  // Find current level's min points
  const LEVELS = [
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

  const currentLevelData = LEVELS.find((l) => l.level === levelId)!
  const pointsToNext = nextLevelPoints ? nextLevelPoints - neuroCreditsTotal : 0

  return {
    levelId,
    title: getLevelName(levelId),
    minPoints: currentLevelData.creditsRequired,
    nextLevelPoints,
    pointsToNext: Math.max(0, pointsToNext),
  }
}

/**
 * Get user rank for a specific period and metric
 * Returns rank (1-based) or null if user not found or outside top 200
 */
export async function getRank(
  periodId: string,
  uid: string,
  metric: "neuroCredits" | "videosCompleted" | "activeDays" = "neuroCredits"
): Promise<number | null> {
  if (isDemoMode) {
    return null
  }

  const app = await getAdminApp()
  if (!app) {
    return null
  }

  const { getFirestore } = await import("firebase-admin/firestore")
  const db = getFirestore(app)

  try {
    // 1. Read user entry
    const entryRef = db.collection("leaderboards").doc(periodId).collection("entries").doc(uid)
    const entryDoc = await entryRef.get()

    if (!entryDoc.exists) {
      return null
    }

    const entryData = entryDoc.data()
    const userPoints = entryData?.[metric] || 0

    if (userPoints === 0) {
      return null
    }

    // 2. Try COUNT aggregation (preferred method)
    try {
      const countQuery = db
        .collection("leaderboards")
        .doc(periodId)
        .collection("entries")
        .where(metric, ">", userPoints)

      // Use COUNT aggregation if available (Firestore 9.0+)
      const countSnapshot = await countQuery.count().get()
      const countGreater = countSnapshot.data().count

      return countGreater + 1
    } catch (countError) {
      // Fallback: use top 200 method
      console.warn("[Profile Stats] COUNT aggregation not available, using fallback:", countError)

      const topEntriesSnapshot = await db
        .collection("leaderboards")
        .doc(periodId)
        .collection("entries")
        .orderBy(metric, "desc")
        .limit(200)
        .get()

      let rank: number | null = null
      topEntriesSnapshot.docs.forEach((doc, index) => {
        if (doc.id === uid) {
          rank = index + 1
        }
      })

      return rank // null if not in top 200
    }
  } catch (error) {
    console.error("[Profile Stats] Error getting rank:", error)
    return null
  }
}

/**
 * Get derived stats for a user profile
 */
export async function getDerivedStats(uid: string): Promise<ProfileStats | null> {
  if (isDemoMode) {
    return {
      neuroCredits_total: 100,
      neuroCredits_month_current: 50,
      level: computeLevel(100),
      rank: {
        all_time: 5,
        month_current: 3,
      },
    }
  }

  const app = await getAdminApp()
  if (!app) {
    return null
  }

  const { getFirestore } = await import("firebase-admin/firestore")
  const db = getFirestore(app)

  try {
    // Get user data
    const userDoc = await db.collection("users").doc(uid).get()
    if (!userDoc.exists) {
      return null
    }

    const userData = userDoc.data()
    const periodId = getPeriodId()

    const neuroCreditsTotal = userData?.neuroCredits_total || 0
    const neuroCreditsMonthCurrent = userData?.neuroCredits_monthly?.[periodId] || 0

    // Compute level
    const level = computeLevel(neuroCreditsTotal)

    // Get ranks
    const [rankAllTime, rankMonthCurrent] = await Promise.all([
      getRank("all_time", uid, "neuroCredits"),
      getRank(periodId, uid, "neuroCredits"),
    ])

    return {
      neuroCredits_total: neuroCreditsTotal,
      neuroCredits_month_current: neuroCreditsMonthCurrent,
      level,
      rank: {
        all_time: rankAllTime,
        month_current: rankMonthCurrent,
      },
    }
  } catch (error) {
    console.error("[Profile Stats] Error getting derived stats:", error)
    return null
  }
}




