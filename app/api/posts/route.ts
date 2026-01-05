import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { createPostSchema } from "@/lib/validations"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import { applyEvent, touchDailyActive } from "@/lib/neurocredits"
import { getPeriodId } from "@/lib/neurocredits-rules"

// GET /api/posts - Lista post con paginazione
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "20")
    const cursor = url.searchParams.get("cursor") || null

    if (isDemoMode) {
      return NextResponse.json({ posts: [], nextCursor: null })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    let query = db.collection("posts").orderBy("createdAt", "desc").limit(limit)

    if (cursor) {
      const cursorDoc = await db.collection("posts").doc(cursor).get()
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc)
      }
    }

    const snapshot = await query.get()
    const posts = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        authorId: data.authorId,
        authorName: data.authorName || "",
        authorAvatarUrl: data.authorAvatarUrl || null,
        text: data.text || "",
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date(data.createdAt).toISOString(),
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
      }
    })

    const nextCursor = snapshot.docs.length === limit ? snapshot.docs[snapshot.docs.length - 1].id : null

    return NextResponse.json({ posts, nextCursor })
  } catch (error: any) {
    console.error("[API Posts] Error fetching posts:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// POST /api/posts - Crea nuovo post
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await requireAuth(request)

    // Parse and validate body
    const body = await request.json()
    const validatedData = createPostSchema.parse(body)

    if (isDemoMode) {
      return NextResponse.json({
        id: `demo-post-${Date.now()}`,
        authorId: user.uid,
        authorName: "Demo User",
        authorAvatarUrl: null,
        text: validatedData.text,
        createdAt: new Date().toISOString(),
        likesCount: 0,
        commentsCount: 0,
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

    // Create post
    const postRef = await db.collection("posts").add({
      authorId: user.uid, // Always from token, never from body
      authorName,
      authorAvatarUrl,
      text: validatedData.text.trim(),
      createdAt: new Date(),
      likesCount: 0,
      commentsCount: 0,
    })

    const postDoc = await postRef.get()
    const postData = postDoc.data()
    const postId = postRef.id

    console.log("[API Posts] ✅ Post created:", { postId, authorId: user.uid })

    // Apply NeuroCredit event for post creation
    const periodId = getPeriodId()
    console.log("[API Posts] 🎯 Applying POST_CREATED event:", {
      postId,
      targetUid: user.uid,
      periodId,
      deltaNeuroCredits: 2,
    })

    const eventResult = await applyEvent({
      type: "POST_CREATED",
      targetUid: user.uid,
      actorUid: user.uid,
      periodId,
      deltaNeuroCredits: 2, // Will be 0 if cap reached
      ref: {
        postId,
      },
    })

    console.log("[API Posts] 🎯 NeuroCredit event result:", {
      applied: eventResult.applied,
      eventId: eventResult.eventId,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })

    // Fetch updated user stats to log
    if (eventResult.applied) {
      const updatedUserDoc = await db.collection("users").doc(user.uid).get()
      const updatedUserData = updatedUserDoc.data()
      console.log("[API Posts] 📊 Updated NeuroCredits:", {
        total: updatedUserDoc.exists ? updatedUserData?.neuroCredits_total || 0 : 0,
        monthCurrent: updatedUserDoc.exists ? updatedUserData?.neuroCredits_monthly?.[periodId] || 0 : 0,
      })
    }

    // Touch daily active (idempotent)
    void touchDailyActive(user.uid).catch((error) => {
      console.error("[API Posts] Error touching daily active:", error)
    })

    return NextResponse.json({
      id: postRef.id,
      authorId: postData?.authorId,
      authorName: postData?.authorName,
      authorAvatarUrl: postData?.authorAvatarUrl,
      text: postData?.text,
      createdAt: postData?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      likesCount: postData?.likesCount || 0,
      commentsCount: postData?.commentsCount || 0,
    }, { status: 201 })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error("[API Posts] Error creating post:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

