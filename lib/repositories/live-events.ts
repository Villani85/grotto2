import { getAdminApp } from "@/lib/firebase-admin"
import { isDemoMode } from "@/lib/env"

export interface LiveEvent {
  id: string
  title: string
  slug: string
  description?: string
  scheduledAt?: Date | null
  startedAt?: Date | null
  endedAt?: Date | null
  status: "draft" | "scheduled" | "live" | "ended"
  published: boolean
  active: boolean
  playbackUrl: string
  chatEnabled: boolean
  speaker?: string
  speakerTitle?: string
  category?: string
  duration?: number // in minutes
  recordingId?: string // ID of ivs_recordings document
  recordingUrl?: string // Direct URL to replay (HLS or CloudFront)
  createdBy: string
  createdAt: Date
  updatedAt: Date
}

export interface LiveEventCreateInput {
  title: string
  slug?: string
  description?: string
  scheduledAt?: Date | string | null
  playbackUrl?: string
  chatEnabled?: boolean
  speaker?: string
  speakerTitle?: string
  category?: string
  duration?: number
  createdBy: string
}

export interface LiveEventUpdateInput {
  title?: string
  slug?: string
  description?: string
  scheduledAt?: Date | string | null
  status?: "draft" | "scheduled" | "live" | "ended"
  published?: boolean
  active?: boolean
  playbackUrl?: string
  chatEnabled?: boolean
  speaker?: string
  speakerTitle?: string
  category?: string
  duration?: number
  recordingId?: string
  recordingUrl?: string
}

// Simple slugify function
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
}

export class LiveEventsRepository {
  static async listAdmin(limit = 100): Promise<LiveEvent[]> {
    if (isDemoMode) {
      return []
    }

    try {
      const app = await getAdminApp()
      if (!app) {
        console.warn("[LiveEventsRepository] Firebase Admin not initialized")
        return []
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)

      const snapshot = await db
        .collection("live_events")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      return snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "",
          slug: data.slug || "",
          description: data.description || undefined,
          scheduledAt: data.scheduledAt?.toDate?.() || null,
          startedAt: data.startedAt?.toDate?.() || null,
          endedAt: data.endedAt?.toDate?.() || null,
          status: data.status || "draft",
          published: data.published === true,
          active: data.active === true,
          playbackUrl: data.playbackUrl || "",
          chatEnabled: data.chatEnabled !== false,
          createdBy: data.createdBy || "",
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        }
      })
    } catch (error) {
      console.error("[LiveEventsRepository] Error listing events:", error)
      return []
    }
  }

  static async getById(id: string): Promise<LiveEvent | null> {
    if (isDemoMode) {
      return null
    }

    try {
      const app = await getAdminApp()
      if (!app) {
        return null
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)

      const doc = await db.collection("live_events").doc(id).get()

      if (!doc.exists) {
        return null
      }

      const data = doc.data()!
      return {
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || undefined,
        scheduledAt: data.scheduledAt?.toDate?.() || null,
        startedAt: data.startedAt?.toDate?.() || null,
        endedAt: data.endedAt?.toDate?.() || null,
        status: data.status || "draft",
        published: data.published === true,
        active: data.active === true,
        playbackUrl: data.playbackUrl || "",
        chatEnabled: data.chatEnabled !== false,
        createdBy: data.createdBy || "",
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      }
    } catch (error) {
      console.error("[LiveEventsRepository] Error getting event:", error)
      return null
    }
  }

  static async getBySlug(slug: string, publishedOnly = false): Promise<LiveEvent | null> {
    if (isDemoMode) {
      return null
    }

    try {
      const app = await getAdminApp()
      if (!app) {
        return null
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)

      let query: any = db.collection("live_events").where("slug", "==", slug)

      if (publishedOnly) {
        query = query.where("published", "==", true)
      }

      const snapshot = await query.limit(1).get()

      if (snapshot.empty) {
        return null
      }

      const doc = snapshot.docs[0]
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || undefined,
        scheduledAt: data.scheduledAt?.toDate?.() || null,
        startedAt: data.startedAt?.toDate?.() || null,
        endedAt: data.endedAt?.toDate?.() || null,
        status: data.status || "draft",
        published: data.published === true,
        active: data.active === true,
        playbackUrl: data.playbackUrl || "",
        chatEnabled: data.chatEnabled !== false,
        recordingId: data.recordingId || undefined,
        recordingUrl: data.recordingUrl || undefined,
        createdBy: data.createdBy || "",
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      }
    } catch (error) {
      console.error("[LiveEventsRepository] Error getting event by slug:", error)
      return null
    }
  }

  static async getActivePublished(): Promise<LiveEvent | null> {
    if (isDemoMode) {
      return null
    }

    try {
      const app = await getAdminApp()
      if (!app) {
        return null
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)

      const snapshot = await db
        .collection("live_events")
        .where("active", "==", true)
        .where("published", "==", true)
        .limit(1)
        .get()

      if (snapshot.empty) {
        return null
      }

      const doc = snapshot.docs[0]
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title || "",
        slug: data.slug || "",
        description: data.description || undefined,
        scheduledAt: data.scheduledAt?.toDate?.() || null,
        startedAt: data.startedAt?.toDate?.() || null,
        endedAt: data.endedAt?.toDate?.() || null,
        status: data.status || "draft",
        published: data.published === true,
        active: data.active === true,
        playbackUrl: data.playbackUrl || "",
        chatEnabled: data.chatEnabled !== false,
        recordingId: data.recordingId || undefined,
        recordingUrl: data.recordingUrl || undefined,
        createdBy: data.createdBy || "",
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
      }
    } catch (error) {
      console.error("[LiveEventsRepository] Error getting active event:", error)
      return null
    }
  }

  static async create(data: LiveEventCreateInput): Promise<LiveEvent> {
    if (isDemoMode) {
      throw new Error("DEMO_MODE")
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("FIREBASE_ADMIN_NOT_READY")
    }

    const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const slug = data.slug || slugify(data.title)
    const defaultPlaybackUrl = process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL || ""

    // Always use env playbackUrl if available, otherwise use provided one
    const finalPlaybackUrl = defaultPlaybackUrl || data.playbackUrl || ""

    const eventData: any = {
      title: data.title,
      slug,
      description: data.description || null,
      scheduledAt: data.scheduledAt
        ? typeof data.scheduledAt === "string"
          ? new Date(data.scheduledAt)
          : data.scheduledAt
        : null,
      status: "draft",
      published: false,
      active: false,
      playbackUrl: finalPlaybackUrl,
      chatEnabled: data.chatEnabled !== false,
      speaker: data.speaker || null,
      speakerTitle: data.speakerTitle || null,
      category: data.category || null,
      duration: data.duration || null,
      createdBy: data.createdBy,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection("live_events").add(eventData)
    const doc = await docRef.get()

    const docData = doc.data()!
    return {
      id: doc.id,
      title: docData.title || "",
      slug: docData.slug || "",
          description: docData.description || undefined,
          scheduledAt: docData.scheduledAt?.toDate?.() || null,
          startedAt: docData.startedAt?.toDate?.() || null,
          endedAt: docData.endedAt?.toDate?.() || null,
          status: docData.status || "draft",
          published: docData.published === true,
          active: docData.active === true,
          playbackUrl: docData.playbackUrl || "",
          chatEnabled: docData.chatEnabled !== false,
          speaker: docData.speaker || undefined,
          speakerTitle: docData.speakerTitle || undefined,
          category: docData.category || undefined,
          duration: docData.duration || undefined,
          recordingId: docData.recordingId || undefined,
          recordingUrl: docData.recordingUrl || undefined,
          createdBy: docData.createdBy || "",
          createdAt: docData.createdAt?.toDate?.() || new Date(),
          updatedAt: docData.updatedAt?.toDate?.() || new Date(),
    }
  }

  static async update(id: string, data: LiveEventUpdateInput): Promise<LiveEvent | null> {
    if (isDemoMode) {
      throw new Error("Cannot update in demo mode")
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (data.title !== undefined) updateData.title = data.title
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.description !== undefined) updateData.description = data.description || null
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = data.scheduledAt
        ? typeof data.scheduledAt === "string"
          ? new Date(data.scheduledAt)
          : data.scheduledAt
        : null
    }
    if (data.status !== undefined) updateData.status = data.status
    if (data.published !== undefined) updateData.published = data.published
    if (data.active !== undefined) updateData.active = data.active
    if (data.playbackUrl !== undefined) updateData.playbackUrl = data.playbackUrl
    if (data.chatEnabled !== undefined) updateData.chatEnabled = data.chatEnabled
    if (data.speaker !== undefined) updateData.speaker = data.speaker || null
    if (data.speakerTitle !== undefined) updateData.speakerTitle = data.speakerTitle || null
    if (data.category !== undefined) updateData.category = data.category || null
    if (data.duration !== undefined) updateData.duration = data.duration || null
    if (data.recordingId !== undefined) updateData.recordingId = data.recordingId || null
    if (data.recordingUrl !== undefined) updateData.recordingUrl = data.recordingUrl || null

    await db.collection("live_events").doc(id).update(updateData)

    return this.getById(id)
  }

  static async setActive(id: string): Promise<void> {
    if (isDemoMode) {
      throw new Error("Cannot set active in demo mode")
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore, FieldValue } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    // Get current env playback URL (always normalize to this when activating)
    const defaultPlaybackUrl = process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL || ""

    // Transaction: set all to false, then set selected to true and normalize playbackUrl
    await db.runTransaction(async (transaction) => {
      const allActiveSnapshot = await transaction.get(
        db.collection("live_events").where("active", "==", true)
      )

      allActiveSnapshot.docs.forEach((doc) => {
        transaction.update(doc.ref, {
          active: false,
          updatedAt: FieldValue.serverTimestamp(),
        })
      })

      const eventRef = db.collection("live_events").doc(id)
      const updateData: any = {
        active: true,
        updatedAt: FieldValue.serverTimestamp(),
      }

      // Always normalize playbackUrl to env value when activating
      if (defaultPlaybackUrl) {
        updateData.playbackUrl = defaultPlaybackUrl
      }

      transaction.update(eventRef, updateData)
    })
  }

  static async delete(id: string): Promise<boolean> {
    if (isDemoMode) {
      throw new Error("Cannot delete in demo mode")
    }

    const app = await getAdminApp()
    if (!app) {
      throw new Error("Firebase Admin not initialized")
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)

    await db.collection("live_events").doc(id).delete()
    return true
  }
}

