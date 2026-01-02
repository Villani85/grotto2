import { type NextRequest, NextResponse } from "next/server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { getDerivedStats } from "@/lib/profile-stats"

// GET /api/profile/[uid] - Get public profile with derived stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params

    if (isDemoMode) {
      return NextResponse.json({
        publicProfile: {
          uid,
          nickname: "Demo User",
          bio: "Demo bio",
        },
        derivedStats: {
          neuroCredits_total: 100,
          neuroCredits_month_current: 50,
          level: {
            levelId: 2,
            title: "Apprendista",
            minPoints: 100,
            nextLevelPoints: 250,
            pointsToNext: 150,
          },
          rank: {
            all_time: 5,
            month_current: 3,
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

    // Get public profile only
    const publicProfileDoc = await db.collection("users_public").doc(uid).get()

    if (!publicProfileDoc.exists) {
      // Fallback to users collection for backward compatibility
      const userDoc = await db.collection("users").doc(uid).get()
      if (!userDoc.exists) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const userData = userDoc.data()
      const publicProfile = {
        uid,
        nickname: userData?.nickname || userData?.email?.split("@")[0] || "User",
        bio: userData?.bio || null,
        location: userData?.location || null,
        website: userData?.website || null,
        publicEmail: userData?.publicEmail || false,
        interests: userData?.interests || [],
        socialLinks: userData?.socialLinks || {},
        avatarUrl: userData?.avatarUrl || null,
      }

      // Get derived stats
      const derivedStats = await getDerivedStats(uid)

      return NextResponse.json({
        publicProfile,
        derivedStats,
      })
    }

    const publicProfile = publicProfileDoc.data()

    // Get derived stats
    const derivedStats = await getDerivedStats(uid)

    return NextResponse.json({
      publicProfile: {
        uid,
        ...publicProfile,
      },
      derivedStats,
    })
  } catch (error: any) {
    console.error("[API Profile] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




