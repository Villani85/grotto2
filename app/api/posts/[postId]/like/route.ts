import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { checkRateLimit } from "@/lib/validations"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { applyEvent } from "@/lib/neurocredits"
import { touchDailyActive } from "@/lib/neurocredits"

// POST /api/posts/[postId]/like - Aggiungi like
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

    if (isDemoMode) {
      return NextResponse.json({ success: true, liked: true })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get post data first to check author
    const postDoc = await db.collection("posts").doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const postData = postDoc.data()
    const authorId = postData?.authorId

    // Block self-like
    if (authorId === user.uid) {
      return NextResponse.json({ error: "Cannot like your own post" }, { status: 400 })
    }

    // Use transaction for consistency
    await db.runTransaction(async (transaction) => {
      const postRef = db.collection("posts").doc(postId)
      const likeRef = db.collection("posts").doc(postId).collection("likes").doc(user.uid)

      // Check if like already exists
      const likeDoc = await transaction.get(likeRef)
      if (likeDoc.exists) {
        // Like already exists - idempotent: do nothing
        return
      }

      // Create like and increment counter
      transaction.set(likeRef, {
        createdAt: new Date(),
      })

      const currentLikes = postData?.likesCount || 0
      transaction.update(postRef, {
        likesCount: currentLikes + 1,
      })
    })

    // Apply NeuroCredit event for like received (targetUid = post author)
    console.log("[API Posts Like] 🎯 Applying LIKE_RECEIVED event:", {
      postId,
      targetUid: authorId!,
      actorUid: user.uid,
      deltaNeuroCredits: 1,
    })

    const eventResult = await applyEvent({
      type: "LIKE_RECEIVED",
      targetUid: authorId!,
      actorUid: user.uid,
      deltaNeuroCredits: 1,
      ref: {
        postId,
      },
    })

    console.log("[API Posts Like] 🎯 NeuroCredit event result:", {
      applied: eventResult.applied,
      eventId: eventResult.eventId,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })

    // Touch daily active for actor
    void touchDailyActive(user.uid).catch((error) => {
      console.error("[API Posts Like] Error touching daily active:", error)
    })

    return NextResponse.json({ success: true, liked: true })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Cannot like your own post") {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error.message === "Post not found") {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[API Posts Like] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/posts/[postId]/like - Rimuovi like
export async function DELETE(
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

    if (isDemoMode) {
      return NextResponse.json({ success: true, liked: false })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get post data first to get author
    const postDoc = await db.collection("posts").doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const postData = postDoc.data()
    const authorId = postData?.authorId

    // Use transaction for consistency
    await db.runTransaction(async (transaction) => {
      const postRef = db.collection("posts").doc(postId)
      const likeRef = db.collection("posts").doc(postId).collection("likes").doc(user.uid)

      const likeDoc = await transaction.get(likeRef)
      if (!likeDoc.exists) {
        // Like doesn't exist - idempotent: do nothing
        return
      }

      // Delete like and decrement counter
      transaction.delete(likeRef)

      const currentLikes = postData?.likesCount || 0
      transaction.update(postRef, {
        likesCount: Math.max(0, currentLikes - 1),
      })
    })

    // Apply NeuroCredit event for unlike received (targetUid = post author)
    console.log("[API Posts Unlike] 🎯 Applying UNLIKE_RECEIVED event:", {
      postId,
      targetUid: authorId!,
      actorUid: user.uid,
      deltaNeuroCredits: -1,
    })

    const eventResult = await applyEvent({
      type: "UNLIKE_RECEIVED",
      targetUid: authorId!,
      actorUid: user.uid,
      deltaNeuroCredits: -1,
      ref: {
        postId,
      },
    })

    console.log("[API Posts Unlike] 🎯 NeuroCredit event result:", {
      applied: eventResult.applied,
      eventId: eventResult.eventId,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })

    // Touch daily active for actor
    void touchDailyActive(user.uid).catch((error) => {
      console.error("[API Posts Unlike] Error touching daily active:", error)
    })

    return NextResponse.json({ success: true, liked: false })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Post not found") {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error("[API Posts Unlike] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

