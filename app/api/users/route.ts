import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

// GET /api/users - Get list of users (public data only, for messages/chat)
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = await verifyIdToken(request)
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "200")

    if (isDemoMode) {
      return NextResponse.json({
        users: [
          {
            uid: "demo-user",
            nickname: "Demo User",
            avatarUrl: null,
            email: "demo@example.com",
          },
        ],
      })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Try to get from users_public first (if exists)
    let usersSnapshot
    try {
      const usersPublicRef = db.collection("users_public")
      usersSnapshot = await usersPublicRef.limit(limit).get()

      if (usersSnapshot.empty) {
        // Fallback to users collection (but only return public data)
        const usersRef = db.collection("users")
        usersSnapshot = await usersRef.limit(limit).get()
      }
    } catch (_error: any) {
      // If users_public doesn't exist, use users collection
      const usersRef = db.collection("users")
      usersSnapshot = await usersRef.limit(limit).get()
    }

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        uid: doc.id,
        nickname: data.nickname || data.email?.split("@")[0] || "User",
        avatarUrl: data.avatarUrl || null,
        email: data.email || "", // Only for authenticated requests
        // Only include public fields
        bio: data.bio || null,
        location: data.location || null,
      }
    })

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("[API Users] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
