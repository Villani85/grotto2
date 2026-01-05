import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth-server"
import { ProgressRepository } from "@/lib/repositories/academy/progress"
import { applyEvent, touchDailyActive } from "@/lib/neurocredits"
import { getPeriodId } from "@/lib/neurocredits-rules"

// POST /api/progress/courses/[courseId]/lessons/[lessonId]/complete - Completa lezione
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  try {
    const user = await requireAuth(request)
    const { courseId, lessonId } = await params

    // Check if already completed (idempotent)
    const existing = await ProgressRepository.getLessonProgress(user.uid, courseId, lessonId)

    if (existing?.completed) {
      return NextResponse.json({ message: "Already completed", completed: true })
    }

    // Mark as completed
    await ProgressRepository.updateLessonProgress(user.uid, courseId, lessonId, {
      completed: true,
      completedAt: new Date(),
    })

    // Update course progress
    const courseProgress = await ProgressRepository.getCourseProgress(user.uid, courseId)
    const newCount = (courseProgress?.completedLessonsCount || 0) + 1
    await ProgressRepository.updateCourseProgress(user.uid, courseId, {
      completedLessonsCount: newCount,
    })

    // Apply NeuroCredit event (idempotent)
    const periodId = getPeriodId()
    const eventResult = await applyEvent({
      type: "VIDEO_COMPLETED",
      targetUid: user.uid,
      actorUid: user.uid,
      periodId,
      deltaNeuroCredits: 1, // Will be 0 if cap reached
      deltaVideosCompleted: 1,
      ref: {
        videoId: `${courseId}:${lessonId}`,
      },
    })

    // Touch daily active
    void touchDailyActive(user.uid).catch((error) => {
      console.error("[API Lesson Complete] Error touching daily active:", error)
    })

    return NextResponse.json({
      completed: true,
      neuroCreditsAwarded: eventResult.neuroCreditsAwarded,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    console.error("[API Lesson Complete] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




