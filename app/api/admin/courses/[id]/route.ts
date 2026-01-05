import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { CoursesRepository } from "@/lib/repositories/academy/courses"
import { courseSchema } from "@/lib/validations-academy"
import { CategoriesRepository } from "@/lib/repositories/academy/categories"

// PUT /api/admin/courses/[id] - Aggiorna corso
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)

    const { id } = await params
    const body = await request.json()
    const validatedData = courseSchema.partial().parse(body)

    // Check if course exists
    const existing = await CoursesRepository.getById(id)
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    // If categoryId changed, verify it exists
    if (validatedData.categoryId && validatedData.categoryId !== existing.categoryId) {
      const category = await CategoriesRepository.getById(validatedData.categoryId)
      if (!category) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 })
      }
      validatedData.categoryName = category.name
    }

    // If slug changed, check uniqueness
    if (validatedData.slug && validatedData.slug !== existing.slug) {
      const slugExists = await CoursesRepository.getBySlug(validatedData.slug, false)
      if (slugExists && slugExists.id !== id) {
        return NextResponse.json({ error: "Slug already exists" }, { status: 400 })
      }
    }

    await CoursesRepository.update(id, {
      ...validatedData,
      updatedByUid: admin.uid,
    })

    return NextResponse.json({ success: true })
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
    console.error("[API Admin Course] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/admin/courses/[id] - Aggiorna solo published (minimalista)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin(request)

    const { id } = await params
    const body = await request.json()
    const { published } = body

    if (typeof published !== "boolean") {
      return NextResponse.json({ error: "published must be a boolean" }, { status: 400 })
    }

    // Check if course exists
    const existing = await CoursesRepository.getById(id)
    if (!existing) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 })
    }

    await CoursesRepository.update(id, {
      published,
      updatedByUid: admin.uid,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin Course] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/admin/courses/[id] - Elimina corso
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const _admin = await requireAdmin(request)

    const { id } = await params
    await CoursesRepository.delete(id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[API Admin Course] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

