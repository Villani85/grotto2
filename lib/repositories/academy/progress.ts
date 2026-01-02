import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import type { CourseProgress, LessonProgress } from "@/lib/types-academy"

export const ProgressRepository = {
  async getCourseProgress(uid: string, courseId: string): Promise<CourseProgress | null> {
    if (isDemoMode) {
      return null
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const doc = await db.collection("users").doc(uid).collection("courseProgress").doc(courseId).get()

    if (!doc.exists) return null

    return {
      courseId,
      ...doc.data(),
      startedAt: doc.data()?.startedAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
    } as CourseProgress
  },

  async updateCourseProgress(uid: string, courseId: string, data: Partial<CourseProgress>): Promise<void> {
    if (isDemoMode) {
      return
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const now = new Date()
    const existing = await db.collection("users").doc(uid).collection("courseProgress").doc(courseId).get()

    if (existing.exists) {
      await db.collection("users").doc(uid).collection("courseProgress").doc(courseId).update({
        ...data,
        updatedAt: now,
      })
    } else {
      await db.collection("users").doc(uid).collection("courseProgress").doc(courseId).set({
        courseId,
        startedAt: now,
        completedLessonsCount: 0,
        ...data,
        updatedAt: now,
      })
    }
  },

  async getLessonProgress(uid: string, courseId: string, lessonId: string): Promise<LessonProgress | null> {
    if (isDemoMode) {
      return null
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const doc = await db
      .collection("users")
      .doc(uid)
      .collection("lessonProgress")
      .doc(`${courseId}_${lessonId}`)
      .get()

    if (!doc.exists) return null

    return {
      courseId,
      lessonId,
      ...doc.data(),
      completedAt: doc.data()?.completedAt?.toDate() || undefined,
      lastViewedAt: doc.data()?.lastViewedAt?.toDate() || undefined,
    } as LessonProgress
  },

  async updateLessonProgress(
    uid: string,
    courseId: string,
    lessonId: string,
    data: Partial<LessonProgress>
  ): Promise<void> {
    if (isDemoMode) {
      return
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const now = new Date()
    const docId = `${courseId}_${lessonId}`

    const existing = await db.collection("users").doc(uid).collection("lessonProgress").doc(docId).get()

    if (existing.exists) {
      await db.collection("users").doc(uid).collection("lessonProgress").doc(docId).update({
        ...data,
        lastViewedAt: now,
      })
    } else {
      await db.collection("users").doc(uid).collection("lessonProgress").doc(docId).set({
        courseId,
        lessonId,
        completed: false,
        ...data,
        lastViewedAt: now,
      })
    }
  },
}




