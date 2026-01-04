"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FiTrendingUp, FiTarget, FiAward, FiCalendar, FiMessageSquare, FiMessageCircle, FiPlay, FiClock, FiBookOpen } from "react-icons/fi"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { Skeleton } from "@/components/ui/skeleton"

// Helper function to format numbers consistently (avoid hydration mismatch)
const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
}

interface DashboardStats {
  totalPoints: number
  currentLevel: number
  nextLevelPoints: number
  liveEventsAttended: number
  communityPosts: number
  streakDays: number
}

interface LevelInfo {
  current: number
  name: string
  progress: {
    current: number
    next: number
    progress: number
  }
}

interface LiveEvent {
  id: string
  title: string
  description: string
  date: string
  time: string
  speaker: string
  status: "upcoming" | "live" | "recorded"
}

export default function DashboardPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [levelInfo, setLevelInfo] = useState<LevelInfo | null>(null)
  const [isLoadingLevel, setIsLoadingLevel] = useState(true)
  const [levelError, setLevelError] = useState<string | null>(null)

  const [stats, setStats] = useState<DashboardStats>({
    totalPoints: 0,
    currentLevel: 1,
    nextLevelPoints: 0,
    liveEventsAttended: 8,
    communityPosts: 24,
    streakDays: 14,
  })

  // Fetch level info from API
  useEffect(() => {
    const fetchLevelInfo = async () => {
      if (!user?.uid) {
        setIsLoadingLevel(false)
        return
      }

      try {
        setIsLoadingLevel(true)
        setLevelError(null)

        const token = await getFirebaseIdToken()
        if (!token) {
          setLevelError("Autenticazione richiesta")
          setIsLoadingLevel(false)
          return
        }

        const response = await fetch("/api/neurocredits/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        
        // Set level info from API
        if (data.level) {
          setLevelInfo({
            current: data.level.current,
            name: data.level.name,
            progress: data.level.progress,
          })
          
          // Update stats with API data
          setStats((prev) => ({
            ...prev,
            totalPoints: data.neuroCredits_total || 0,
            currentLevel: data.level.current,
            nextLevelPoints: data.level.progress.next - data.level.progress.current,
          }))
        }
      } catch (error) {
        console.error("[Dashboard] Error fetching level info:", error)
        setLevelError("Errore nel caricamento del livello")
      } finally {
        setIsLoadingLevel(false)
      }
    }

    fetchLevelInfo()
  }, [user?.uid])
  const [upcomingEvents, setUpcomingEvents] = useState<LiveEvent[]>([
    {
      id: "1",
      title: "Neuroplasticità: Riwire il Tuo Cervello",
      description: "Come creare nuove connessioni neurali per apprendere più velocemente",
      date: "2024-12-15",
      time: "18:00",
      speaker: "Dr. Elena Rossi",
      status: "upcoming",
    },
    {
      id: "2",
      title: "Gestione dello Stress con la Mindfulness",
      description: "Tecniche basate sulla neuroscienza per ridurre lo stress cronico",
      date: "2024-12-18",
      time: "20:30",
      speaker: "Prof. Marco Bianchi",
      status: "upcoming",
    },
  ])

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#005FD7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Caricamento dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const progressPercentage = levelInfo?.progress.progress || 0

  const quickActions = [
    { icon: <FiPlay />, label: "Guarda Live", href: "/area-riservata/live", color: "bg-[#005FD7]" },
    { icon: <FiBookOpen />, label: "Videocorsi", href: "/area-riservata/corsi", color: "bg-indigo-600" },
    { icon: <FiMessageSquare />, label: "Community", href: "/area-riservata/community", color: "bg-blue-600" },
    { icon: <FiMessageSquare />, label: "Bacheca", href: "/bacheca", color: "bg-cyan-600" },
    { icon: <FiAward />, label: "NeuroCredits", href: "/neurocredits", color: "bg-yellow-600" },
    { icon: <FiMessageCircle />, label: "Messaggi", href: "/area-riservata/messages", color: "bg-purple-600" },
    { icon: <FiTarget />, label: "Obiettivi", href: "/area-riservata/obiettivi", color: "bg-green-600" },
  ]

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 border border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bentornato, <span className="text-[#005FD7] font-semibold">{user.nickname || user.email || "Utente"}</span>!
            </h1>
            <p className="text-gray-400">Continua il tuo viaggio verso il massimo potenziale cerebrale</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.streakDays}</div>
              <div className="text-sm text-gray-400">Giorni di streak</div>
            </div>
            <div className="h-12 w-px bg-gray-800"></div>
            <div className="text-center">
              {isLoadingLevel ? (
                <>
                  <Skeleton className="h-8 w-16 mx-auto mb-1" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </>
              ) : levelError ? (
                <>
                  <div className="text-2xl font-bold text-gray-500">-</div>
                  <div className="text-sm text-gray-500">Errore</div>
                </>
              ) : levelInfo ? (
                <>
                  <div className="text-2xl font-bold">Liv. {levelInfo.current}</div>
                  <div className="text-sm text-gray-400">{levelInfo.name}</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">Liv. 1</div>
                  <div className="text-sm text-gray-400">-</div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Azioni Rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-[#005FD7] transition-all hover:scale-[1.02] group"
            >
              <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4`}>
                <div className="text-white text-xl">{action.icon}</div>
              </div>
              <h3 className="font-semibold group-hover:text-[#005FD7] transition-colors">{action.label}</h3>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Progress Card */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Progresso Livello</h3>
            <FiTrendingUp className="text-[#005FD7]" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Punti totali</span>
                {isLoadingLevel ? (
                  <Skeleton className="h-4 w-20" />
                ) : (
                  <span className="font-semibold">{formatNumber(stats.totalPoints)}</span>
                )}
              </div>
              {isLoadingLevel ? (
                <Skeleton className="h-2 w-full rounded-full" />
              ) : (
                <>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-[#005FD7] rounded-full" style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }} />
                  </div>
                  {levelInfo && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatNumber(levelInfo.progress.next - levelInfo.progress.current)} punti per il livello {levelInfo.current + 1}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-2xl font-bold text-[#005FD7]">{stats.liveEventsAttended}</div>
                <div className="text-sm text-gray-400">Live seguiti</div>
              </div>
              <div className="text-center p-3 bg-gray-800/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{stats.communityPosts}</div>
                <div className="text-sm text-gray-400">Post community</div>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Prossimi Eventi Live</h3>
            <Link href="/area-riservata/live" className="text-sm text-[#005FD7] hover:text-[#0051b8]">
              Vedi tutti →
            </Link>
          </div>
          <div className="space-y-4">
            {upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 bg-gray-800/30 rounded-lg border border-gray-700 hover:border-[#005FD7]/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold mb-1">{event.title}</h4>
                    <p className="text-sm text-gray-400 mb-2">{event.description}</p>
                    <div className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center text-gray-300">
                        <FiCalendar className="mr-2" />
                        {event.date}
                      </span>
                      <span className="flex items-center text-gray-300">
                        <FiClock className="mr-2" />
                        {event.time}
                      </span>
                      <span className="text-[#005FD7]">{event.speaker}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-[#005FD7]/20 text-[#005FD7] rounded-full text-sm">
                    {event.status === "upcoming" ? "Prossimamente" : "In diretta"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h3 className="text-lg font-semibold mb-6">Attività Recente</h3>
        <div className="space-y-4">
          {[
            {
              action: "Ha guadagnato 50 punti",
              detail: 'Completamento quiz "Neuroplasticità"',
              time: "2 ore fa",
              icon: <FiAward />,
            },
            {
              action: "Nuovo post in community",
              detail: '"Tecniche di memorizzazione avanzata"',
              time: "Ieri",
              icon: <FiMessageSquare />,
            },
            {
              action: "Partecipazione live",
              detail: "Gestione dello Stress con Mindfulness",
              time: "2 giorni fa",
              icon: <FiPlay />,
            },
            {
              action: "Livello sbloccato",
              detail: "Promosso a Livello 3",
              time: "3 giorni fa",
              icon: <FiTrendingUp />,
            },
          ].map((activity, index) => (
            <div key={index} className="flex items-center p-4 bg-gray-800/30 rounded-lg">
              <div className="w-10 h-10 bg-[#005FD7]/20 rounded-lg flex items-center justify-center mr-4">
                <div className="text-[#005FD7]">{activity.icon}</div>
              </div>
              <div className="flex-grow">
                <div className="font-medium">{activity.action}</div>
                <div className="text-sm text-gray-400">{activity.detail}</div>
              </div>
              <div className="text-sm text-gray-500">{activity.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
