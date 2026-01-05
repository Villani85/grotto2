"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CourseProgram } from "@/components/academy/CourseProgram"
import type { Course, Module, Lesson } from "@/lib/types-academy"
import { FiStar, FiClock, FiBookOpen } from "react-icons/fi"

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [course, setCourse] = useState<Course | null>(null)
  const [modules, setModules] = useState<Array<Module & { lessons: Lesson[] }>>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (slug) {
      void fetchCourse().catch((e) => console.error("[academy] fetchCourse failed", e))
    }
  }, [slug])

  const fetchCourse = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(`/api/courses/${slug}`, { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setCourse(data.course)
        setModules(data.modules || [])
      } else {
        console.error("Failed to fetch course:", res.status)
        setCourse(null)
      }
    } catch (error) {
      console.error("Error fetching course:", error)
      setCourse(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStart = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (!course) {
      console.warn("[Course] handleStart: course is null")
      return
    }

    console.log("[Course] handleStart called", { courseId: course.id, slug: course.slug })

    // Find first lesson
    let firstLessonId: string | null = null

    // Check if modules/lessons are already loaded
    if (modules.length > 0) {
      // Sort modules by order
      const sortedModules = [...modules].sort((a, b) => (a.order || 0) - (b.order || 0))
      
      // Find first lesson in first module
      for (const courseModule of sortedModules) {
        if (courseModule.lessons && courseModule.lessons.length > 0) {
          const sortedLessons = [...courseModule.lessons].sort((a, b) => (a.order || 0) - (b.order || 0))
          firstLessonId = sortedLessons[0].id
          break
        }
      }
    }

    // If no lesson found, fetch course details
    if (!firstLessonId) {
      try {
        const res = await fetch(`/api/courses/${course.slug || course.id}`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const fetchedModules = data.modules || []
          const sortedModules = [...fetchedModules].sort((a: Module, b: Module) => (a.order || 0) - (b.order || 0))
          
          for (const courseModule of sortedModules) {
            if (courseModule.lessons && courseModule.lessons.length > 0) {
              const sortedLessons = [...courseModule.lessons].sort((a: Lesson, b: Lesson) => (a.order || 0) - (b.order || 0))
              firstLessonId = sortedLessons[0].id
              break
            }
          }
        }
      } catch (error) {
        console.error("[Course] Error fetching course details:", error)
      }
    }

    if (firstLessonId) {
      console.log("[Course] Navigating to lesson:", firstLessonId)
      router.push(`/academy/${course.slug || course.id}?lesson=${firstLessonId}`)
    } else {
      console.warn("[Course] No lessons found")
      alert("Nessuna lezione disponibile per questo corso.")
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  // Early returns must be after all hooks and before using course
  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Caricamento...</div>
  }

  if (!course) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Corso non trovato
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Card>
        <div className="relative aspect-video w-full bg-muted rounded-t-lg overflow-hidden">
          {course.coverImageUrl ? (
            <img
              src={course.coverImageUrl}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <FiBookOpen className="w-24 h-24" />
            </div>
          )}
        </div>
        <CardHeader className="relative z-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {course.isBestSeller && (
                  <Badge variant="default" className="bg-primary">
                    Best Seller
                  </Badge>
                )}
                {course.isNew && <Badge variant="secondary">Nuovo</Badge>}
                <Badge variant="outline">{course.level}</Badge>
                <Badge variant="outline">{course.categoryName}</Badge>
              </div>
              <CardTitle className="text-3xl mb-2">{course.title}</CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                {course.durationMinutes > 0 && (
                  <div className="flex items-center gap-1">
                    <FiClock className="w-4 h-4" />
                    <span>{formatDuration(course.durationMinutes)}</span>
                  </div>
                )}
                {course.lessonsCount > 0 && (
                  <div className="flex items-center gap-1">
                    <FiBookOpen className="w-4 h-4" />
                    <span>{course.lessonsCount} lezioni</span>
                  </div>
                )}
                {course.ratingAvg && course.ratingCount && (
                  <div className="flex items-center gap-1">
                    <FiStar className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span>
                      {course.ratingAvg.toFixed(1)} ({course.ratingCount} recensioni)
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="relative z-10 flex-shrink-0">
              <Button 
                type="button"
                size="lg"
                className="cursor-pointer pointer-events-auto"
                onClick={handleStart}
                disabled={!course}
              >
                Inizia
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base whitespace-pre-line">
            {course.longDescription}
          </CardDescription>
          {course.focusTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {course.focusTags.map((tag, idx) => (
                <Badge key={idx} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Program */}
      <Card>
        <CardContent className="pt-6">
          <CourseProgram modules={modules} />
        </CardContent>
      </Card>

      {/* Risultato (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Risultato</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Al termine di questo corso avrai acquisito le competenze necessarie per...
          </p>
        </CardContent>
      </Card>

      {/* FAQ (placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Domande Frequenti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">FAQ in arrivo...</p>
        </CardContent>
      </Card>
    </div>
  )
}

