import { getAdminApp } from "./firebase-admin"
import { isDemoMode } from "./env"
import { NEUROCREDITS_RULES, getPeriodId, getTodayString, type NeuroCreditEventType } from "./neurocredits-rules"
import { getActiveNeuroCreditsConfig, type NeuroCreditConfigRule } from "./neurocredits-config"

export interface NeuroCreditEventPayload {
  type: NeuroCreditEventType
  targetUid: string // User receiving the credits
  actorUid: string // User performing the action
  periodId?: string // Auto-calculated if not provided
  deltaNeuroCredits: number
  deltaVideosCompleted?: number
  deltaActiveDays?: number
  ref?: {
    postId?: string
    videoId?: string
    date?: string
  }
}

/**
 * Generate deterministic event ID for idempotency
 */
export function generateEventId(payload: NeuroCreditEventPayload): string {
  const { type, targetUid, actorUid, ref } = payload

  switch (type) {
    case "POST_CREATED":
      return `post:${ref?.postId}:${targetUid}`
    case "COMMENT_CREATED":
      return `comment:${ref?.postId}:${ref?.commentId}:${targetUid}`
    case "COMMENT_DELETED":
      return `comment_deleted:${ref?.postId}:${ref?.commentId}:${targetUid}`
    case "LIKE_RECEIVED":
      return `like:${ref?.postId}:${actorUid}`
    case "UNLIKE_RECEIVED":
      return `unlike:${ref?.postId}:${actorUid}`
    case "VIDEO_COMPLETED":
      return `video_completed:${ref?.videoId}:${targetUid}`
    case "DAILY_ACTIVE":
      return `daily_active:${targetUid}:${ref?.date || getTodayString()}`
    case "ADMIN_ADJUST":
      // Include reason hash for idempotency (same admin, same user, same reason = same event)
      const reasonHash = ref?.reason ? Buffer.from(ref.reason).toString("base64").slice(0, 16) : Date.now().toString()
      return `admin_adjust:${targetUid}:${actorUid}:${reasonHash}`
    default:
      return `${type}:${targetUid}:${actorUid}:${Date.now()}`
  }
}

/**
 * Write daily cap counter (inside transaction, NO reads - data must be pre-calculated)
 */
function writeDailyCap(
  transaction: any,
  capRef: any,
  eventType: NeuroCreditEventType,
  currentCapData: any
) {
  const rule = NEUROCREDITS_RULES[eventType]
  if (!rule.hasDailyCap) {
    return // No cap to update
  }

  if (eventType === "POST_CREATED") {
    const currentValue = currentCapData?.postCreditsUsed || 0
    transaction.set(
      capRef,
      {
        postCreditsUsed: currentValue + 1,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  } else if (eventType === "COMMENT_CREATED") {
    const currentValue = currentCapData?.commentCreditsUsed || 0
    transaction.set(
      capRef,
      {
        commentCreditsUsed: currentValue + 1,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  } else if (eventType === "VIDEO_COMPLETED") {
    const currentValue = currentCapData?.videoCreditsUsed || 0
    transaction.set(
      capRef,
      {
        videoCreditsUsed: currentValue + 1,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  } else if (eventType === "DAILY_ACTIVE") {
    transaction.set(
      capRef,
      {
        dailyActiveUsed: true,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  }
}

/**
 * Apply NeuroCredit event (idempotent via event ID)
 */
export async function applyEvent(payload: NeuroCreditEventPayload): Promise<{
  applied: boolean
  eventId: string
  neuroCreditsAwarded: number
}> {
  if (isDemoMode) {
    console.log("[NeuroCredits] Demo mode - event logged:", payload)
    return { applied: true, eventId: generateEventId(payload), neuroCreditsAwarded: payload.deltaNeuroCredits }
  }

  const app = await getAdminApp()
  if (!app) {
    console.warn("[NeuroCredits] Firebase Admin not initialized")
    return { applied: false, eventId: generateEventId(payload), neuroCreditsAwarded: 0 }
  }

  // Load active config (with cache + fallback)
  const config = await getActiveNeuroCreditsConfig()
  const configRule: NeuroCreditConfigRule | undefined = config.rules[payload.type]

  // Check if event type is enabled
  if (configRule && !configRule.enabled) {
    console.log(`[NeuroCredits] Event type ${payload.type} is disabled in config`)
    return { applied: false, eventId: generateEventId(payload), neuroCreditsAwarded: 0 }
  }

  // Determine points: use config if available, otherwise use payload.deltaNeuroCredits
  // For ADMIN_ADJUST, always use payload.deltaNeuroCredits (set by admin)
  let pointsToAward = payload.deltaNeuroCredits
  if (payload.type !== "ADMIN_ADJUST" && configRule) {
    pointsToAward = configRule.points
  }

  // Fallback to hardcoded rules if config rule not found
  const fallbackRule = NEUROCREDITS_RULES[payload.type]
  if (!configRule && fallbackRule) {
    pointsToAward = fallbackRule.neuroCredits
  }

  const { getFirestore } = await import("firebase-admin/firestore")
  const db = getFirestore(app)

  const eventId = generateEventId(payload)
  const periodId = payload.periodId || getPeriodId()
  const today = getTodayString()

  try {
    await db.runTransaction(async (transaction) => {
      // ============================================
      // FASE 1: TUTTE LE LETTURE (prima di qualsiasi scrittura)
      // ============================================
      const eventRef = db.collection("neurocredit_events").doc(eventId)
      const userRef = db.collection("users").doc(payload.targetUid)
      const allTimeEntryRef = db.collection("leaderboards").doc("all_time").collection("entries").doc(payload.targetUid)
      const monthlyEntryRef = db
        .collection("leaderboards")
        .doc(periodId)
        .collection("entries")
        .doc(payload.targetUid)
      
      // Determine daily cap: use config if available, otherwise fallback to hardcoded
      const dailyCap = configRule?.dailyCap ?? (fallbackRule?.hasDailyCap ? fallbackRule.dailyCap : null)
      const hasDailyCap = dailyCap !== null
      
      // Prepare capRef (only if needed)
      const capRef = hasDailyCap
        ? db.collection("users").doc(payload.targetUid).collection("dailyCaps").doc(today)
        : null

      // Execute all reads in parallel
      const [eventDoc, userDoc, allTimeEntryDoc, monthlyEntryDoc, capDoc] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(userRef),
        transaction.get(allTimeEntryRef),
        transaction.get(monthlyEntryRef),
        capRef ? transaction.get(capRef) : Promise.resolve(null),
      ])

      // Check idempotency early
      if (eventDoc.exists) {
        // Event already applied - idempotent return
        return
      }

      // Validate user exists
      if (!userDoc.exists) {
        throw new Error(`User ${payload.targetUid} not found`)
      }

      // ============================================
      // FASE 2: CALCOLI IN MEMORIA (dopo letture, prima di scritture)
      // ============================================
      const userData = userDoc.data()
      const capData = capDoc?.exists ? capDoc.data() : {}
      
      // Calculate cap status
      let capReached = false
      if (hasDailyCap && dailyCap !== null) {
        if (payload.type === "POST_CREATED") {
          capReached = (capData.postCreditsUsed || 0) >= dailyCap
        } else if (payload.type === "COMMENT_CREATED") {
          capReached = (capData.commentCreditsUsed || 0) >= dailyCap
        } else if (payload.type === "VIDEO_COMPLETED") {
          capReached = (capData.videoCreditsUsed || 0) >= dailyCap
        } else if (payload.type === "DAILY_ACTIVE") {
          capReached = capData.dailyActiveUsed === true
        }
      }

      const neuroCreditsToAward = capReached ? 0 : pointsToAward

      // Calculate user totals
      const currentNeuroCredits = userData?.neuroCredits_total || 0
      const currentVideosCompleted = userData?.videosCompleted_total || 0
      const currentActiveDays = userData?.activeDays_total || 0

      // Calculate monthly maps
      const neuroCreditsMonthly = { ...(userData?.neuroCredits_monthly || {}) }
      const videosCompletedMonthly = { ...(userData?.videosCompleted_monthly || {}) }
      const activeDaysMonthly = { ...(userData?.activeDays_monthly || {}) }

      neuroCreditsMonthly[periodId] = (neuroCreditsMonthly[periodId] || 0) + neuroCreditsToAward
      if (payload.deltaVideosCompleted) {
        videosCompletedMonthly[periodId] = (videosCompletedMonthly[periodId] || 0) + payload.deltaVideosCompleted
      }
      if (payload.deltaActiveDays) {
        activeDaysMonthly[periodId] = (activeDaysMonthly[periodId] || 0) + payload.deltaActiveDays
      }

      const newNeuroCreditsTotal = currentNeuroCredits + neuroCreditsToAward

      // Calculate leaderboard data
      const allTimeData = allTimeEntryDoc.exists ? allTimeEntryDoc.data() : {}
      const monthlyData = monthlyEntryDoc.exists ? monthlyEntryDoc.data() : {}

      // Log event creation
      console.log(`[NeuroCredits] 🎯 Applying event:`, {
        eventId,
        type: payload.type,
        targetUid: payload.targetUid,
        actorUid: payload.actorUid,
        deltaNeuroCredits: neuroCreditsToAward,
        capReached,
      })

      // ============================================
      // FASE 3: TUTTE LE SCRITTURE (dopo tutte le letture)
      // ============================================
      
      // Create event record (include configVersionId for audit)
      transaction.set(eventRef, {
        type: payload.type,
        targetUid: payload.targetUid,
        actorUid: payload.actorUid,
        periodId,
        deltaNeuroCredits: neuroCreditsToAward,
        deltaVideosCompleted: payload.deltaVideosCompleted || 0,
        deltaActiveDays: payload.deltaActiveDays || 0,
        ref: payload.ref || {},
        configVersionId: config.versionId, // Audit: which config version was used
        createdAt: new Date(),
      })

      // Update user document
      transaction.update(userRef, {
        neuroCredits_total: newNeuroCreditsTotal,
        neuroCredits_monthly: neuroCreditsMonthly,
        videosCompleted_total: currentVideosCompleted + (payload.deltaVideosCompleted || 0),
        videosCompleted_monthly: videosCompletedMonthly,
        activeDays_total: currentActiveDays + (payload.deltaActiveDays || 0),
        activeDays_monthly: activeDaysMonthly,
        updatedAt: new Date(),
      })

      // Update all-time leaderboard
      transaction.set(
        allTimeEntryRef,
        {
          neuroCredits: (allTimeData.neuroCredits || 0) + neuroCreditsToAward,
          videosCompleted: (allTimeData.videosCompleted || 0) + (payload.deltaVideosCompleted || 0),
          activeDays: (allTimeData.activeDays || 0) + (payload.deltaActiveDays || 0),
          displayName: userData?.nickname || userData?.email?.split("@")[0] || "User",
          avatarUrl: userData?.avatarUrl || null,
          updatedAt: new Date(),
        },
        { merge: true }
      )

      // Update monthly leaderboard
      transaction.set(
        monthlyEntryRef,
        {
          neuroCredits: (monthlyData.neuroCredits || 0) + neuroCreditsToAward,
          videosCompleted: (monthlyData.videosCompleted || 0) + (payload.deltaVideosCompleted || 0),
          activeDays: (monthlyData.activeDays || 0) + (payload.deltaActiveDays || 0),
          displayName: userData?.nickname || userData?.email?.split("@")[0] || "User",
          avatarUrl: userData?.avatarUrl || null,
          updatedAt: new Date(),
        },
        { merge: true }
      )

      // Update daily cap (only if credits awarded and has cap)
      if (!capReached && hasDailyCap && capRef) {
        writeDailyCap(transaction, capRef, payload.type, capData)
      }

      console.log(`[NeuroCredits] ✅ TX OK:`, {
        eventId,
        applied: true,
        neuroCreditsAwarded: neuroCreditsToAward,
        capReached,
        newTotal: newNeuroCreditsTotal,
      })

      console.log(`[NeuroCredits] 📊 Updated totals:`, {
        targetUid: payload.targetUid,
        neuroCredits_total: newNeuroCreditsTotal,
        neuroCredits_monthly: neuroCreditsMonthly[periodId],
        periodId,
      })
    })

    // Fetch the event to get the actual neuroCredits awarded
    const eventDoc = await db.collection("neurocredit_events").doc(eventId).get()
    const eventData = eventDoc.exists ? eventDoc.data() : null
    const neuroCreditsAwarded = eventData?.deltaNeuroCredits || 0

    return {
      applied: true,
      eventId,
      neuroCreditsAwarded,
    }
  } catch (error: any) {
    console.error("[NeuroCredits] Error applying event:", error)
    return { applied: false, eventId, neuroCreditsAwarded: 0 }
  }
}

/**
 * Touch daily active (idempotent - can be called multiple times per day)
 * Should be called on any "serious" action (create post, comment, like, complete video)
 */
export async function touchDailyActive(actorUid: string): Promise<boolean> {
  const today = getTodayString()
  const periodId = getPeriodId()

  const result = await applyEvent({
    type: "DAILY_ACTIVE",
    targetUid: actorUid,
    actorUid,
    periodId,
    deltaNeuroCredits: 1, // Will be 0 if cap reached
    deltaActiveDays: 1,
    ref: {
      date: today,
    },
  })

  if (result.applied) {
    // Update streak and lastActiveDate
    await updateStreak(actorUid, today)
  }

  return result.applied
}

/**
 * Update user streak based on lastActiveDate
 */
async function updateStreak(uid: string, today: string): Promise<void> {
  if (isDemoMode) {
    return
  }

  const app = await getAdminApp()
  if (!app) {
    return
  }

  const { getFirestore } = await import("firebase-admin/firestore")
  const db = getFirestore(app)

  try {
    await db.runTransaction(async (transaction) => {
      const userRef = db.collection("users").doc(uid)
      const userDoc = await transaction.get(userRef)

      if (!userDoc.exists) {
        return
      }

      const userData = userDoc.data()
      const lastActiveDate = userData?.lastActiveDate || null

      // Parse dates
      const todayDate = new Date(today + "T00:00:00")
      const yesterdayDate = new Date(todayDate)
      yesterdayDate.setDate(yesterdayDate.getDate() - 1)
      const yesterdayString = getTodayString(yesterdayDate)

      let streakCurrent = userData?.streak_current || 0
      let streakBest = userData?.streak_best || 0

      if (lastActiveDate === today) {
        // Already active today - no change
        return
      } else if (lastActiveDate === yesterdayString) {
        // Consecutive day - increment streak
        streakCurrent += 1
      } else {
        // New streak
        streakCurrent = 1
      }

      streakBest = Math.max(streakBest, streakCurrent)

      transaction.update(userRef, {
        lastActiveDate: today,
        streak_current: streakCurrent,
        streak_best: streakBest,
        updatedAt: new Date(),
      })
    })
  } catch (error) {
    console.error("[NeuroCredits] Error updating streak:", error)
  }
}

