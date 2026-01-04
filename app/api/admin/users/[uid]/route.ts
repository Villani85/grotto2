import { type NextRequest, NextResponse } from "next/server"
import { UsersRepository } from "@/lib/repositories/users"
import { isDemoMode } from "@/lib/env"
import { requireAdmin } from "@/lib/auth-helpers"

// Update user (admin only)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params

  if (isDemoMode) {
    return NextResponse.json({ error: "Demo mode - Updates disabled" }, { status: 403 })
  }

  try {
    await requireAdmin(request)
    const body = await request.json()

    const success = await UsersRepository.update(uid, body)

    if (!success) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 })
    }

    const updatedUser = await UsersRepository.getById(uid)
    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error("[API Admin] Error updating user:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
