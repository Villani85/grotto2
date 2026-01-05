import { type NextRequest } from "next/server"
import { getAdminAuth } from "./firebase-admin"
import { isDemoMode } from "./env"

/**
 * Verify Firebase ID Token from Authorization header
 * Returns the decoded token with user ID, or null if invalid
 * 
 * @param request - Next.js request object
 * @returns User info with uid and email, or null if invalid
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
      console.warn("[Auth Server] No Authorization header found")
      return null
    }

    const token = authHeader.substring(7)
    const adminAuth = await getAdminAuth()
    
    if (!adminAuth) {
      console.error("[Auth Server] Firebase Admin Auth not initialized")
      return null
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    }
  } catch (error: any) {
    console.error("[Auth Server] Token verification failed:", error.message)
    return null
  }
}

/**
 * Require authentication - throws error if not authenticated
 */
export async function requireAuth(request: NextRequest): Promise<{ uid: string; email?: string }> {
  const user = await verifyIdToken(request)
  if (!user) {
    throw new Error("Unauthorized")
  }
  return user
}




