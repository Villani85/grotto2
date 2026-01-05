import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { LiveEventsRepository } from "@/lib/repositories/live-events"
import { checkRateLimit } from "@/lib/validations"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { z } from "zod"

const createMessageSchema = z.object({
  text: z.string().min(1, "Message text is required").max(280, "Message cannot exceed 280 characters"),
})

// GET /api/live-events/[slug]/chat - Get chat messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "50")

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        messages: [],
      })
    }

    // Verify event exists and is published
    const event = await LiveEventsRepository.getBySlug(slug, true)
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin not initialized", errorCode: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const messagesSnapshot = await db
      .collection("live_events")
      .doc(event.id)
      .collection("chat")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get()

    const messages = messagesSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        authorId: data.authorId || "",
        authorName: data.authorName || "",
        authorAvatarUrl: data.authorAvatarUrl || null,
        text: data.text || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      }
    })

    // Reverse to show oldest first (for UI)
    messages.reverse()

    return NextResponse.json({
      success: true,
      messages,
    })
  } catch (error: any) {
    console.error("[API Live Events Chat] Error fetching messages:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}

// POST /api/live-events/[slug]/chat - Send chat message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { slug } = await params

    // Rate limiting
    if (!checkRateLimit(user.uid, 30, 60000)) {
      return NextResponse.json(
        { success: false, error: "Too many requests", errorCode: "RATE_LIMIT" },
        { status: 429 }
      )
    }

    let body: any
    try {
      body = await request.json()
    } catch (_parseError) {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body", errorCode: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }

    const validated = createMessageSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({
        success: true,
        message: {
          id: "demo-msg",
          authorId: user.uid,
          authorName: "Demo User",
          text: validated.text,
          createdAt: new Date().toISOString(),
        },
        demo: true,
      })
    }

    // Verify event exists, is published, and chat is enabled
    const event = await LiveEventsRepository.getBySlug(slug, true)
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found", errorCode: "NOT_FOUND" },
        { status: 404 }
      )
    }

    if (!event.chatEnabled) {
      return NextResponse.json(
        { success: false, error: "Chat is disabled for this event", errorCode: "CHAT_DISABLED" },
        { status: 403 }
      )
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json(
        { success: false, error: "Firebase Admin not initialized", errorCode: "INTERNAL_ERROR" },
        { status: 500 }
      )
    }

    const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get user info
    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.exists ? userDoc.data() : null
    const authorName = userData?.nickname || userData?.email?.split("@")[0] || "User"
    const authorAvatarUrl = userData?.avatarUrl || null

    // Create message
    const messageRef = await db
      .collection("live_events")
      .doc(event.id)
      .collection("chat")
      .add({
        authorId: user.uid,
        authorName,
        authorAvatarUrl,
        text: validated.text.trim(),
        createdAt: FieldValue.serverTimestamp(),
      })

    const messageDoc = await messageRef.get()
    const messageData = messageDoc.data()!

    return NextResponse.json(
      {
        success: true,
        message: {
          id: messageRef.id,
          authorId: messageData.authorId,
          authorName: messageData.authorName,
          authorAvatarUrl: messageData.authorAvatarUrl,
          text: messageData.text,
          createdAt: messageData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json(
        { success: false, error: "Authentication required", errorCode: "AUTH_ERROR" },
        { status: 401 }
      )
    }
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.errors[0].message, errorCode: "VALIDATION_ERROR" },
        { status: 400 }
      )
    }
    console.error("[API Live Events Chat] Error sending message:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error", errorCode: "INTERNAL_ERROR" },
      { status: 500 }
    )
  }
}


