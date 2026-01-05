import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { CoursesRepository } from "@/lib/repositories/academy/courses"
import { LessonsRepository } from "@/lib/repositories/academy/lessons"

// POST /api/admin/courses/[id]/recalculate - Ricalcola durationMinutes e lessonsCount
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const _admin = await requireAdmin(request)
    const { id } = await params

    // Get all lessons for this course
    const lessons = await LessonsRepository.getAllByCourseId(id)

    // Calculate totals
    const durationMinutes = lessons.reduce((sum, lesson) => sum + (lesson.durationMinutes || 0), 0)
    const lessonsCount = lessons.length

    // Update course
    await CoursesRepository.update(id, {
      durationMinutes,
      lessonsCount,
    })

    return NextResponse.json({
      success: true,
      durationMinutes,
      lessonsCount,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin Recalculate] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

