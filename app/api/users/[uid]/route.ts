import { type NextRequest, NextResponse } from "next/server"
import { isDemoMode, hasFirebaseAdminConfig } from "@/lib/env"
import { UsersRepository } from "@/lib/repositories/users"

// Get user profile by UID
export async function GET(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params

  // In demo mode, return mock data
  if (isDemoMode || !hasFirebaseAdminConfig) {
    console.log("[API] Demo mode - returning mock user data for:", uid)
    return NextResponse.json({
      uid,
      email: "demo@example.com",
      nickname: "DemoUser",
      pointsTotal: 150,
      subscriptionStatus: "active",
      isManualSubscription: false,
      isAdmin: true, // Make demo user admin
      marketingOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  try {
    // Try to get user from Firestore via repository
    // Note: For v0 compatibility, repository still uses mock data
    // In production with firebase-admin, this would read from Firestore
    const user = await UsersRepository.getById(uid)
    
    if (user) {
      return NextResponse.json(user)
    }

    // If user not found, return default structure
    return NextResponse.json({
      uid,
      email: "",
      nickname: "User",
      pointsTotal: 0,
      subscriptionStatus: "none",
      isManualSubscription: false,
      isAdmin: false, // Default to non-admin
      marketingOptIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[API] Error fetching user:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}

// Update user profile
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid: _uid } = await params

  return NextResponse.json({ error: "Demo mode - Updates disabled" }, { status: 403 })
}
