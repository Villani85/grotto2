"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"

interface ActiveEvent {
  slug: string
  title: string
}

export default function LivePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeEvent, setActiveEvent] = useState<ActiveEvent | null>(null)

  useEffect(() => {
    fetchActiveEvent()
  }, [])

  const fetchActiveEvent = async () => {
    try {
      const res = await fetch("/api/live-events/active", { cache: "no-store" })
      const data = await res.json()

      if (data.success && data.event) {
        setActiveEvent({
          slug: data.event.slug,
          title: data.event.title,
        })
        // Redirect to event page
        router.push(`/live/${data.event.slug}`)
      } else {
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error fetching active event:", error)
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Caricamento...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="py-8">
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold">Nessuna diretta in corso</h1>
            <p className="text-muted-foreground">
              Non ci sono eventi live attivi al momento. Torna più tardi per vedere le prossime dirette.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


