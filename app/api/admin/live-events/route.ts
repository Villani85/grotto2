import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { LiveEventsRepository, type LiveEventCreateInput } from "@/lib/repositories/live-events"
import { z } from "zod"
import { isDemoMode } from "@/lib/env"

// Explicit nodejs runtime to avoid edge runtime issues with firebase-admin
export const runtime = "nodejs"

const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  slug: z.string().optional(),
  description: z.string().max(5000).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),
  playbackUrl: z.string().url().optional(),
  chatEnabled: z.boolean().optional(),
  speaker: z.string().max(200).optional(),
  speakerTitle: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  duration: z.number().int().positive().optional(),
})

// GET /api/admin/live-events - List all events
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "100")

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        events: [],
      })
    }

    const events = await LiveEventsRepository.listAdmin(limit)

    return NextResponse.json({
      success: true,
      events,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: error.message, errorCode: "AUTH_ERROR" },
        { status: error.message === "Unauthorized" ? 401 : 403 }
      )
    }
    console.error("[API Admin Live Events] Error listing:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}

// POST /api/admin/live-events - Create event
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request)

    // Parse body with error handling
    let body: any
    try {
      body = await request.json()
    } catch (parseError: any) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", errorCode: "BAD_JSON" },
        { status: 400 }
      )
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Request body is required", errorCode: "BAD_JSON" },
        { status: 400 }
      )
    }

    // Log body in dev for debugging
    if (process.env.NODE_ENV === "development") {
      console.log("[LiveEvents] POST body:", JSON.stringify(body, null, 2))
    }

    // Validate with Zod
    let validated: any
    try {
      validated = createEventSchema.parse(body)
    } catch (zodError: any) {
      if (zodError.name === "ZodError") {
        // Log Zod issues in dev
        if (process.env.NODE_ENV === "development") {
          console.log("[LiveEvents] Zod issues:", JSON.stringify(zodError.issues, null, 2))
        }
        return NextResponse.json(
          {
            success: false,
            error: zodError.errors?.[0]?.message || "Validation error",
            errorCode: "VALIDATION_ERROR",
            fieldErrors: zodError.errors || zodError.issues,
          },
          { status: 400 }
        )
      }
      throw zodError
    }

    // Demo mode
    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        event: {
          id: "demo-id",
          title: validated.title,
          slug: validated.slug || validated.title.toLowerCase().replace(/\s+/g, "-"),
          status: "draft",
          published: false,
          active: false,
        },
        demo: true,
      })
    }

    // Prepare data
    const createData: LiveEventCreateInput = {
      title: validated.title,
      slug: validated.slug,
      description: validated.description,
      scheduledAt: validated.scheduledAt ? new Date(validated.scheduledAt) : null,
      playbackUrl: validated.playbackUrl,
      chatEnabled: validated.chatEnabled,
      speaker: validated.speaker,
      speakerTitle: validated.speakerTitle,
      category: validated.category,
      duration: validated.duration,
      createdBy: admin.uid,
    }

    // Create event
    const event = await LiveEventsRepository.create(createData)

    const traceId = Date.now().toString(36)
    return NextResponse.json({ success: true, event, traceId }, { status: 201 })
  } catch (error: any) {
    // Always return JSON, never empty body or HTML
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Authentication required", errorCode: "AUTH_ERROR" },
        { status: 401 }
      )
    }
    if (error.message === "Forbidden") {
      return NextResponse.json(
        { success: false, error: "Admin access required", errorCode: "AUTH_ERROR" },
        { status: 403 }
      )
    }
    if (error.message === "Cannot create in demo mode" || error.message === "DEMO_MODE") {
      return NextResponse.json(
        { success: false, error: "Cannot create in demo mode", errorCode: "DEMO_MODE" },
        { status: 400 }
      )
    }
    if (error.message === "Firebase Admin not initialized" || error.message === "FIREBASE_ADMIN_NOT_READY") {
      return NextResponse.json(
        { success: false, error: "Firebase Admin not initialized", errorCode: "FIREBASE_ADMIN_NOT_READY" },
        { status: 500 }
      )
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.errors?.[0]?.message || "Validation error", errorCode: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    console.error("[API Admin Live Events] Error:", error)
    const errorMessage = (error?.message || "Internal server error").substring(0, 200)
    const traceId = Date.now().toString(36)
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        errorCode: "INTERNAL_ERROR",
        traceId,
        details: process.env.NODE_ENV === "development" ? { name: error?.name, message: error?.message } : undefined,
      },
      { status: 500 }
    )
  }
}

