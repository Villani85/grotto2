import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { applyEvent } from "@/lib/neurocredits"
import { getPeriodId } from "@/lib/neurocredits-rules"

// DELETE /api/posts/[postId]/comments/[commentId] - Elimina commento (autore o admin)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string; commentId: string }> }
) {
  try {
    const { postId, commentId } = await params
    const user = await requireAuth(request)

    if (isDemoMode) {
      return NextResponse.json({ success: true })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Check if user is admin
    const userDoc = await db.collection("users").doc(user.uid).get()
    const userData = userDoc.exists ? userDoc.data() : null
    const isAdmin = userData?.isAdmin === true

    // Save comment author ID before deletion (for NeuroCredits event)
    let commentAuthorId: string | null = null

    // Use transaction to delete comment and decrement counter
    await db.runTransaction(async (transaction) => {
      const postRef = db.collection("posts").doc(postId)
      const commentRef = db.collection("posts").doc(postId).collection("comments").doc(commentId)

      const postDoc = await transaction.get(postRef)
      if (!postDoc.exists) {
        throw new Error("Post not found")
      }

      const commentDoc = await transaction.get(commentRef)
      if (!commentDoc.exists) {
        throw new Error("Comment not found")
      }

      const commentData = commentDoc.data()
      commentAuthorId = commentData?.authorId || null

      // Only author or admin can delete
      if (commentAuthorId !== user.uid && !isAdmin) {
        throw new Error("Forbidden: Only comment author or admin can delete")
      }

      // Delete comment and decrement counter
      transaction.delete(commentRef)

      const postData = postDoc.data()
      const currentComments = postData?.commentsCount || 0
      transaction.update(postRef, {
        commentsCount: Math.max(0, currentComments - 1),
      })
    })

    console.log("[API Comments] ✅ Comment deleted:", { 
      commentId, 
      postId, 
      deletedBy: user.uid,
      isAdmin,
      commentAuthorId 
    })

    // Apply NeuroCredit event for comment deletion (subtract points from original author)
    // Only if deleted by author (not by admin)
    if (!isAdmin && commentAuthorId) {
      const periodId = getPeriodId()
      const eventResult = await applyEvent({
        type: "COMMENT_DELETED",
        targetUid: commentAuthorId,
        actorUid: user.uid,
        periodId,
        deltaNeuroCredits: -1,
        ref: {
          postId,
          commentId,
        },
      })

      console.log("[API Comments] 🎯 NeuroCredit event result (delete):", {
        applied: eventResult.applied,
        eventId: eventResult.eventId,
        neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
      })
    } else if (isAdmin) {
      console.log("[API Comments] ℹ️ Comment deleted by admin - NeuroCredits not adjusted")
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden: Only comment author or admin can delete") {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error.message === "Post not found" || error.message === "Comment not found") {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[API Comments] Error deleting comment:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

