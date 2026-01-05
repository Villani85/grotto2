import { type NextRequest, NextResponse } from "next/server"
import { CategoriesRepository } from "@/lib/repositories/academy/categories"

// GET /api/categories - Lista categorie attive
export async function GET(_request: NextRequest) {
  try {
    const categories = await CategoriesRepository.getAll()
    return NextResponse.json({ categories })
  } catch (error: any) {
    // Repository should handle index errors with fallback, but log unexpected errors
    console.error("[API Categories] Unexpected error:", error)
    return NextResponse.json(
      { 
        error: error.message || "Internal server error",
        code: "INTERNAL_ERROR"
      },
      { status: 500 }
    )
  }
}

