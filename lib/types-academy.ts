// Academy-specific type definitions

export interface Category {
  id: string
  name: string
  order: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Course {
  id: string
  title: string
  slug: string
  categoryId: string
  categoryName: string
  level: "Base" | "Intermedio" | "Avanzato"
  shortDescription: string // max 160
  longDescription: string // max 2000
  focusTags: string[] // max 5
  isBestSeller: boolean
  isNew: boolean
  ratingAvg?: number
  ratingCount?: number
  durationMinutes: number
  lessonsCount: number
  coverImageUrl?: string
  previewVideoUrl?: string
  published: boolean
  createdAt: Date
  updatedAt: Date
  createdByUid: string
  updatedByUid: string
}

export interface Module {
  id: string
  courseId: string
  title: string
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface Lesson {
  id: string
  courseId: string
  moduleId: string
  title: string
  type: "video" | "testo" | "quiz" | "risorsa"
  durationMinutes: number
  content?: string
  videoUrl?: string
  isFreePreview: boolean
  order: number
  createdAt: Date
  updatedAt: Date
}

export interface CourseProgress {
  courseId: string
  startedAt: Date
  completedLessonsCount: number
  updatedAt: Date
}

export interface LessonProgress {
  courseId: string
  lessonId: string
  completed: boolean
  completedAt?: Date
  lastViewedAt?: Date
}




