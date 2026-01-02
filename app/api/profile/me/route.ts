import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { getDerivedStats } from "@/lib/profile-stats"
import { z } from "zod"

const updateProfileSchema = z.object({
  // Public profile
  nickname: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().max(200).optional(),
  publicEmail: z.boolean().optional(),
  interests: z.array(z.string()).max(10).optional(),
  socialLinks: z
    .object({
      twitter: z.string().max(200).optional(),
      linkedin: z.string().max(200).optional(),
      instagram: z.string().max(200).optional(),
      facebook: z.string().max(200).optional(),
    })
    .optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
  // Private profile (example - add more as needed)
  // Add private fields here if needed
})

// GET /api/profile/me - Get own profile with derived stats
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    if (isDemoMode) {
      return NextResponse.json({
        publicProfile: {
          uid: user.uid,
          nickname: "Demo User",
          bio: "Demo bio",
        },
        privateProfile: {},
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

    // Get public profile
    const publicProfileDoc = await db.collection("users_public").doc(user.uid).get()
    const publicProfile = publicProfileDoc.exists ? publicProfileDoc.data() : {}

    // Get private profile
    const privateProfileDoc = await db.collection("users_private").doc(user.uid).get()
    const privateProfile = privateProfileDoc.exists ? privateProfileDoc.data() : {}

    // Get derived stats
    const derivedStats = await getDerivedStats(user.uid)

    return NextResponse.json({
      publicProfile: {
        uid: user.uid,
        ...publicProfile,
      },
      privateProfile,
      derivedStats,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    console.error("[API Profile Me] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// PUT /api/profile/me - Update own profile
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth(request)

    const body = await request.json()
    const validatedData = updateProfileSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({ success: true, message: "Profile updated (demo mode)" })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Separate public and private data
    const publicData: any = {}
    const privateData: any = {}

    if (validatedData.nickname !== undefined) publicData.nickname = validatedData.nickname
    if (validatedData.bio !== undefined) publicData.bio = validatedData.bio
    if (validatedData.location !== undefined) publicData.location = validatedData.location
    if (validatedData.website !== undefined) publicData.website = validatedData.website
    if (validatedData.publicEmail !== undefined) publicData.publicEmail = validatedData.publicEmail
    if (validatedData.interests !== undefined) publicData.interests = validatedData.interests
    if (validatedData.socialLinks !== undefined) publicData.socialLinks = validatedData.socialLinks
    if (validatedData.avatarUrl !== undefined) publicData.avatarUrl = validatedData.avatarUrl

    // Update public profile
    if (Object.keys(publicData).length > 0) {
      await db
        .collection("users_public")
        .doc(user.uid)
        .set(
          {
            ...publicData,
            updatedAt: new Date(),
          },
          { merge: true }
        )
    }

    // Update private profile (if any private fields)
    if (Object.keys(privateData).length > 0) {
      await db
        .collection("users_private")
        .doc(user.uid)
        .set(
          {
            ...privateData,
            updatedAt: new Date(),
          },
          { merge: true }
        )
    }

    // Also update main users collection for backward compatibility
    if (Object.keys(publicData).length > 0) {
      await db
        .collection("users")
        .doc(user.uid)
        .set(
          {
            ...publicData,
            updatedAt: new Date(),
          },
          { merge: true }
        )
    }

    return NextResponse.json({ success: true, message: "Profile updated successfully" })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[API Profile Me] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




