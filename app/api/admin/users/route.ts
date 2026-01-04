import { type NextRequest, NextResponse } from "next/server"
import { UsersRepository } from "@/lib/repositories/users"
import { requireAdmin } from "@/lib/auth-helpers"

// Get all users (admin only)
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const users = await UsersRepository.getAll(500)
    return NextResponse.json(users)
  } catch (error: any) {
    console.error("[API Admin] Error fetching users:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
