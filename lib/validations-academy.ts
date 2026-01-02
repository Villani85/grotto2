import { z } from "zod"

export const courseSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio").max(200),
  slug: z.string().min(1, "Slug obbligatorio").regex(/^[a-z0-9-]+$/, "Slug non valido"),
  categoryId: z.string().min(1, "Categoria obbligatoria"),
  level: z.enum(["Base", "Intermedio", "Avanzato"]),
  shortDescription: z.string().max(160, "Max 160 caratteri"),
  longDescription: z.string().max(2000, "Max 2000 caratteri"),
  focusTags: z.array(z.string()).max(5, "Max 5 tag"),
  isBestSeller: z.boolean(),
  isNew: z.boolean(),
  ratingAvg: z.number().min(0).max(5).optional(),
  ratingCount: z.number().min(0).optional(),
  durationMinutes: z.number().min(0),
  lessonsCount: z.number().min(0),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  previewVideoUrl: z.string().url().optional().or(z.literal("")),
  published: z.boolean(),
})

export const moduleSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  order: z.number().min(0),
})

export const lessonSchema = z.object({
  title: z.string().min(1, "Titolo obbligatorio"),
  type: z.enum(["video", "testo", "quiz", "risorsa"]),
  durationMinutes: z.number().min(0),
  content: z.string().optional(),
  videoUrl: z.string().url().optional().or(z.literal("")),
  isFreePreview: z.boolean(),
  order: z.number().min(0),
})




