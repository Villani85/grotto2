import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"
import { getStorage } from "firebase-admin/storage"
import { firebaseAdminConfig, isDemoMode } from "./env"

let adminApp: App | null = null

/**
 * Initialize Firebase Admin SDK (server-side only)
 * Uses dynamic import to avoid bundling issues
 */
export async function getAdminApp(): Promise<App | null> {
  // In demo mode, return null
  if (isDemoMode) {
    return null
  }

  // Return existing app if already initialized
  if (adminApp) {
    return adminApp
  }

  // Check if config is available
  if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
    console.warn("[Firebase Admin] Missing configuration - running in demo mode")
    return null
  }

  try {
    // Check if app already exists
    const existingApps = getApps()
    if (existingApps.length > 0) {
      adminApp = existingApps[0]
      return adminApp
    }

    // Initialize new app
    adminApp = initializeApp({
      credential: cert({
        projectId: firebaseAdminConfig.projectId,
        clientEmail: firebaseAdminConfig.clientEmail,
        privateKey: firebaseAdminConfig.privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    })

    console.log("[Firebase Admin] Initialized successfully")
    return adminApp
  } catch (error) {
    console.error("[Firebase Admin] Initialization error:", error)
    return null
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export async function getAdminAuth() {
  const app = await getAdminApp()
  if (!app) return null
  return getAuth(app)
}

/**
 * Get Firebase Admin Storage instance
 */
export async function getAdminStorage() {
  const app = await getAdminApp()
  if (!app) return null
  return getStorage(app)
}




