"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { LivePlayer } from "@/components/live/LivePlayer"
import { LiveChat } from "@/components/live/LiveChat"

interface LiveEvent {
  id: string
  title: string
  slug: string
  description?: string
  status: "draft" | "scheduled" | "live" | "ended"
  playbackUrl: string
  recordingUrl: string | null
  recordingId: string | null
  chatEnabled: boolean
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
}

export default function LiveEventPage() {
  const params = useParams()
  const slug = params.slug as string

  const [event, setEvent] = useState<LiveEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPollingRecording, setIsPollingRecording] = useState(false)
  const pollingAttemptsRef = useRef(0)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  // Debug panel state (dev only)
  const [debugInfo, setDebugInfo] = useState<{
    playbackUrl: string
    manifestStatus: number | null
    manifestError: string | null
    playerError: string | null
  } | null>(null)

  // Probe manifest URL (dev only) - uses API proxy to avoid CORS
  const probeManifest = useCallback(async (url: string) => {
    if (process.env.NODE_ENV !== "development") return

    setDebugInfo({
      playbackUrl: url,
      manifestStatus: null,
      manifestError: null,
      playerError: null,
    })

    try {
      // Use API proxy to check manifest (avoids CORS)
      const res = await fetch(`/api/live-events/probe-manifest?url=${encodeURIComponent(url)}`, {
        cache: "no-store",
      })

      const data = await res.json()
      if (data.success) {
        setDebugInfo((prev) => ({
          ...prev!,
          manifestStatus: data.status,
        }))
      } else {
        setDebugInfo((prev) => ({
          ...prev!,
          manifestError: data.error || `HTTP ${data.status}`,
        }))
      }
    } catch (err: any) {
      setDebugInfo((prev) => ({
        ...prev!,
        manifestError: err.message || "Errore probe",
      }))
    }
  }, [])

  const fetchEvent = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-events/${slug}`, { cache: "no-store" })
      
      // Robust JSON parsing
      const text = await res.text()
      let data: any = null
      if (text && text.trim() !== "") {
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          console.error("[LiveEventPage] JSON parse error:", parseError)
          setError("Risposta non valida dal server")
          setIsLoading(false)
          return
        }
      } else {
        setError("Risposta vuota dal server")
        setIsLoading(false)
        return
      }

      if (!res.ok || !data.success) {
        setError(data.error || "Evento non trovato")
        setIsLoading(false)
        return
      }

      if (data.event) {
        setEvent(data.event)
        // Probe manifest in dev mode (use appropriate URL)
        if (process.env.NODE_ENV === "development") {
          const urlToProbe = data.event.status === "live" 
            ? data.event.playbackUrl 
            : data.event.recordingUrl || data.event.playbackUrl
          if (urlToProbe) {
            probeManifest(urlToProbe)
          }
        }
      } else {
        setError("Evento non trovato")
      }
    } catch (err: any) {
      console.error("Error fetching event:", err)
      setError(err.message || "Errore nel caricamento dell'evento")
    } finally {
      setIsLoading(false)
    }
  }, [slug, probeManifest])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  // Polling for recording when event is ended but recordingUrl not available
  useEffect(() => {
    // Clear any existing polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    // Start polling if: ended status + no recordingUrl + not already polling
    if (event?.status === "ended" && !event.recordingUrl && !isPollingRecording) {
      setIsPollingRecording(true)
      pollingAttemptsRef.current = 0
      const MAX_ATTEMPTS = 30 // 5 minutes (30 * 10s)

      pollingIntervalRef.current = setInterval(async () => {
        pollingAttemptsRef.current++
        
        if (pollingAttemptsRef.current > MAX_ATTEMPTS) {
          // Stop polling after max attempts
          clearInterval(pollingIntervalRef.current!)
          pollingIntervalRef.current = null
          setIsPollingRecording(false)
          return
        }

        // Refetch event
        try {
          const res = await fetch(`/api/live-events/${slug}`, { cache: "no-store" })
          const text = await res.text()
          let data: any = null
          
          if (text && text.trim() !== "") {
            try {
              data = JSON.parse(text)
            } catch {
              return // Skip this attempt if parse fails
            }
          }

          if (data?.success && data?.event) {
            // If recordingUrl is now available, update and stop polling
            if (data.event.recordingUrl) {
              setEvent(data.event)
              clearInterval(pollingIntervalRef.current!)
              pollingIntervalRef.current = null
              setIsPollingRecording(false)
            }
          }
        } catch (err) {
          // Ignore errors during polling, continue
          console.warn("[LiveEventPage] Polling error:", err)
        }
      }, 10000) // 10 seconds
    }

    // Cleanup on unmount or when conditions change
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [event?.status, event?.recordingUrl, isPollingRecording, slug])

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
              <p className="text-muted-foreground">{error || "L'evento richiesto non esiste o non è pubblicato."}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Main content */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">{event.title}</CardTitle>
                {event.status === "live" && (
                  <Badge variant="destructive" className="animate-pulse">
                    LIVE
                  </Badge>
                )}
                {event.status === "ended" && event.recordingUrl && (
                  <Badge variant="secondary">
                    REGISTRAZIONE
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {event.description && (
                <p className="text-muted-foreground mb-4">{event.description}</p>
              )}

              {/* Debug Panel (dev only) */}
              {process.env.NODE_ENV === "development" && (
                <div className="mb-4 p-3 bg-muted rounded-md border text-xs">
                  <div className="font-semibold mb-2">🔧 Debug Info (Dev Only)</div>
                  <div className="space-y-1">
                    <div>
                      <strong>Playback URL:</strong>{" "}
                      <code className="text-xs break-all">{event.playbackUrl || "N/A"}</code>
                    </div>
                    {debugInfo && (
                      <>
                        <div>
                          <strong>Manifest Status:</strong>{" "}
                          {debugInfo.manifestStatus !== null ? (
                            <span className={debugInfo.manifestStatus === 200 ? "text-green-600" : "text-red-600"}>
                              {debugInfo.manifestStatus}
                            </span>
                          ) : (
                            <span className="text-yellow-600">Probing...</span>
                          )}
                        </div>
                        {debugInfo.manifestError && (
                          <div className="text-red-600">
                            <strong>Manifest Error:</strong> {debugInfo.manifestError}
                          </div>
                        )}
                        {debugInfo.playerError && (
                          <div className="text-red-600">
                            <strong>Player Error:</strong> {debugInfo.playerError}
                          </div>
                        )}
                      </>
                    )}
                    <button
                      onClick={() => probeManifest(event.playbackUrl)}
                      className="mt-2 px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                      🔄 Probe Manifest
                    </button>
                  </div>
                </div>
              )}

              {/* Determine which URL to use: live or VOD */}
              {(() => {
                const playbackToUse = 
                  event.status === "live" 
                    ? event.playbackUrl
                    : event.status === "ended" && event.recordingUrl
                    ? event.recordingUrl
                    : null

                if (!playbackToUse) {
                  // Ended but recording not ready
                  return (
                    <div className="flex items-center justify-center bg-black rounded-lg" style={{ aspectRatio: "16/9" }}>
                      <div className="text-center space-y-4 p-8">
                        <div className="space-y-2">
                          <p className="text-white text-lg font-semibold">Registrazione in elaborazione</p>
                          <p className="text-gray-400 text-sm">
                            La registrazione della diretta sarà disponibile a breve.
                          </p>
                          {isPollingRecording && (
                            <p className="text-gray-500 text-xs">
                              Tentativo {pollingAttemptsRef.current} di 30...
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            pollingAttemptsRef.current = 0
                            fetchEvent()
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                        >
                          Riprova ora
                        </button>
                      </div>
                    </div>
                  )
                }

                return (
                  <LivePlayer
                    playbackUrl={playbackToUse}
                    onError={(error) => {
                      if (process.env.NODE_ENV === "development") {
                        setDebugInfo((prev) => ({
                          ...prev!,
                          playerError: error,
                        }))
                      }
                    }}
                  />
                )
              })()}
            </CardContent>
          </Card>
        </div>

        {/* Chat sidebar */}
        {event.chatEnabled && (
          <div className="h-[600px]">
            <LiveChat eventSlug={event.slug} enabled={event.chatEnabled} />
          </div>
        )}
      </div>
    </div>
  )
}


