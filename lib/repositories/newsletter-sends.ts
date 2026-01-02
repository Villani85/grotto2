import { isDemoMode } from "@/lib/env"
import type { NewsletterSend } from "@/lib/types"

export class NewsletterSendsRepository {
  static async create(send: Omit<NewsletterSend, "id" | "createdAt">): Promise<string | null> {
    if (isDemoMode) {
      console.log("[NewsletterSendsRepository] Demo mode - create logged:", send)
      return `demo-send-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // In production, save to Firestore using Admin SDK
    try {
      const { getAdminApp } = await import("@/lib/firebase-admin")
      const app = await getAdminApp()
      
      if (!app) {
        console.warn("[NewsletterSendsRepository] Firebase Admin not initialized, cannot create send record")
        return null
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)
      
      const sendData = {
        campaignId: send.campaignId,
        toUserId: send.toUserId,
        toEmail: send.toEmail,
        status: send.status,
        error: send.error || null,
        resendId: send.resendId || null,
        resendResponse: send.resendResponse || null,
        requestDetails: send.requestDetails || null,
        sentAt: send.sentAt || null,
        createdAt: new Date(),
      }

      const sendRef = await db.collection("newsletter_sends").add(sendData)

      console.log("[NewsletterSendsRepository] ✅ Send record created in Firestore:", sendRef.id)
      return sendRef.id
    } catch (error) {
      console.error("[NewsletterSendsRepository] ❌ Error creating send record in Firestore:", error)
      return null
    }
  }

  static async getByCampaignId(campaignId: string, limit = 1000): Promise<NewsletterSend[]> {
    if (isDemoMode) {
      return []
    }

    try {
      const { getAdminApp } = await import("@/lib/firebase-admin")
      const app = await getAdminApp()
      
      if (!app) {
        return []
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)
      
      const sendsSnapshot = await db
        .collection("newsletter_sends")
        .where("campaignId", "==", campaignId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      return sendsSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          campaignId: data.campaignId || "",
          toUserId: data.toUserId || "",
          toEmail: data.toEmail || "",
          status: data.status || "pending",
          error: data.error || undefined,
          resendId: data.resendId || undefined,
          resendResponse: data.resendResponse || undefined,
          requestDetails: data.requestDetails || undefined,
          sentAt: data.sentAt?.toDate?.() || new Date(data.sentAt) || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
        } as NewsletterSend
      })
    } catch (error) {
      console.error("[NewsletterSendsRepository] Error fetching sends from Firestore:", error)
      return []
    }
  }

  static async getAll(limit = 1000): Promise<NewsletterSend[]> {
    if (isDemoMode) {
      return []
    }

    try {
      const { getAdminApp } = await import("@/lib/firebase-admin")
      const app = await getAdminApp()
      
      if (!app) {
        return []
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)
      
      const sendsSnapshot = await db
        .collection("newsletter_sends")
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get()

      return sendsSnapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          campaignId: data.campaignId || "",
          toUserId: data.toUserId || "",
          toEmail: data.toEmail || "",
          status: data.status || "pending",
          error: data.error || undefined,
          resendId: data.resendId || undefined,
          resendResponse: data.resendResponse || undefined,
          requestDetails: data.requestDetails || undefined,
          sentAt: data.sentAt?.toDate?.() || new Date(data.sentAt) || undefined,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
        } as NewsletterSend
      })
    } catch (error) {
      console.error("[NewsletterSendsRepository] Error fetching sends from Firestore:", error)
      return []
    }
  }
}




