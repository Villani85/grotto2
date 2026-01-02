"use client"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import type { Module, Lesson } from "@/lib/types-academy"
import { FiClock, FiPlay, FiFileText, FiHelpCircle, FiLink } from "react-icons/fi"

interface CourseProgramProps {
  modules: Array<Module & { lessons: Lesson[] }>
}

export function CourseProgram({ modules }: CourseProgramProps) {
  const getLessonIcon = (type: Lesson["type"]) => {
    switch (type) {
      case "video":
        return <FiPlay className="w-4 h-4" />
      case "testo":
        return <FiFileText className="w-4 h-4" />
      case "quiz":
        return <FiHelpCircle className="w-4 h-4" />
      case "risorsa":
        return <FiLink className="w-4 h-4" />
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Programma</h2>
      <Accordion type="single" collapsible className="w-full">
        {modules.map((module) => (
          <AccordionItem key={module.id} value={module.id}>
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{module.title}</span>
                <Badge variant="outline" className="text-xs">
                  {module.lessons.length} lezioni
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pl-4">
                {module.lessons.map((lesson) => (
                  <div
                    key={lesson.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1">
                      {getLessonIcon(lesson.type)}
                      <span className="text-sm">{lesson.title}</span>
                      {lesson.isFreePreview && (
                        <Badge variant="secondary" className="text-xs">
                          Anteprima
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <FiClock className="w-3 h-3" />
                      <span>{formatDuration(lesson.durationMinutes)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}




