"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useAuth } from "@/context/AuthContext"

interface ChatMessage {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  text: string
  createdAt: string
}

interface LiveChatProps {
  eventSlug: string
  enabled: boolean
}

export function LiveChat({ eventSlug, enabled }: LiveChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputText, setInputText] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Fetch messages on mount and set up realtime or polling
  useEffect(() => {
    if (!enabled || !eventSlug) return

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/live-events/${eventSlug}/chat?limit=50`)
        if (!res.ok) {
          throw new Error("Failed to fetch messages")
        }
        const data = await res.json()
        if (data.success && Array.isArray(data.messages)) {
          setMessages(data.messages)
          setIsLoading(false)
        }
      } catch (err) {
        console.error("[LiveChat] Error fetching messages:", err)
        setIsLoading(false)
      }
    }

    void fetchMessages().catch((err) => {
      console.error("[LiveChat] Error in fetchMessages:", err)
    })

    // Try Firestore realtime first (if available client-side)
    try {
      const setupRealtime = async () => {
        const { getFirebaseFirestore } = await import("@/lib/firebase-client")
        const db = getFirebaseFirestore()
        if (!db) {
          throw new Error("Firestore not available")
        }

        // Get event ID first
        const eventRes = await fetch(`/api/live-events/${eventSlug}`)
        if (!eventRes.ok) {
          throw new Error("Event not found")
        }
        const eventData = await eventRes.json()
        if (!eventData.success || !eventData.event) {
          throw new Error("Event not found")
        }
        const eventId = eventData.event.id

        const { collection, query, orderBy, limit, onSnapshot } = await import("firebase/firestore")
        const chatRef = collection(db, "live_events", eventId, "chat")
        const q = query(chatRef, orderBy("createdAt", "asc"), limit(50))

        const unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const newMessages: ChatMessage[] = snapshot.docs.map((doc) => {
              const data = doc.data()
              return {
                id: doc.id,
                authorId: data.authorId || "",
                authorName: data.authorName || "",
                authorAvatarUrl: data.authorAvatarUrl || null,
                text: data.text || "",
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
              }
            })
            setMessages(newMessages)
            setIsLoading(false)
          },
          (err) => {
            console.warn("[LiveChat] Realtime listener error, falling back to polling:", err)
            // Fallback to polling
            setupPolling()
          }
        )

        unsubscribeRef.current = unsubscribe
      }

      setupRealtime().catch(() => {
        // Fallback to polling if realtime fails
        setupPolling()
      })
    } catch (err) {
      // Fallback to polling
      setupPolling()
    }

    // Polling fallback
    const setupPolling = () => {
      pollingIntervalRef.current = setInterval(() => {
        void fetchMessages().catch((err) => {
          console.error("[LiveChat] Error in polling fetchMessages:", err)
        })
      }, 5000) // Poll every 5 seconds
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [eventSlug, enabled])

  const handleSend = async () => {
    if (!inputText.trim() || isSending || !user) {
      return
    }

    setIsSending(true)
    setError(null)

    try {
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Authentication required")
      }

      const res = await fetch(`/api/live-events/${eventSlug}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: inputText.trim() }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Failed to send message")
      }

      setInputText("")
    } catch (err: any) {
      console.error("[LiveChat] Error sending message:", err)
      setError(err.message || "Errore nell'invio del messaggio")
    } finally {
      setIsSending(false)
    }
  }

  if (!enabled) {
    return null
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Chat Live</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4 min-h-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Caricamento messaggi...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nessun messaggio ancora. Inizia la conversazione!</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <div className="flex items-start gap-2">
                  {msg.authorAvatarUrl ? (
                    <img
                      src={msg.authorAvatarUrl}
                      alt={msg.authorName}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                      {msg.authorName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-semibold">{msg.authorName}</div>
                    <div className="text-muted-foreground">{msg.text}</div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-2 text-sm text-destructive">{error}</div>
        )}

        {/* Input area */}
        {user ? (
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  void handleSend().catch((err) => {
                    console.error("[LiveChat] Error in handleSend:", err)
                  })
                }
              }}
              placeholder="Scrivi un messaggio..."
              disabled={isSending}
              maxLength={280}
            />
            <Button onClick={handleSend} disabled={isSending || !inputText.trim()}>
              Invia
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Accedi per partecipare alla chat</p>
        )}
      </CardContent>
    </Card>
  )
}


