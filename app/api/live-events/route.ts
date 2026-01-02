import { type NextRequest, NextResponse } from "next/server"
import { LiveEventsRepository } from "@/lib/repositories/live-events"
import { isDemoMode } from "@/lib/env"

// GET /api/live-events - List published events (public, for /area-riservata/live)
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const status = url.searchParams.get("status") // "upcoming" | "live" | "ended" | null (all)
    const limit = parseInt(url.searchParams.get("limit") || "100")

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        events: [],
      })
    }

    // Get all published events
    const allEvents = await LiveEventsRepository.listAdmin(limit)
    const publishedEvents = allEvents.filter((e) => e.published)

    // Filter by status if provided
    let filteredEvents = publishedEvents
    if (status) {
      const statusMap: Record<string, "draft" | "scheduled" | "live" | "ended"> = {
        upcoming: "scheduled",
        live: "live",
        ended: "ended",
      }
      const firestoreStatus = statusMap[status] || status
      filteredEvents = publishedEvents.filter((e) => e.status === firestoreStatus)
    }

    // Sort: live first, then scheduled (by date), then ended (by date desc)
    filteredEvents.sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1
      if (a.status !== "live" && b.status === "live") return 1
      if (a.status === "scheduled" && b.status === "scheduled") {
        const aDate = a.scheduledAt?.getTime() || 0
        const bDate = b.scheduledAt?.getTime() || 0
        return aDate - bDate // Ascending (earliest first)
      }
      if (a.status === "ended" && b.status === "ended") {
        const aDate = a.endedAt?.getTime() || a.startedAt?.getTime() || 0
        const bDate = b.endedAt?.getTime() || b.startedAt?.getTime() || 0
        return bDate - aDate // Descending (most recent first)
      }
      return 0
    })

    // Return only public-safe fields
    const publicEvents = filteredEvents.map((event) => ({
      id: event.id,
      title: event.title,
      slug: event.slug,
      description: event.description,
      status: event.status,
      scheduledAt: event.scheduledAt?.toISOString() || null,
      startedAt: event.startedAt?.toISOString() || null,
      endedAt: event.endedAt?.toISOString() || null,
      speaker: event.speaker,
      speakerTitle: event.speakerTitle,
      category: event.category,
      duration: event.duration,
      recordingId: event.recordingId,
      recordingUrl: event.recordingUrl,
      playbackUrl: event.playbackUrl,
      chatEnabled: event.chatEnabled,
    }))

    return NextResponse.json({
      success: true,
      events: publicEvents,
    })
  } catch (error: any) {
    console.error("[API Live Events] Error:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}


