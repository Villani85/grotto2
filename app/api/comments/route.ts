import { type NextRequest, NextResponse } from "next/server"
import { isDemoMode } from "@/lib/env"
import type { PostComment } from "@/lib/types"
import { mockPosts } from "@/lib/mock/data"

// Mock comments storage (in production, use Firestore)
const mockPostComments: PostComment[] = []

// POST /api/comments - Crea commento su post community
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { postId, content, userId, userNickname, userAvatar } = body

    if (!postId || !content || !userId || !userNickname) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: postId, content, userId, userNickname" },
        { status: 400 }
      )
    }

    // Verify post exists
    const post = mockPosts.find((p) => p.id === postId)
    if (!post) {
      return NextResponse.json({ success: false, error: "Post not found" }, { status: 404 })
    }

    // Check if user has active subscription (for subscribers_only posts)
    // In demo mode, allow all
    if (!isDemoMode) {
      // TODO: Check subscription status
    }

    const newComment: PostComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      postId,
      userId,
      userNickname,
      userAvatar,
      content: content.trim(),
      createdAt: new Date(),
    }

    mockPostComments.push(newComment)

    // Update post comments count (in production, use Firestore transaction)
    post.commentsCount += 1

    return NextResponse.json({ success: true, data: newComment }, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating comment:", error)
    return NextResponse.json({ success: false, error: "Failed to create comment" }, { status: 500 })
  }
}

// GET /api/comments?postId=xxx - Get comments for a post
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("postId")

    if (!postId) {
      return NextResponse.json({ success: false, error: "postId is required" }, { status: 400 })
    }

    const comments = mockPostComments.filter((c) => c.postId === postId).sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime()
    })

    return NextResponse.json({
      success: true,
      data: comments,
    })
  } catch (error) {
    console.error("[API] Error fetching comments:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch comments" }, { status: 500 })
  }
}





