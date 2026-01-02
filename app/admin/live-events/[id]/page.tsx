"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ExternalLink, Radio } from "lucide-react"
import { authenticatedFetch, getFirebaseIdToken } from "@/lib/api-helpers"

interface LiveEvent {
  id: string
  title: string
  slug: string
  description?: string
  scheduledAt: string | null
  status: "draft" | "scheduled" | "live" | "ended"
  published: boolean
  active: boolean
  playbackUrl: string
  chatEnabled: boolean
  speaker?: string
  speakerTitle?: string
  category?: string
  duration?: number
  recordingId?: string
  recordingUrl?: string
}

export default function AdminEditLiveEventPage() {
  const router = useRouter()
  const params = useParams()
  const eventId = params.id as string

  const [event, setEvent] = useState<LiveEvent | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    scheduledAt: "",
    status: "draft" as const,
    published: false,
    active: false,
    playbackUrl: "",
    chatEnabled: true,
    speaker: "",
    speakerTitle: "",
    category: "",
    duration: "",
    recordingId: "",
    recordingUrl: "",
  })

  useEffect(() => {
    fetchEvent()
  }, [eventId])

  const fetchEvent = async () => {
    try {
      const res = await authenticatedFetch(`/api/admin/live-events/${eventId}`)
      const data = await res.json()

      if (data.success && data.event) {
        setEvent(data.event)
        setFormData({
          title: data.event.title,
          slug: data.event.slug,
          description: data.event.description || "",
          scheduledAt: data.event.scheduledAt
            ? new Date(data.event.scheduledAt).toISOString().slice(0, 16)
            : "",
          status: data.event.status,
          published: data.event.published,
          active: data.event.active,
          playbackUrl: data.event.playbackUrl,
          chatEnabled: data.event.chatEnabled,
          speaker: data.event.speaker || "",
          speakerTitle: data.event.speakerTitle || "",
          category: data.event.category || "",
          duration: data.event.duration?.toString() || "",
          recordingId: data.event.recordingId || "",
          recordingUrl: data.event.recordingUrl || "",
        })
      }
    } catch (err) {
      console.error("Error fetching event:", err)
      setError("Errore nel caricamento dell'evento")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const token = await getFirebaseIdToken()
      if (!token) return

      const res = await fetch(`/api/admin/live-events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: formData.title,
          slug: formData.slug,
          description: formData.description || null,
          scheduledAt: formData.scheduledAt || null,
          status: formData.status,
          published: formData.published,
          active: formData.active,
          playbackUrl: formData.playbackUrl,
          chatEnabled: formData.chatEnabled,
          speaker: formData.speaker || null,
          speakerTitle: formData.speakerTitle || null,
          category: formData.category || null,
          duration: formData.duration ? parseInt(formData.duration) : null,
          recordingId: formData.recordingId || null,
          recordingUrl: formData.recordingUrl || null,
        }),
      })

      const data = await res.json()

      if (!data.success) {
        throw new Error(data.error || "Errore nell'aggiornamento")
      }

      fetchEvent()
    } catch (err: any) {
      console.error("Error updating event:", err)
      setError(err.message || "Errore nell'aggiornamento dell'evento")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSetActive = async () => {
    try {
      const token = await getFirebaseIdToken()
      if (!token) return

      const res = await fetch(`/api/admin/live-events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active: true }),
      })

      const data = await res.json()
      if (data.success) {
        fetchEvent()
      }
    } catch (err) {
      console.error("Error setting active:", err)
    }
  }

  if (isLoading) {
    return (
      <AdminRequired>
        <div className="container mx-auto py-8">
          <p className="text-center">Caricamento...</p>
        </div>
      </AdminRequired>
    )
  }

  if (!event) {
    return (
      <AdminRequired>
        <div className="container mx-auto py-8">
          <p className="text-center text-destructive">Evento non trovato</p>
        </div>
      </AdminRequired>
    )
  }

  return (
    <AdminRequired>
      <div className="container mx-auto py-8">
        <DemoModeBanner />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Modifica Evento Live
                </CardTitle>
                <CardDescription>Gestisci i dettagli dell'evento</CardDescription>
              </div>
              <div className="flex gap-2">
                {event.published && event.slug && (
                  <Button
                    variant="outline"
                    onClick={() => window.open(`/live/${event.slug}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Link Pubblico
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => router.push("/admin/live")}
                >
                  Studio Broadcast
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="title">Titolo *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Descrizione</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  maxLength={5000}
                />
              </div>

              <div>
                <Label htmlFor="playbackUrl">Playback URL</Label>
                <Input
                  id="playbackUrl"
                  type="url"
                  value={formData.playbackUrl}
                  onChange={(e) => setFormData({ ...formData, playbackUrl: e.target.value })}
                  placeholder="https://..."
                  readOnly
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Questo URL viene normalizzato automaticamente all'URL del canale corrente quando l'evento viene attivato.
                </p>
              </div>

              <div>
                <Label htmlFor="scheduledAt">Data/Ora Programmata</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="ended">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="published"
                  checked={formData.published}
                  onCheckedChange={(checked) => setFormData({ ...formData, published: checked })}
                />
                <Label htmlFor="published">Pubblicato</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Attivo (solo uno alla volta)</Label>
              </div>

              <div>
                <Label htmlFor="speaker">Relatore</Label>
                <Input
                  id="speaker"
                  value={formData.speaker}
                  onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                  placeholder="Es. Dr. Elena Rossi"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="speakerTitle">Titolo Relatore</Label>
                <Input
                  id="speakerTitle"
                  value={formData.speakerTitle}
                  onChange={(e) => setFormData({ ...formData, speakerTitle: e.target.value })}
                  placeholder="Es. Neuroscienziata Cognitiva"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Es. Neuroscienza"
                  maxLength={100}
                />
              </div>

              <div>
                <Label htmlFor="duration">Durata (minuti)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                  placeholder="Es. 90"
                />
              </div>

              <div>
                <Label htmlFor="recordingId">Recording ID (IVS)</Label>
                <Input
                  id="recordingId"
                  value={formData.recordingId}
                  onChange={(e) => setFormData({ ...formData, recordingId: e.target.value })}
                  placeholder="ID documento ivs_recordings"
                />
              </div>

              <div>
                <Label htmlFor="recordingUrl">Recording URL (Replay)</Label>
                <Input
                  id="recordingUrl"
                  type="url"
                  value={formData.recordingUrl}
                  onChange={(e) => setFormData({ ...formData, recordingUrl: e.target.value })}
                  placeholder="https://... (HLS o CloudFront)"
                />
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="chatEnabled"
                  checked={formData.chatEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, chatEnabled: checked })}
                />
                <Label htmlFor="chatEnabled">Chat abilitata</Label>
              </div>

              {error && (
                <div className="text-sm text-destructive">{error}</div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Salvataggio..." : "Salva"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSetActive}
                  disabled={formData.active}
                >
                  Rendi Attivo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Indietro
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminRequired>
  )
}

