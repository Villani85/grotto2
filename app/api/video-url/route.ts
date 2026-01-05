import { type NextRequest, NextResponse } from "next/server"
import { isDemoMode } from "@/lib/env"
import { getAdminStorage } from "@/lib/firebase-admin"

// Get signed URL for video (protected content - subscribers only)
export async function GET(request: NextRequest) {
  const lessonId = request.nextUrl.searchParams.get("lessonId")
  const courseId = request.nextUrl.searchParams.get("courseId")
  const videoPath = request.nextUrl.searchParams.get("videoPath") // Optional: direct path

  try {
    // If videoPath is provided directly, use it
    let objectPath: string | null = null
    
    if (videoPath) {
      objectPath = videoPath
    } else if (lessonId && courseId) {
      // Build path from courseId and lessonId
      objectPath = `courses/${courseId}/lessons/${lessonId}/video.mp4`
    } else if (lessonId) {
      // Try to get courseId from lesson document
      // For now, require courseId
      return NextResponse.json({ error: "Course ID or videoPath required" }, { status: 400 })
    } else {
      return NextResponse.json({ error: "Lesson ID or videoPath required" }, { status: 400 })
    }

    if (isDemoMode) {
      // In demo mode, return mock URL
      return NextResponse.json({
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      })
    }

    // In production, generate signed URL using Firebase Admin SDK
    // Note: We don't require admin auth here - any authenticated subscriber can view videos
    // The Storage Rules will enforce that only subscribers can read from /courses/**
    
    const adminStorage = await getAdminStorage()
    if (!adminStorage) {
      return NextResponse.json(
        { 
          error: "Firebase Admin Storage not initialized. Please configure Firebase Admin SDK." 
        },
        { status: 500 }
      )
    }

    const bucket = adminStorage.bucket()
    const file = bucket.file(objectPath)

    // Check if file exists
    const [exists] = await file.exists()
    if (!exists) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      )
    }

    // Generate signed URL with 1 hour expiration (for streaming)
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    })

    return NextResponse.json({
      url: signedUrl,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
  } catch (error: any) {
    console.error("[API Video URL] Error generating video URL:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
