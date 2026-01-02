"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { authenticatedFetch } from "@/lib/api-helpers"

export default function AdminNewLiveEventPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    scheduledAt: "",
    chatEnabled: true,
    speaker: "",
    speakerTitle: "",
    category: "",
    duration: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setFieldErrors({})

    // Client-side validation: title required
    if (!formData.title || formData.title.trim() === "") {
      setFieldErrors({ title: "Il titolo è obbligatorio" })
      setIsSubmitting(false)
      return
    }

    try {
      // Convert datetime-local to ISO datetime string
      let scheduledAtISO: string | undefined = undefined
      if (formData.scheduledAt) {
        // datetime-local format: "YYYY-MM-DDTHH:mm"
        // Convert to ISO: "YYYY-MM-DDTHH:mm:00.000Z"
        const date = new Date(formData.scheduledAt)
        if (!isNaN(date.getTime())) {
          scheduledAtISO = date.toISOString()
        }
      }

      const payload = {
        title: formData.title.trim(),
        slug: formData.slug?.trim() || undefined,
        description: formData.description?.trim() || undefined,
        scheduledAt: scheduledAtISO || undefined,
        chatEnabled: formData.chatEnabled,
        speaker: formData.speaker?.trim() || undefined,
        speakerTitle: formData.speakerTitle?.trim() || undefined,
        category: formData.category?.trim() || undefined,
        duration: formData.duration && !isNaN(parseInt(formData.duration))
          ? parseInt(formData.duration)
          : undefined,
      }

      const res = await authenticatedFetch("/api/admin/live-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      // Robust JSON parsing - never crash
      const text = await res.text()
      let data: any = null

      if (text && text.trim() !== "") {
        try {
          data = JSON.parse(text)
        } catch (parseError: any) {
          // Non-JSON response - create fallback object
          const contentType = res.headers.get("content-type") || "unknown"
          console.error("[CreateEvent] JSON parse error:", {
            status: res.status,
            statusText: res.statusText,
            contentType,
            textPreview: text.substring(0, 300),
          })
          data = {
            success: false,
            error: "NON_JSON_RESPONSE",
            message: "Server returned non-JSON response",
            raw: text.substring(0, 300),
          }
        }
      } else {
        // Empty body
        data = {
          success: false,
          error: "EMPTY_RESPONSE",
          message: "Server returned empty response",
        }
      }

      // Log in dev
      if (process.env.NODE_ENV === "development") {
        const contentType = res.headers.get("content-type") || "unknown"
        console.log("[CreateEvent] Response:", {
          status: res.status,
          contentType,
          bodyPreview: text.substring(0, 300),
        })
      }

      // Handle errors
      if (!res.ok || !data.success) {
        const errorMessage =
          data?.error || data?.message || res.statusText || `HTTP ${res.status}`
        setError(errorMessage)

        // Extract field errors if present
        if (data?.fieldErrors && Array.isArray(data.fieldErrors)) {
          const errors: Record<string, string> = {}
          data.fieldErrors.forEach((err: any) => {
            const path = err.path?.join(".") || "unknown"
            errors[path] = err.message || "Errore di validazione"
          })
          setFieldErrors(errors)
        }

        return
      }

      // Verify event ID
      if (!data.event?.id) {
        console.error("[CreateEvent] Missing event ID in response:", data)
        setError("Risposta del server incompleta")
        return
      }

      // Success - redirect
      router.push(`/admin/live-events/${data.event.id}`)
    } catch (err: any) {
      // Network errors or other unexpected errors
      console.error("[CreateEvent] Unexpected error:", err)
      setError(err.message || "Errore imprevisto nella creazione dell'evento")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminRequired>
      <div className="container mx-auto py-8">
        <DemoModeBanner />
        <Card>
          <CardHeader>
            <CardTitle>Nuovo Evento Live</CardTitle>
            <CardDescription>Crea un nuovo evento live pubblicabile</CardDescription>
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
                  className={fieldErrors.title ? "border-destructive" : ""}
                />
                {fieldErrors.title && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="slug">Slug (opzionale, generato automaticamente)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="auto-generato dal titolo"
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
                <Label htmlFor="scheduledAt">Data/Ora Programmata</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  className={fieldErrors.scheduledAt ? "border-destructive" : ""}
                />
                {fieldErrors.scheduledAt && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.scheduledAt}</p>
                )}
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

              <div className="flex items-center gap-2">
                <Switch
                  id="chatEnabled"
                  checked={formData.chatEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, chatEnabled: checked })}
                />
                <Label htmlFor="chatEnabled">Chat abilitata</Label>
              </div>

              {error && (
                <div className="text-sm text-destructive mb-2">{error}</div>
              )}

              {/* Show other field errors */}
              {Object.keys(fieldErrors).length > 0 && (
                <div className="space-y-1">
                  {Object.entries(fieldErrors)
                    .filter(([field]) => field !== "title" && field !== "scheduledAt")
                    .map(([field, message]) => (
                      <p key={field} className="text-sm text-destructive">
                        <strong>{field}:</strong> {message}
                      </p>
                    ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creazione..." : "Crea Evento"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Annulla
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminRequired>
  )
}

