import { type NextRequest, NextResponse } from "next/server"
import { PostsRepository } from "@/lib/repositories/posts"
import { AdminSettingsRepository } from "@/lib/repositories/admin-settings"
import { isDemoMode } from "@/lib/env"

// GET /api/community/posts - Lista post community con enforcement di communityVisibility
export async function GET(_request: NextRequest) {
  try {
    // Get admin settings to check community visibility
    const settings = await AdminSettingsRepository.get()

    // In demo mode, we allow access
    // In production, check authentication and subscription status
    if (!isDemoMode) {
      // TODO: Check user authentication and subscription if communityVisibility === 'subscribers_only'
    }

    const posts = await PostsRepository.getAll()

    return NextResponse.json({
      success: true,
      data: posts,
      settings: {
        communityVisibility: settings.communityVisibility,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching community posts:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch posts" }, { status: 500 })
  }
}

// POST /api/community/posts - Crea nuovo post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, imageUrl, userId, userNickname, userAvatar } = body

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 })
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: "Content is required" }, { status: 400 })
    }

    if (!userId || !userNickname) {
      return NextResponse.json({ success: false, error: "User information is required" }, { status: 400 })
    }

    // Get admin settings
    const settings = await AdminSettingsRepository.get()

    // Check access based on communityVisibility
    if (settings.communityVisibility === "subscribers_only") {
      // In demo mode, allow
      // In production: check if user has active subscription
      if (!isDemoMode) {
        // TODO: Verify user has active subscription
      }
    }

    const post = await PostsRepository.create({
      userId,
      userNickname,
      userAvatar,
      title: title.trim(),
      content: content.trim(),
      imageUrl,
    })

    return NextResponse.json({ success: true, data: post }, { status: 201 })
  } catch (error) {
    console.error("[API] Error creating post:", error)
    return NextResponse.json({ success: false, error: "Failed to create post" }, { status: 500 })
  }
}

// DELETE /api/community/posts - Delete post (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get("id")

    if (!postId) {
      return NextResponse.json({ success: false, error: "Post ID is required" }, { status: 400 })
    }

    // TODO: Verify user is admin
    // In demo mode, allow
    if (!isDemoMode) {
      // TODO: Check admin role
    }

    const deleted = await PostsRepository.delete(postId)

    if (deleted) {
      return NextResponse.json({ success: true, message: "Post deleted" })
    } else {
      return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 })
    }
  } catch (error) {
    console.error("[API] Error deleting post:", error)
    return NextResponse.json({ success: false, error: "Failed to delete post" }, { status: 500 })
  }
}

