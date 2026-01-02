import { z } from "zod"

// Post validation
export const createPostSchema = z.object({
  text: z.string().min(1, "Il testo del post è obbligatorio").max(5000, "Il post non può superare i 5000 caratteri"),
})

// Comment validation
export const createCommentSchema = z.object({
  text: z.string().min(1, "Il testo del commento è obbligatorio").max(500, "Il commento non può superare i 500 caratteri"),
})

// Rate limiting (simple in-memory store - in production use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(uid: string, maxRequests: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const key = uid
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute




