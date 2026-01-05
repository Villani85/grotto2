import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"
import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

export async function POST(request: NextRequest) {
  try {
    const _admin = await requireAdmin(request)

    if (isDemoMode) {
      return NextResponse.json({ success: true, created: false, message: "Demo mode" })
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Check if any active categories exist (try without orderBy to avoid index requirement)
    const existingSnapshot = await db
      .collection("categories")
      .where("isActive", "==", true)
      .limit(1)
      .get()

    if (!existingSnapshot.empty) {
      return NextResponse.json({
        success: true,
        created: false,
        message: "Categories already exist",
        count: existingSnapshot.size
      })
    }

    // Create 3 default categories
    const defaultCategories = [
      { id: "generale", name: "Generale", order: 1 },
      { id: "neuroscienze", name: "Neuroscienze", order: 2 },
      { id: "mindset", name: "Mindset", order: 3 },
    ]

    const batch = db.batch()
    const createdIds: string[] = []

    for (const cat of defaultCategories) {
      const categoryRef = db.collection("categories").doc(cat.id)
      batch.set(categoryRef, {
        name: cat.name,
        order: cat.order,
        isActive: true,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
      createdIds.push(cat.id)
    }

    await batch.commit()

    return NextResponse.json({
      success: true,
      created: true,
      ids: createdIds,
      count: createdIds.length,
      message: `Created ${createdIds.length} default categories`
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin Categories Seed] Error:", error)
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    )
  }
}
