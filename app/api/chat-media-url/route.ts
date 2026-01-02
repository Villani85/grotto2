import { type NextRequest, NextResponse } from "next/server"
import { isDemoMode } from "@/lib/env"
import { MessagesRepository } from "@/lib/repositories/messages"

// POST /api/chat-media-url - Genera signed URL per media chat (con verifica participants)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationId, mediaPath, userId } = body

    if (!conversationId || !mediaPath || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: conversationId, mediaPath, userId" },
        { status: 400 }
      )
    }

    // Verify user is participant in conversation
    const conversation = await MessagesRepository.getConversationById(conversationId)
    if (!conversation) {
      return NextResponse.json({ success: false, error: "Conversation not found" }, { status: 404 })
    }

    if (!conversation.participantIds.includes(userId)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 })
    }

    // In demo mode, return mock URL
    // In production, generate signed URL from Firebase Storage
    const signedUrl = isDemoMode
      ? `/placeholder.jpg`
      : `https://storage.googleapis.com/your-bucket/chat-media/${conversationId}/${mediaPath}?expires=${Date.now() + 3600000}`

    return NextResponse.json({
      success: true,
      data: {
        url: signedUrl,
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      },
    })
  } catch (error) {
    console.error("[API] Error generating chat media URL:", error)
    return NextResponse.json({ success: false, error: "Failed to generate URL" }, { status: 500 })
  }
}





