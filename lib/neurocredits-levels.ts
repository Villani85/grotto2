/**
 * NeuroCredits Level System
 * Calculates user level based on total NeuroCredits
 */

const LEVELS = [
  { level: 1, creditsRequired: 0 },
  { level: 2, creditsRequired: 100 },
  { level: 3, creditsRequired: 250 },
  { level: 4, creditsRequired: 500 },
  { level: 5, creditsRequired: 1000 },
  { level: 6, creditsRequired: 2000 },
  { level: 7, creditsRequired: 3500 },
  { level: 8, creditsRequired: 5000 },
  { level: 9, creditsRequired: 7500 },
  { level: 10, creditsRequired: 10000 },
  // Continue with exponential growth
  { level: 11, creditsRequired: 15000 },
  { level: 12, creditsRequired: 25000 },
  { level: 13, creditsRequired: 40000 },
  { level: 14, creditsRequired: 60000 },
  { level: 15, creditsRequired: 100000 },
]

/**
 * Calculate level from total NeuroCredits
 */
export function calculateLevel(neuroCredits: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (neuroCredits >= LEVELS[i].creditsRequired) {
      return LEVELS[i].level
    }
  }
  return 1
}

/**
 * Get credits required for next level
 */
export function getCreditsForNextLevel(neuroCredits: number): number | null {
  const currentLevel = calculateLevel(neuroCredits)
  const nextLevel = LEVELS.find((l) => l.level === currentLevel + 1)
  if (!nextLevel) {
    return null // Max level reached
  }
  return nextLevel.creditsRequired
}

/**
 * Get progress to next level (0-100)
 */
export function getProgressToNextLevel(neuroCredits: number): {
  current: number
  next: number
  progress: number
} {
  const currentLevel = calculateLevel(neuroCredits)
  const currentLevelData = LEVELS.find((l) => l.level === currentLevel)!
  const nextLevelData = LEVELS.find((l) => l.level === currentLevel + 1)

  if (!nextLevelData) {
    // Max level
    return {
      current: neuroCredits,
      next: neuroCredits,
      progress: 100,
    }
  }

  const range = nextLevelData.creditsRequired - currentLevelData.creditsRequired
  const progress = ((neuroCredits - currentLevelData.creditsRequired) / range) * 100

  return {
    current: neuroCredits,
    next: nextLevelData.creditsRequired,
    progress: Math.min(100, Math.max(0, progress)),
  }
}

/**
 * Get level name/title
 */
export function getLevelName(level: number): string {
  const titles: Record<number, string> = {
    1: "Principiante",
    2: "Apprendista",
    3: "Studioso",
    4: "Esperto",
    5: "Maestro",
    6: "Guru",
    7: "Saggio",
    8: "Illuminato",
    9: "Genio",
    10: "Leggenda",
    11: "Mito",
    12: "Immortale",
    13: "Divino",
    14: "Trascendente",
    15: "Supremo",
  }
  return titles[level] || `Livello ${level}`
}




