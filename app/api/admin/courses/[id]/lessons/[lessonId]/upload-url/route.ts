import { type NextRequest, NextResponse } from "next/server"
import { isDemoMode } from "@/lib/env"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminStorage } from "@/lib/firebase-admin"

// POST /api/admin/courses/[id]/lessons/[lessonId]/upload-url
// Genera signed URL per upload video lezione (admin only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lessonId: string }> }
) {
  const { id: courseId, lessonId } = await params

  try {
    // Autenticazione e autorizzazione admin
    const user = await requireAdmin(request)

    const body = await request.json()
    const { contentType = "video/mp4" } = body

    // Costruisci objectPath in Storage
    const objectPath = `courses/${courseId}/lessons/${lessonId}/video.mp4`

    if (isDemoMode) {
      // In demo mode, return mock URL
      return NextResponse.json({
        success: true,
        uploadUrl: `https://storage.googleapis.com/mock-bucket/${objectPath}?mock=true`,
        objectPath,
        filePath: objectPath, // Per compatibilità con client esistente
        contentType,
        method: "PUT",
      })
    }

    // In produzione, genera signed URL usando Firebase Admin SDK
    const adminStorage = await getAdminStorage()
    if (!adminStorage) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Firebase Admin Storage not initialized. Please configure Firebase Admin SDK." 
        },
        { status: 500 }
      )
    }

    const bucket = adminStorage.bucket()
    const file = bucket.file(objectPath)

    // Genera signed URL con scadenza di 10 minuti (600 secondi)
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 10 * 60 * 1000, // 10 minuti
      contentType,
    })

    return NextResponse.json({
      success: true,
      uploadUrl,
      objectPath,
      filePath: objectPath, // Per compatibilità con client esistente
      contentType,
      method: "PUT",
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Upload URL] Error generating upload URL:", error)
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}




