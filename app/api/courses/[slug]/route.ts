import { type NextRequest, NextResponse } from "next/server"
import { CoursesRepository } from "@/lib/repositories/academy/courses"
import { ModulesRepository } from "@/lib/repositories/academy/modules"
import { LessonsRepository } from "@/lib/repositories/academy/lessons"
import type { Module, Lesson } from "@/lib/types-academy"

// GET /api/courses/[slug] - Dettaglio corso con moduli e lezioni
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const course = await CoursesRepository.getBySlug(slug, true)

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // Get modules and lessons
    const modules = await ModulesRepository.getByCourseId(course.id)
    const modulesWithLessons: Array<Module & { lessons: Lesson[] }> = []

    for (const module of modules) {
      const lessons = await LessonsRepository.getByModuleId(course.id, module.id)
      modulesWithLessons.push({
        ...module,
        lessons,
      })
    }

    return NextResponse.json({
      course,
      modules: modulesWithLessons,
    })
  } catch (error: any) {
    console.error("[API Course] Error fetching course:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




