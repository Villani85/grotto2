import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import type { Lesson } from "@/lib/types-academy"

export const LessonsRepository = {
  async getByModuleId(courseId: string, moduleId: string): Promise<Lesson[]> {
    if (isDemoMode) {
      return []
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const snapshot = await db
      .collection("courses")
      .doc(courseId)
      .collection("modules")
      .doc(moduleId)
      .collection("lessons")
      .orderBy("order", "asc")
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      courseId,
      moduleId,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Lesson[]
  },

  async getAllByCourseId(courseId: string): Promise<Lesson[]> {
    if (isDemoMode) {
      return []
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get all modules first
    const modulesSnapshot = await db.collection("courses").doc(courseId).collection("modules").get()

    const allLessons: Lesson[] = []

    for (const moduleDoc of modulesSnapshot.docs) {
      const lessonsSnapshot = await db
        .collection("courses")
        .doc(courseId)
        .collection("modules")
        .doc(moduleDoc.id)
        .collection("lessons")
        .orderBy("order", "asc")
        .get()

      allLessons.push(
        ...lessonsSnapshot.docs.map((doc) => ({
          id: doc.id,
          courseId,
          moduleId: moduleDoc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Lesson[]
      )
    }

    return allLessons
  },

  async create(
    courseId: string,
    moduleId: string,
    data: Omit<Lesson, "id" | "courseId" | "moduleId" | "createdAt" | "updatedAt">
  ): Promise<string> {
    if (isDemoMode) {
      return "demo-lesson-id"
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const now = new Date()
    const docRef = await db
      .collection("courses")
      .doc(courseId)
      .collection("modules")
      .doc(moduleId)
      .collection("lessons")
      .add({
        ...data,
        createdAt: now,
        updatedAt: now,
      })

    return docRef.id
  },

  async update(
    courseId: string,
    moduleId: string,
    lessonId: string,
    data: Partial<Lesson>
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

    await db
      .collection("courses")
      .doc(courseId)
      .collection("modules")
      .doc(moduleId)
      .collection("lessons")
      .doc(lessonId)
      .update({
        ...data,
        updatedAt: new Date(),
      })
  },

  async delete(courseId: string, moduleId: string, lessonId: string): Promise<void> {
    if (isDemoMode) {
      return
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    await db
      .collection("courses")
      .doc(courseId)
      .collection("modules")
      .doc(moduleId)
      .collection("lessons")
      .doc(lessonId)
      .delete()
  },
}




