import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { LessonsRepository } from "@/lib/repositories/academy/lessons"
import { lessonSchema } from "@/lib/validations-academy"
import { CoursesRepository } from "@/lib/repositories/academy/courses"

// POST /api/admin/courses/[id]/modules/[moduleId]/lessons - Crea lezione
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; moduleId: string }> }
) {
  try {
    const _admin = await requireAdmin(request)
    const { id, moduleId } = await params

    // Verify course exists
    const course = await CoursesRepository.getById(id)
    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    const body = await request.json()
    const validatedData = lessonSchema.parse(body)

    const lessonId = await LessonsRepository.create(id, moduleId, validatedData)

    return NextResponse.json({ id: lessonId }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[API Admin Lesson] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

