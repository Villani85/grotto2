"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LivePlayer } from "@/components/live/LivePlayer"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

interface LiveEvent {
  id: string
  title: string
  slug: string
  description?: string
  status: "draft" | "scheduled" | "live" | "ended"
  speaker?: string
  speakerTitle?: string
  category?: string
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  recordingUrl?: string
  playbackUrl?: string
}

export default function LiveEventReplayPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const eventId = params.id as string

  const [event, setEvent] = useState<LiveEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEvent = useCallback(async () => {
    try {
      // Try admin API if user is admin
      if (user?.isAdmin) {
        const token = await import("@/lib/api-helpers").then((m) => m.getFirebaseIdToken())
        if (token) {
          const res = await fetch(`/api/admin/live-events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          })
          const data = await res.json()
          if (data.success && data.event) {
            setEvent({
              id: data.event.id,
              title: data.event.title,
              slug: data.event.slug,
              description: data.event.description,
              status: data.event.status,
              speaker: data.event.speaker,
              speakerTitle: data.event.speakerTitle,
              category: data.event.category,
              scheduledAt: data.event.scheduledAt,
              startedAt: data.event.startedAt,
              endedAt: data.event.endedAt,
              recordingUrl: data.event.recordingUrl,
              playbackUrl: data.event.playbackUrl,
            })
            setIsLoading(false)
            return
          }
        }
      }

      // Fallback: try public API (all events, then find by ID)
      const res = await fetch("/api/live-events", { cache: "no-store" })
      const data = await res.json()

      if (data.success && Array.isArray(data.events)) {
        const foundEvent = data.events.find((e: any) => e.id === eventId)
        if (foundEvent) {
          setEvent(foundEvent)
        } else {
          setError("Evento non trovato")
        }
      } else {
        setError("Evento non trovato")
      }
    } catch (err) {
      console.error("Error fetching event:", err)
      setError("Errore nel caricamento dell'evento")
    } finally {
      setIsLoading(false)
    }
  }, [eventId, user])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  const getReplayUrl = () => {
    if (event?.recordingUrl) {
      return event.recordingUrl
    }
    if (event?.playbackUrl) {
      return event.playbackUrl
    }
    return null
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

  if (error || !event) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <h1 className="text-2xl font-bold">Evento non trovato</h1>
              <p className="text-muted-foreground">{error || "L'evento richiesto non esiste."}</p>
              <Button onClick={() => router.push("/area-riservata/live")} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Torna agli Eventi
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const replayUrl = getReplayUrl()

  return (
    <div className="container mx-auto py-8">
      <div className="mb-4">
        <Button onClick={() => router.push("/area-riservata/live")} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna agli Eventi
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl mb-2">{event.title}</CardTitle>
              {event.status === "ended" && (
                <Badge variant="outline" className="mt-2">
                  REGISTRATO
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <p className="text-muted-foreground">{event.description}</p>
          )}

          {event.speaker && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">Relatore:</span>
              <span>{event.speaker}</span>
              {event.speakerTitle && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{event.speakerTitle}</span>
                </>
              )}
            </div>
          )}

          {event.scheduledAt && (
            <div className="text-sm text-muted-foreground">
              Data evento: {new Date(event.scheduledAt).toLocaleString("it-IT")}
            </div>
          )}

          {replayUrl ? (
            <LivePlayer playbackUrl={replayUrl} />
          ) : (
            <div className="flex items-center justify-center bg-black rounded-lg" style={{ aspectRatio: "16/9" }}>
              <div className="text-center space-y-2">
                <p className="text-white">Replay non disponibile</p>
                <p className="text-gray-400 text-sm">
                  La registrazione non è ancora stata processata o non è disponibile.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

