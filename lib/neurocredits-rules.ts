/**
 * NeuroCredits Rules Configuration
 * Defines point values and daily caps for different event types
 */

export const NEUROCREDITS_RULES = {
  // Community events (main source of credits)
  POST_CREATED: {
    neuroCredits: 2,
    description: "Post creato",
    hasDailyCap: true,
    dailyCap: 5, // Max 5 post al giorno che danno NeuroCredits
  },
  COMMENT_CREATED: {
    neuroCredits: 1,
    description: "Commento creato",
    hasDailyCap: true,
    dailyCap: 10, // Max 10 commenti al giorno che danno NeuroCredits
  },
  COMMENT_DELETED: {
    neuroCredits: -1,
    description: "Commento eliminato",
    hasDailyCap: false,
  },
  LIKE_RECEIVED: {
    neuroCredits: 1,
    description: "Like ricevuto su un tuo post",
    hasDailyCap: false,
  },
  UNLIKE_RECEIVED: {
    neuroCredits: -1,
    description: "Like rimosso da un tuo post",
    hasDailyCap: false,
  },

  // Video events (lightweight, with daily cap)
  VIDEO_COMPLETED: {
    neuroCredits: 1,
    description: "Video completato",
    hasDailyCap: true,
    dailyCap: 3, // Max 3 video completati al giorno che danno NeuroCredits
  },

  // Daily active (lightweight, once per day)
  DAILY_ACTIVE: {
    neuroCredits: 1,
    description: "Primo evento del giorno",
    hasDailyCap: true,
    dailyCap: 1, // Max 1 al giorno
  },
  // Admin adjustment (no cap, can be negative)
  ADMIN_ADJUST: {
    neuroCredits: 0, // Will be set dynamically
    description: "Aggiustamento amministratore",
    hasDailyCap: false,
  },
} as const

export type NeuroCreditEventType = keyof typeof NEUROCREDITS_RULES

/**
 * Get period ID for current month (YYYY-MM)
 */
export function getPeriodId(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

/**
 * Get today's date string (YYYY-MM-DD)
 */
export function getTodayString(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

