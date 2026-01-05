import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { LiveEventsRepository } from "@/lib/repositories/live-events"
import { z } from "zod"
import { isDemoMode } from "@/lib/env"

const updateEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().optional(),
  description: z.string().max(5000).optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  status: z.enum(["draft", "scheduled", "live", "ended"]).optional(),
  published: z.boolean().optional(),
  active: z.boolean().optional(),
  playbackUrl: z.string().url().optional(),
  chatEnabled: z.boolean().optional(),
  speaker: z.string().max(200).optional().nullable(),
  speakerTitle: z.string().max(200).optional().nullable(),
  category: z.string().max(100).optional().nullable(),
  duration: z.number().int().positive().optional().nullable(),
  recordingId: z.string().optional().nullable(),
  recordingUrl: z.string().url().optional().nullable(),
})

// GET /api/admin/live-events/[id] - Get event details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        event: null,
      })
    }

    const event = await LiveEventsRepository.getById(id)

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      event,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: "AUTH_ERROR" },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("[API Admin Live Events] Error getting:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}

// PATCH /api/admin/live-events/[id] - Update event
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    let body: any
    try {
      body = await request.json()
    } catch (_parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", errorCode: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const validated = updateEventSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        event: { id, ...validated },
        demo: true,
      })
    }

    // Check if event exists
    const existingEvent = await LiveEventsRepository.getById(id)
    if (!existingEvent) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    // If setting active=true, use setActiveAdmin
    if (validated.active === true) {
      await LiveEventsRepository.setActive(id)
      // Also update other fields if provided
      if (Object.keys(validated).filter((k) => k !== "active").length > 0) {
        const { active, ...otherFields } = validated
        await LiveEventsRepository.update(id, otherFields)
      }
    } else {
      // If setting published=false and active=true, force active=false
      if (validated.published === false && existingEvent.active) {
        validated.active = false
      }
      await LiveEventsRepository.update(id, validated)
    }

    const updatedEvent = await LiveEventsRepository.getById(id)

    return NextResponse.json({
      success: true,
      event: updatedEvent,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: "AUTH_ERROR" },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.errors[0].message, errorCode: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    console.error("[API Admin Live Events] Error updating:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/live-events/[id] - Delete event
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request)
    const { id } = await params

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        demo: true,
      })
    }

    const event = await LiveEventsRepository.getById(id)
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    await LiveEventsRepository.delete(id)

    return NextResponse.json({
      success: true,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: "AUTH_ERROR" },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("[API Admin Live Events] Error deleting:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}

