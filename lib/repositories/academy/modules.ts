import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"
import type { Module } from "@/lib/types-academy"

export const ModulesRepository = {
  async getByCourseId(courseId: string): Promise<Module[]> {
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
      .orderBy("order", "asc")
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      courseId,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date(),
    })) as Module[]
  },

  async create(courseId: string, data: Omit<Module, "id" | "courseId" | "createdAt" | "updatedAt">): Promise<string> {
    if (isDemoMode) {
      return "demo-module-id"
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const now = new Date()
    const docRef = await db.collection("courses").doc(courseId).collection("modules").add({
      ...data,
      createdAt: now,
      updatedAt: now,
    })

    return docRef.id
  },

  async update(courseId: string, moduleId: string, data: Partial<Module>): Promise<void> {
    if (isDemoMode) {
      return
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    await db.collection("courses").doc(courseId).collection("modules").doc(moduleId).update({
      ...data,
      updatedAt: new Date(),
    })
  },

  async delete(courseId: string, moduleId: string): Promise<void> {
    if (isDemoMode) {
      return
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    await db.collection("courses").doc(courseId).collection("modules").doc(moduleId).delete()
  },
}




