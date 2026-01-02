import { type NextRequest, NextResponse } from "next/server"
import { LiveEventsRepository } from "@/lib/repositories/live-events"
import { isDemoMode } from "@/lib/env"

// GET /api/live-events/[slug] - Get event by slug (public, only if published)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (isDemoMode) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    const event = await LiveEventsRepository.getBySlug(slug, true) // publishedOnly = true

    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    // Return only public-safe fields
    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        slug: event.slug,
        description: event.description,
        status: event.status,
        playbackUrl: event.playbackUrl,
        chatEnabled: event.chatEnabled,
        scheduledAt: event.scheduledAt?.toISOString() || null,
        startedAt: event.startedAt?.toISOString() || null,
        endedAt: event.endedAt?.toISOString() || null,
        recordingUrl: event.recordingUrl ?? null,
        recordingId: event.recordingId ?? null,
      },
    })
  } catch (error: any) {
    console.error("[API Live Events Slug] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}


