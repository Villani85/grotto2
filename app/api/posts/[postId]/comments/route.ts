import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createCommentSchema } from "@/lib/validations"
import { checkRateLimit } from "@/lib/validations"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { applyEvent, touchDailyActive } from "@/lib/neurocredits"
import { getPeriodId } from "@/lib/neurocredits-rules"

// GET /api/posts/[postId]/comments - Lista commenti
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "50")

    if (isDemoMode) {
      return NextResponse.json({ comments: [] })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Verify post exists
    const postDoc = await db.collection("posts").doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const commentsSnapshot = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .orderBy("createdAt", "asc")
      .limit(limit)
      .get()

    const comments = commentsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        authorId: data.authorId,
        authorName: data.authorName || "",
        authorAvatarUrl: data.authorAvatarUrl || null,
        text: data.text || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date(data.createdAt).toISOString(),
      }
    })

    return NextResponse.json({ comments })
  } catch (error: any) {
    console.error("[API Comments] Error fetching comments:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// POST /api/posts/[postId]/comments - Aggiungi commento
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const user = await requireAuth(request)

    // Rate limiting
    if (!checkRateLimit(user.uid, 30, 60000)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    // Parse and validate body
    const body = await request.json()
    const validatedData = createCommentSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({
        id: `demo-comment-${Date.now()}`,
        authorId: user.uid,
        authorName: "Demo User",
        authorAvatarUrl: null,
        text: validatedData.text,
        createdAt: new Date().toISOString(),
      }, { status: 201 })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get user info from Firestore
    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.exists ? userDoc.data() : null

    const authorName = userData?.nickname || userData?.email?.split("@")[0] || "User"
    const authorAvatarUrl = userData?.avatarUrl || null

    // Use transaction to create comment and increment counter
    let commentId: string
    await db.runTransaction(async (transaction) => {
      const postRef = db.collection("posts").doc(postId)
      const postDoc = await transaction.get(postRef)

      if (!postDoc.exists) {
        throw new Error("Post not found")
      }

      // Create comment
      const commentRef = db.collection("posts").doc(postId).collection("comments").doc()
      commentId = commentRef.id

      transaction.set(commentRef, {
        authorId: user.uid, // Always from token, never from body
        authorName,
        authorAvatarUrl,
        text: validatedData.text.trim(),
        createdAt: new Date(),
      })

      // Increment comments count
      const postData = postDoc.data()
      const currentComments = postData?.commentsCount || 0
      transaction.update(postRef, {
        commentsCount: currentComments + 1,
      })
    })

    // Fetch the created comment
    const commentDoc = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId!)
      .get()

    const commentData = commentDoc.data()

    console.log("[API Comments] ✅ Comment created:", { commentId, postId, authorId: user.uid })

    // Apply NeuroCredit event for comment creation
    const periodId = getPeriodId()
    const eventResult = await applyEvent({
      type: "COMMENT_CREATED",
      targetUid: user.uid,
      actorUid: user.uid,
      periodId,
      deltaNeuroCredits: 1, // Will be 0 if cap reached
      ref: {
        postId,
        commentId: commentId!,
      },
    })

    console.log("[API Comments] 🎯 NeuroCredit event result:", {
      applied: eventResult.applied,
      eventId: eventResult.eventId,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })

    // Touch daily active (idempotent)
    void touchDailyActive(user.uid).catch((error) => {
      console.error("[API Comments] Error touching daily active:", error)
    })

    return NextResponse.json({
      id: commentDoc.id,
      authorId: commentData?.authorId,
      authorName: commentData?.authorName,
      authorAvatarUrl: commentData?.authorAvatarUrl,
      text: commentData?.text,
      createdAt: commentData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    if (error.message === "Post not found") {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[API Comments] Error creating comment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

