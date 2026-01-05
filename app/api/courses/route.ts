import { type NextRequest, NextResponse } from "next/server"
import { CoursesRepository } from "@/lib/repositories/academy/courses"

// GET /api/courses - Catalogo corsi (solo published per utenti normali)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const categoryId = url.searchParams.get("category") || undefined
    const q = url.searchParams.get("q") || undefined

    // Solo corsi pubblicati per utenti normali
    const courses = await CoursesRepository.getAll({
      published: true,
      categoryId,
      q,
    })

    return NextResponse.json({ courses })
  } catch (error: any) {
    console.error("[API Courses] Error fetching courses:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
