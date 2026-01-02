import { type NextRequest, NextResponse } from "next/server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

// GET /api/posts/[postId] - Dettaglio singolo post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params

    if (isDemoMode) {
      return NextResponse.json(null, { status: 404 })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const postDoc = await db.collection("posts").doc(postId).get()

    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const data = postDoc.data()

    return NextResponse.json({
      id: postDoc.id,
      authorId: data?.authorId,
      authorName: data?.authorName || "",
      authorAvatarUrl: data?.authorAvatarUrl || null,
      text: data?.text || "",
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date(data?.createdAt).toISOString(),
      likesCount: data?.likesCount || 0,
      commentsCount: data?.commentsCount || 0,
    })
  } catch (error: any) {
    console.error("[API Posts] Error fetching post:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




