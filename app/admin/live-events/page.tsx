"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Radio, Search, Plus, Edit, Trash2, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { authenticatedFetch } from "@/lib/api-helpers"
import { getFirebaseIdToken } from "@/lib/api-helpers"

interface LiveEvent {
  id: string
  title: string
  slug: string
  status: "draft" | "scheduled" | "live" | "ended"
  published: boolean
  active: boolean
  scheduledAt: string | null
  createdAt: string
}

export default function AdminLiveEventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [filteredEvents, setFilteredEvents] = useState<LiveEvent[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  useEffect(() => {
    filterEvents()
  }, [events, searchQuery])

  const fetchEvents = async () => {
    try {
      const res = await authenticatedFetch("/api/admin/live-events")
      const data = await res.json()
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events)
      } else {
        setEvents([])
      }
    } catch (error) {
      console.error("Error fetching events:", error)
      setEvents([])
    } finally {
      setIsLoading(false)
    }
  }

  const filterEvents = () => {
    let filtered = events

    if (searchQuery) {
      filtered = filtered.filter((event) =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    setFilteredEvents(filtered)
  }

  const togglePublished = async (eventId: string, currentStatus: boolean) => {
    try {
      const token = await getFirebaseIdToken()
      if (!token) return

      const res = await fetch(`/api/admin/live-events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ published: !currentStatus }),
      })

      const data = await res.json()
      if (data.success) {
        fetchEvents()
      }
    } catch (error) {
      console.error("Error toggling publish status:", error)
    }
  }

  const setActive = async (eventId: string) => {
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
        fetchEvents()
      }
    } catch (error) {
      console.error("Error setting active:", error)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm("Sei sicuro di voler eliminare questo evento?")) return

    try {
      const token = await getFirebaseIdToken()
      if (!token) return

      const res = await fetch(`/api/admin/live-events/${eventId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await res.json()
      if (data.success) {
        fetchEvents()
      }
    } catch (error) {
      console.error("Error deleting event:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "secondary",
      scheduled: "outline",
      live: "destructive",
      ended: "default",
    }
    return <Badge variant={variants[status] || "default"}>{status}</Badge>
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
                  Eventi Live
                </CardTitle>
                <CardDescription>Gestisci gli eventi live pubblicabili</CardDescription>
              </div>
              <Button onClick={() => router.push("/admin/live-events/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Nuovo Evento
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Cerca eventi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Caricamento...</p>
            ) : filteredEvents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Nessun evento trovato</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titolo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pubblicato</TableHead>
                    <TableHead>Attivo</TableHead>
                    <TableHead>Programmato</TableHead>
                    <TableHead>Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.title}</TableCell>
                      <TableCell>{getStatusBadge(event.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePublished(event.id, event.published)}
                        >
                          {event.published ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {event.active ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActive(event.id)}
                          >
                            Attiva
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {event.scheduledAt
                          ? new Date(event.scheduledAt).toLocaleString("it-IT")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/admin/live-events/${event.id}`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEvent(event.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminRequired>
  )
}


