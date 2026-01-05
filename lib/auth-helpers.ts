import { type NextRequest } from "next/server"
import { getAdminAuth, getAdminApp } from "./firebase-admin"
import { isDemoMode } from "./env"

/**
 * Verify Firebase ID token from Authorization header
 * Returns the decoded token with user ID, or null if invalid
 */
export async function verifyIdToken(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  if (isDemoMode) {
    // In demo mode, check for a demo token or skip auth
    const authHeader = request.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const _token = authHeader.substring(7)
      // For demo mode, accept any token or return mock user
      return { uid: "demo-user", email: "demo@example.com" }
    }
    return null
  }

  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null
    }

    const token = authHeader.substring(7)
    const adminAuth = await getAdminAuth()
    
    if (!adminAuth) {
      console.error("[Auth] Firebase Admin Auth not initialized")
      return null
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch (error) {
    console.error("[Auth] Token verification failed:", error)
    return null
  }
}

/**
 * Check if user is admin by reading from Firestore using Admin SDK
 * In demo mode, returns true for demo user
 */
export async function isUserAdmin(uid: string): Promise<boolean> {
  if (isDemoMode) {
    // In demo mode, allow access
    return true
  }

  try {
    // Use Firebase Admin SDK to read from Firestore (server-side only)
    const app = await getAdminApp()
    if (!app) {
      console.error("[Auth] Firebase Admin App not initialized")
      return false
    }

    const { getFirestore } = await import("firebase-admin/firestore")
    const db = getFirestore(app)
    
    const userDoc = await db.collection("users").doc(uid).get()
    
    if (!userDoc.exists) {
      return false
    }

    const userData = userDoc.data()
    return userData?.isAdmin === true
  } catch (error) {
    console.error("[Auth] Error checking admin status:", error)
    return false
  }
}

/**
 * Verify authentication and admin authorization
 * Returns user info if authorized, null otherwise
 * 
 * @throws {Error} "Unauthorized" if no token
 * @throws {Error} "Forbidden" if token valid but not admin
 */
export async function requireAdmin(request: NextRequest): Promise<{ uid: string; email?: string }> {
  const user = await verifyIdToken(request)
  if (!user) {
    throw new Error("Unauthorized")
  }

  const isAdmin = await isUserAdmin(user.uid)
  if (!isAdmin) {
    throw new Error("Forbidden")
  }

  return user
}

