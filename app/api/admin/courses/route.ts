import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { CoursesRepository } from "@/lib/repositories/academy/courses"
import { courseSchema } from "@/lib/validations-academy"
import { CategoriesRepository } from "@/lib/repositories/academy/categories"

// GET /api/admin/courses - Lista tutti i corsi (admin)
export async function GET(request: NextRequest) {
  try {
    const _admin = await requireAdmin(request)
    const courses = await CoursesRepository.getAll({ published: undefined })
    return NextResponse.json({ courses })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin Courses] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// POST /api/admin/courses - Crea nuovo corso
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    let body: any
    try {
      body = await request.json()
    } catch (_parseError: any) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 }
      )
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body is required" },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!body.title || typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 }
      )
    }

    if (!body.categoryId || typeof body.categoryId !== "string") {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      )
    }

    let validatedData
    try {
      validatedData = courseSchema.parse(body)
    } catch (zodError: any) {
      return NextResponse.json(
        { success: false, error: zodError.errors?.[0]?.message || "Validation error" },
        { status: 400 }
      )
    }

    // Verify category exists
    const category = await CategoriesRepository.getById(validatedData.categoryId)
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 400 })
    }

    // Check slug uniqueness
    const existing = await CoursesRepository.getBySlug(validatedData.slug, false)
    if (existing) {
      return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
    }

    const courseId = await CoursesRepository.create({
      ...validatedData,
      categoryName: category.name,
      createdByUid: admin.uid,
      updatedByUid: admin.uid,
    })

    return NextResponse.json({ success: true, id: courseId }, { status: 201 })
  } catch (error: any) {
    // Always return JSON, never empty body or HTML
    if (error.message === "Unauthorized") {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ success: false, error: error.errors?.[0]?.message || "Validation error" }, { status: 400 })
    }
    console.error("[API Admin Courses] Error:", error)
    return NextResponse.json({ success: false, error: error.message || "Internal server error" }, { status: 500 })
  }
}
