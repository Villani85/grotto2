import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { getPeriodId } from "@/lib/neurocredits-rules"
import { z } from "zod"

const leaderboardQuerySchema = z.object({
  period: z.enum(["all_time", "monthly"]).default("all_time"),
  metric: z.enum(["neuroCredits", "videosCompleted", "activeDays"]).default("neuroCredits"),
  limit: z.coerce.number().min(1).max(100).default(50),
})

// GET /api/leaderboard - Leaderboard ordinabile
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const queryParams = {
      period: url.searchParams.get("period") || "all_time",
      metric: url.searchParams.get("metric") || "neuroCredits",
      limit: url.searchParams.get("limit") || "50",
    }

    const validated = leaderboardQuerySchema.parse(queryParams)
    const period = validated.period === "monthly" ? getPeriodId() : "all_time"
    const metric = validated.metric
    const limit = validated.limit

    // Get current user for "me" summary
    const user = await verifyIdToken(request)

    if (isDemoMode) {
      return NextResponse.json({
        period,
        metric,
        entries: [],
        me: user
          ? {
              rank: null,
              neuroCredits: 0,
              videosCompleted: 0,
              activeDays: 0,
            }
          : null,
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Fetch leaderboard entries
    const entriesSnapshot = await db
      .collection("leaderboards")
      .doc(period)
      .collection("entries")
      .orderBy(metric, "desc")
      .limit(limit)
      .get()

    const entries = entriesSnapshot.docs.map((doc, index) => {
      const data = doc.data()
      return {
        rank: index + 1,
        uid: doc.id,
        displayName: data.displayName || "User",
        avatarUrl: data.avatarUrl || null,
        neuroCredits: data.neuroCredits || 0,
        videosCompleted: data.videosCompleted || 0,
        activeDays: data.activeDays || 0,
      }
    })

    // Get "me" summary if authenticated
    let meSummary = null
    if (user) {
      const userDoc = await db.collection("users").doc(user.uid).get()
      if (userDoc.exists) {
        const userData = userDoc.data()

        // Try to find user in leaderboard
        const myEntryDoc = await db
          .collection("leaderboards")
          .doc(period)
          .collection("entries")
          .doc(user.uid)
          .get()

        let rank: number | null = null
        if (myEntryDoc.exists) {
          // Count how many users have higher score
          const myValue = myEntryDoc.data()?.[metric] || 0
          const higherCount = await db
            .collection("leaderboards")
            .doc(period)
            .collection("entries")
            .where(metric, ">", myValue)
            .count()
            .get()

          rank = higherCount.data().count + 1
        }

        meSummary = {
          rank,
          neuroCredits: period === "all_time" ? userData?.neuroCredits_total || 0 : userData?.neuroCredits_monthly?.[period] || 0,
          videosCompleted:
            period === "all_time" ? userData?.videosCompleted_total || 0 : userData?.videosCompleted_monthly?.[period] || 0,
          activeDays: period === "all_time" ? userData?.activeDays_total || 0 : userData?.activeDays_monthly?.[period] || 0,
        }
      }
    }

    return NextResponse.json({
      period,
      metric,
      entries,
      me: meSummary,
    })
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[API Leaderboard] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




