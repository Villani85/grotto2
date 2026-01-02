import type { Course } from "@/lib/types-academy"

/**
 * Normalizes a course from Firestore to ensure all required fields exist
 * with sensible defaults for backward compatibility with old courses.
 */
export function normalizeCourse(rawCourse: any): Course {
  const now = new Date()

  return {
    id: rawCourse.id || "",
    title: rawCourse.title || "Corso senza titolo",
    slug: rawCourse.slug || rawCourse.id || "",
    categoryId: rawCourse.categoryId || "",
    categoryName: rawCourse.categoryName || "Academy",
    level: rawCourse.level || "Base",
    shortDescription: rawCourse.shortDescription || rawCourse.description || "Descrizione in arrivo.",
    longDescription: rawCourse.longDescription || rawCourse.description || rawCourse.shortDescription || "Descrizione in arrivo.",
    focusTags: Array.isArray(rawCourse.focusTags) ? rawCourse.focusTags : [],
    coverImageUrl: rawCourse.coverImageUrl || rawCourse.thumbnailUrl || undefined,
    previewVideoUrl: rawCourse.previewVideoUrl || undefined,
    isBestSeller: rawCourse.isBestSeller === true,
    isNew: rawCourse.isNew === true,
    ratingAvg: typeof rawCourse.ratingAvg === "number" && rawCourse.ratingAvg > 0 ? rawCourse.ratingAvg : undefined,
    ratingCount: typeof rawCourse.ratingCount === "number" && rawCourse.ratingCount > 0 ? rawCourse.ratingCount : undefined,
    durationMinutes: typeof rawCourse.durationMinutes === "number" ? rawCourse.durationMinutes : 0,
    lessonsCount: typeof rawCourse.lessonsCount === "number" ? rawCourse.lessonsCount : 0,
    published: rawCourse.published === true,
    createdAt: rawCourse.createdAt?.toDate?.() || new Date(rawCourse.createdAt) || now,
    updatedAt: rawCourse.updatedAt?.toDate?.() || new Date(rawCourse.updatedAt) || now,
    createdByUid: rawCourse.createdByUid || "",
    updatedByUid: rawCourse.updatedByUid || "",
  }
}




