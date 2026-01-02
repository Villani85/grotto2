"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { FiPlay, FiCalendar, FiClock, FiUser, FiFilter, FiSearch } from "react-icons/fi"
import { useAuth } from "@/context/AuthContext"

interface LiveEvent {
  id: string
  title: string
  slug: string
  description?: string
  scheduledAt: string | null
  startedAt: string | null
  endedAt: string | null
  status: "draft" | "scheduled" | "live" | "ended"
  speaker?: string
  speakerTitle?: string
  category?: string
  duration?: number
  recordingId?: string
  recordingUrl?: string
  playbackUrl?: string
}

export default function LiveEventsPage() {
  const { user } = useAuth()
  const [filter, setFilter] = useState<"all" | "upcoming" | "live" | "ended">("all")
  const [search, setSearch] = useState("")
  const [events, setEvents] = useState<LiveEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [filter])

  const fetchEvents = async () => {
    try {
      setIsLoading(true)
      const statusParam = filter !== "all" ? filter : null
      const url = statusParam
        ? `/api/live-events?status=${statusParam}`
        : "/api/live-events"

      const res = await fetch(url, { cache: "no-store" })
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

  const filteredEvents = events.filter((event) => {
    if (
      search &&
      !event.title.toLowerCase().includes(search.toLowerCase()) &&
      !event.description?.toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "live":
        return "bg-red-500 text-white"
      case "scheduled":
        return "bg-[#005FD7] text-white"
      case "ended":
        return "bg-blue-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case "live":
        return "IN DIRETTA"
      case "scheduled":
        return "PROSSIMAMENTE"
      case "ended":
        return "REGISTRATO"
      default:
        return ""
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    return date.toLocaleDateString("it-IT", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  const formatTime = (dateString: string | null) => {
    if (!dateString) return "—"
    const date = new Date(dateString)
    return date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getEventUrl = (event: LiveEvent) => {
    if (event.status === "live" || event.status === "scheduled") {
      return `/live/${event.slug}`
    }
    if (event.status === "ended" && (event.recordingUrl || event.recordingId)) {
      return `/area-riservata/live/${event.id}`
    }
    return null
  }

  // Trova la live attiva
  const activeLiveEvent = events.find((event) => event.status === "live")

  return (
    <div className="space-y-8">
      {/* Banner Live Attiva */}
      {activeLiveEvent && (
        <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 rounded-2xl p-6 border-2 border-red-500 animate-pulse">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold animate-pulse">
                  🔴 LIVE ORA
                </span>
                <h2 className="text-2xl font-bold text-white">{activeLiveEvent.title}</h2>
              </div>
              {activeLiveEvent.description && (
                <p className="text-gray-200 mb-3">{activeLiveEvent.description}</p>
              )}
              {activeLiveEvent.speaker && (
                <p className="text-sm text-gray-300">
                  Con <span className="font-semibold">{activeLiveEvent.speaker}</span>
                  {activeLiveEvent.speakerTitle && ` - ${activeLiveEvent.speakerTitle}`}
                </p>
              )}
            </div>
            <Link
              href={`/live/${activeLiveEvent.slug}`}
              className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-lg font-bold transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
            >
              <FiPlay className="text-2xl" />
              Partecipa Ora
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Eventi Live</h1>
            <p className="text-gray-400">
              Partecipa a sessioni live con esperti di neuroscienza, psicologia e performance. Interagisci in tempo reale e
              fai domande direttamente ai relatori.
            </p>
          </div>
          {user?.isAdmin && (
            <Link
              href="/admin/live-events"
              className="px-4 py-2 bg-[#005FD7] hover:bg-[#0051b8] rounded-lg text-sm font-medium transition-colors"
            >
              Gestisci Eventi
            </Link>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FiSearch className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Cerca eventi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:border-[#005FD7] focus:ring-2 focus:ring-[#005FD7]/20 focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          {(["all", "upcoming", "live", "ended"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                filter === status
                  ? "bg-[#005FD7] border-[#005FD7] text-white"
                  : "bg-gray-900 border-gray-800 text-gray-300 hover:border-gray-700"
              }`}
            >
              {status === "all"
                ? "Tutti"
                : status === "upcoming"
                  ? "Prossimi"
                  : status === "live"
                    ? "In Diretta"
                    : "Registrati"}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Caricamento eventi...</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiFilter className="text-gray-500 text-2xl" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Nessun evento trovato</h3>
          <p className="text-gray-400">Prova a modificare i filtri o la ricerca per trovare eventi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => {
            const eventUrl = getEventUrl(event)
            return (
              <div
                key={event.id}
                className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden hover:border-[#005FD7]/50 transition-all group"
              >
                {/* Event Header */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(event.status)}`}>
                      {getStatusText(event.status)}
                    </span>
                    {event.category && <span className="text-sm text-gray-400">{event.category}</span>}
                  </div>

                  <h3 className="text-xl font-semibold mb-3 group-hover:text-[#005FD7] transition-colors">{event.title}</h3>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description || "Nessuna descrizione"}</p>

                  {/* Event Details */}
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <FiCalendar className="text-gray-500 mr-3" />
                      <span className="text-gray-300">{formatDate(event.scheduledAt)}</span>
                      {event.scheduledAt && (
                        <>
                          <span className="mx-2 text-gray-600">•</span>
                          <FiClock className="text-gray-500 mr-3" />
                          <span className="text-gray-300">{formatTime(event.scheduledAt)}</span>
                        </>
                      )}
                      {event.duration && (
                        <>
                          <span className="mx-2 text-gray-600">•</span>
                          <span className="text-gray-300">({event.duration} min)</span>
                        </>
                      )}
                    </div>

                    {event.speaker && (
                      <div className="flex items-center text-sm">
                        <FiUser className="text-gray-500 mr-3" />
                        <div>
                          <div className="text-gray-300">{event.speaker}</div>
                          {event.speakerTitle && (
                            <div className="text-gray-500 text-xs">{event.speakerTitle}</div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                      {eventUrl ? (
                        <Link
                          href={eventUrl}
                          className="flex items-center px-4 py-2 bg-[#005FD7] hover:bg-[#0051b8] rounded-lg text-sm font-medium transition-colors"
                        >
                          <FiPlay className="mr-2" />
                          {event.status === "ended" ? "Guarda Replay" : event.status === "live" ? "Guarda Live" : "Partecipa"}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">Replay non disponibile</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upcoming Events Info */}
      <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold mb-4">Come Partecipare agli Eventi Live</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="text-[#005FD7] font-semibold">1. Prenotazione</div>
            <p className="text-gray-400 text-sm">
              Iscriviti agli eventi in anticipo per ricevere promemoria e prepararti al meglio.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-[#005FD7] font-semibold">2. Partecipazione</div>
            <p className="text-gray-400 text-sm">
              Accedi alla piattaforma 5 minuti prima dell'orario stabilito. Interagisci con chat live e Q&A.
            </p>
          </div>
          <div className="space-y-2">
            <div className="text-[#005FD7] font-semibold">3. Replay</div>
            <p className="text-gray-400 text-sm">
              Tutti gli eventi vengono registrati e sono disponibili nella sezione "Registrati" dopo la diretta.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
