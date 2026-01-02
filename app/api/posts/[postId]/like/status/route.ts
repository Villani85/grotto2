import { type NextRequest, NextResponse } from "next/server"
import { verifyIdToken } from "@/lib/auth-server"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

// GET /api/posts/[postId]/like/status - Verifica se l'utente ha messo like
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params
    const user = await verifyIdToken(request)

    if (!user) {
      return NextResponse.json({ liked: false })
    }

    if (isDemoMode) {
      return NextResponse.json({ liked: false })
    }

    const app = await getAdminApp()
    if (!app) {
      return NextResponse.json({ liked: false })
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const likeDoc = await db
      .collection("posts")
      .doc(postId)
      .collection("likes")
      .doc(user.uid)
      .get()

    return NextResponse.json({ liked: likeDoc.exists })
  } catch (error: any) {
    console.error("[API Posts Like Status] Error:", error)
    return NextResponse.json({ liked: false })
  }
}




