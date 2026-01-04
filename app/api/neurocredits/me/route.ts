import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { getPeriodId } from "@/lib/neurocredits-rules"
import { getLevelSummary } from "@/lib/neurocredits-levels.server"

// GET /api/neurocredits/me - Statistiche personali NeuroCredits
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    if (isDemoMode) {
      return NextResponse.json({
        neuroCredits_total: 100,
        neuroCredits_month_current: 50,
        videosCompleted_total: 5,
        videosCompleted_month_current: 2,
        activeDays_total: 10,
        activeDays_month_current: 5,
        streak_current: 3,
        streak_best: 5,
        level: {
          current: 2,
          name: "Apprendista",
          progress: {
            current: 100,
            next: 250,
            progress: 33.33,
          },
        },
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const userDoc = await db.collection("users").doc(user.uid).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const userData = userDoc.data()
    const periodId = getPeriodId()

    const neuroCreditsTotal = userData?.neuroCredits_total || 0
    const neuroCreditsMonthCurrent = userData?.neuroCredits_monthly?.[periodId] || 0
    const videosCompletedTotal = userData?.videosCompleted_total || 0
    const videosCompletedMonthCurrent = userData?.videosCompleted_monthly?.[periodId] || 0
    const activeDaysTotal = userData?.activeDays_total || 0
    const activeDaysMonthCurrent = userData?.activeDays_monthly?.[periodId] || 0
    const streakCurrent = userData?.streak_current || 0
    const streakBest = userData?.streak_best || 0

    const levelSummary = await getLevelSummary(neuroCreditsTotal)

    return NextResponse.json({
      neuroCredits_total: neuroCreditsTotal,
      neuroCredits_month_current: neuroCreditsMonthCurrent,
      videosCompleted_total: videosCompletedTotal,
      videosCompleted_month_current: videosCompletedMonthCurrent,
      activeDays_total: activeDaysTotal,
      activeDays_month_current: activeDaysMonthCurrent,
      streak_current: streakCurrent,
      streak_best: streakBest,
      level: {
        current: levelSummary.current,
        name: levelSummary.name,
        progress: levelSummary.progress,
      },
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    console.error("[API NeuroCredits Me] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




