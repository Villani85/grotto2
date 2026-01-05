import { isDemoMode } from "@/lib/env"
import { mockCourses, mockLessons } from "@/lib/mock/data"
import type { Course, Lesson } from "@/lib/types"

// async function getDb() {
//   if (isDemoMode) return null
//   const { getAdminDb } = await import("@/lib/firebase-admin")
//   return await getAdminDb()
// }

export class CoursesRepository {
  static async getAll(publishedOnly = true): Promise<Course[]> {
    if (isDemoMode) {
      return publishedOnly ? mockCourses.filter((c) => c.published) : mockCourses
    }

    // In production, query Firestore directly (client-side)
    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase-client")
      const db = getFirebaseFirestore()
      
      if (!db) {
        console.warn("[CoursesRepository] Firestore not initialized, returning empty array")
        return []
      }

      const { collection, getDocs, query, where } = await import("firebase/firestore")
      const coursesRef = collection(db, "courses")
      
      // Build query: filter by published if needed
      let coursesQuery = query(coursesRef)
      if (publishedOnly) {
        coursesQuery = query(coursesRef, where("published", "==", true))
      }

      const snapshot = await getDocs(coursesQuery)
      
      return snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          thumbnailUrl: data.thumbnailUrl || "",
          published: data.published ?? false,
          createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt) || new Date(),
        } as Course
      })
    } catch (error) {
      console.error("[CoursesRepository] Error fetching courses from Firestore:", error)
      return []
    }
  }

  static async getById(id: string): Promise<Course | null> {
    if (isDemoMode) {
      return mockCourses.find((c) => c.id === id) || null
    }

    // In production, query Firestore directly (client-side)
    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase-client")
      const db = getFirebaseFirestore()
      
      if (!db) {
        console.warn("[CoursesRepository] Firestore not initialized, returning null")
        return null
      }

      const { doc, getDoc } = await import("firebase/firestore")
      const courseRef = doc(db, "courses", id)
      const courseDoc = await getDoc(courseRef)
      
      if (!courseDoc.exists()) {
        return null
      }

      const data = courseDoc.data()
      return {
        id: courseDoc.id,
        title: data.title || "",
        description: data.description || "",
        category: data.category || "",
        thumbnailUrl: data.thumbnailUrl || "",
        published: data.published ?? false,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt) || new Date(),
      } as Course
    } catch (error) {
      console.error("[CoursesRepository] Error fetching course from Firestore:", error)
      return null
    }
  }

  static async getLessonsByCourseId(courseId: string, publishedOnly = true): Promise<Lesson[]> {
    if (isDemoMode) {
      const lessons = mockLessons.filter((l) => l.courseId === courseId)
      const filtered = publishedOnly ? lessons.filter((l) => l.published) : lessons
      return filtered.sort((a, b) => a.order - b.order)
    }

    // In production, query Firestore directly (client-side)
    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase-client")
      const db = getFirebaseFirestore()
      
      if (!db) {
        console.warn("[CoursesRepository] Firestore not initialized, returning empty array")
        return []
      }

      const { collection, getDocs, query, where, orderBy } = await import("firebase/firestore")
      const lessonsRef = collection(db, "courses", courseId, "lessons")
      
      // Build query: filter by published if needed, then order by order
      // Note: where + orderBy on different fields requires composite index
      let lessonsData: Lesson[] = []
      
      try {
        let lessonsQuery
        if (publishedOnly) {
          lessonsQuery = query(lessonsRef, where("published", "==", true), orderBy("order", "asc"))
        } else {
          lessonsQuery = query(lessonsRef, orderBy("order", "asc"))
        }

        const snapshot = await getDocs(lessonsQuery)
        
        lessonsData = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            courseId,
            title: data.title || "",
            description: data.description || "",
            videoUrl: data.videoUrl || "",
            duration: data.duration || 0,
            order: data.order || 0,
            published: data.published ?? true,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
          } as Lesson
        })
      } catch (indexError: any) {
        // Fallback: if index doesn't exist, fetch all and filter/order client-side
        if (indexError.code === "failed-precondition" && indexError.message?.includes("index")) {
          console.warn("[CoursesRepository] Index not found, using client-side filtering. Create index for better performance")
          
          // Fetch all lessons
          const allLessonsSnapshot = await getDocs(lessonsRef)
          const allLessons = allLessonsSnapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              courseId,
              title: data.title || "",
              description: data.description || "",
              videoUrl: data.videoUrl || "",
              duration: data.duration || 0,
              order: data.order || 0,
              published: data.published ?? true,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt) || new Date(),
            } as Lesson
          })
          
          // Filter and sort client-side
          lessonsData = allLessons
            .filter(lesson => !publishedOnly || lesson.published === true)
            .sort((a, b) => a.order - b.order)
        } else {
          throw indexError // Re-throw if it's a different error
        }
      }
      
      return lessonsData
    } catch (error) {
      console.error("[CoursesRepository] Error fetching lessons from Firestore:", error)
      return []
    }
  }

  static async create(course: Omit<Course, "id" | "createdAt" | "updatedAt">): Promise<string | null> {
    if (isDemoMode) {
      console.log("[CoursesRepository] Demo mode - create skipped")
      return "demo-course-" + Date.now()
    }

    // In production, create course in Firestore (server-side via Admin SDK)
    try {
      const { getAdminApp } = await import("@/lib/firebase-admin")
      const app = await getAdminApp()
      
      if (!app) {
        console.warn("[CoursesRepository] Firebase Admin not initialized, cannot create course")
        return null
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)
      
      const courseData = {
        title: course.title,
        description: course.description || "",
        category: course.category || "",
        thumbnailUrl: course.thumbnailUrl || "",
        published: course.published ?? false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const courseRef = await db.collection("courses").add(courseData)

      console.log("[CoursesRepository] ✅ Course created in Firestore:", courseRef.id, {
        title: course.title,
        published: courseData.published,
      })
      return courseRef.id
    } catch (error) {
      console.error("[CoursesRepository] ❌ Error creating course in Firestore:", error)
      return null
    }
  }

  static async update(id: string, data: Partial<Course>): Promise<boolean> {
    if (isDemoMode) {
      console.log("[CoursesRepository] Demo mode - update skipped")
      return true
    }

    // In production, update course in Firestore (server-side via Admin SDK)
    try {
      const { getAdminApp } = await import("@/lib/firebase-admin")
      const app = await getAdminApp()
      
      if (!app) {
        console.warn("[CoursesRepository] Firebase Admin not initialized, cannot update course")
        return false
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)
      
      const courseRef = db.collection("courses").doc(id)
      
      await courseRef.update({
        ...data,
        updatedAt: new Date(),
      })

      console.log("[CoursesRepository] ✅ Course updated in Firestore:", id)
      return true
    } catch (error) {
      console.error("[CoursesRepository] ❌ Error updating course in Firestore:", error)
      return false
    }
  }

  static async createLesson(courseId: string, lesson: Omit<Lesson, "id" | "courseId" | "createdAt">): Promise<string | null> {
    if (isDemoMode) {
      console.log("[CoursesRepository] Demo mode - createLesson:", { courseId, lesson })
      return `demo-lesson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }

    // In production, create lesson in Firestore (server-side via Admin SDK)
    try {
      const { getAdminApp } = await import("@/lib/firebase-admin")
      const app = await getAdminApp()
      
      if (!app) {
        console.warn("[CoursesRepository] Firebase Admin not initialized, cannot create lesson")
        return null
      }

      const { getFirestore } = await import("firebase-admin/firestore")
      const db = getFirestore(app)
      
      const lessonData = {
        courseId,
        title: lesson.title,
        description: lesson.description || "",
        videoUrl: lesson.videoUrl || "pending",
        duration: lesson.duration || 0,
        order: lesson.order || 0,
        published: lesson.published ?? true, // Default to published
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const lessonRef = await db
        .collection("courses")
        .doc(courseId)
        .collection("lessons")
        .add(lessonData)

      console.log("[CoursesRepository] ✅ Lesson created in Firestore:", lessonRef.id, {
        courseId,
        title: lesson.title,
        published: lessonData.published,
      })
      return lessonRef.id
    } catch (error) {
      console.error("[CoursesRepository] ❌ Error creating lesson in Firestore:", error)
      return null
    }
  }
}
