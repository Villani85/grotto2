"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { FiTrendingUp, FiTarget, FiAward, FiCalendar, FiMessageSquare, FiMessageCircle, FiPlay, FiClock, FiBookOpen } from "react-icons/fi"
import { DashboardSkeleton } from "@/components/ui/skeleton"

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
  // Calculate level from points (1000 points per level)
  const calculateLevel = (points: number) => {
    return Math.floor(points / 1000) + 1
  }

  const calculateNextLevelPoints = (points: number) => {
    const currentLevel = calculateLevel(points)
    return currentLevel * 1000 - points
  }

  const [stats, setStats] = useState<DashboardStats>({
    totalPoints: user?.pointsTotal || 0,
    currentLevel: calculateLevel(user?.pointsTotal || 0),
    nextLevelPoints: calculateNextLevelPoints(user?.pointsTotal || 0),
    liveEventsAttended: 8,
    communityPosts: 24,
    streakDays: 14,
  })

  // Update stats when user data changes
  useEffect(() => {
    if (user) {
      setStats({
        totalPoints: user.pointsTotal || 0,
        currentLevel: calculateLevel(user.pointsTotal || 0),
        nextLevelPoints: calculateNextLevelPoints(user.pointsTotal || 0),
        liveEventsAttended: 8, // TODO: Load from Firestore
        communityPosts: 24, // TODO: Load from Firestore
        streakDays: 14, // TODO: Load from Firestore
      })
    }
  }, [user])
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
    return <DashboardSkeleton />
  }

  if (!user) {
    return null
  }

  const progressPercentage = (stats.totalPoints % 1000) / 10

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
              <div className="text-2xl font-bold">Liv. {stats.currentLevel}</div>
              <div className="text-sm text-gray-400">Il tuo livello</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Azioni Rapide</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              href={action.href}
              className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800 hover:border-[#005FD7] transition-all duration-200 hover:scale-105 hover:shadow-xl group relative overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-[#005FD7]/0 to-[#005FD7]/0 group-hover:from-[#005FD7]/5 group-hover:to-[#005FD7]/10 transition-all duration-200" />
              <div className={`w-14 h-14 ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 shadow-lg`}>
                <div className="text-white text-2xl">{action.icon}</div>
              </div>
              <h3 className="font-semibold group-hover:text-[#005FD7] transition-colors relative z-10">{action.label}</h3>
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
                <span className="font-semibold">{formatNumber(stats.totalPoints)}</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-[#005FD7] to-[#0066ff] rounded-full transition-all duration-1000 ease-out animate-progress-fill"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {1000 - (stats.totalPoints % 1000)} punti per il livello {stats.currentLevel + 1}
              </div>
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
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      event.status === "live"
                        ? "bg-red-500/20 text-red-400 animate-pulse"
                        : "bg-[#005FD7]/20 text-[#005FD7]"
                    }`}
                  >
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
            <div
              key={index}
              className="flex items-center p-4 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-all duration-200 hover:scale-[1.01] animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 bg-[#005FD7]/20 rounded-lg flex items-center justify-center mr-4 group-hover:bg-[#005FD7]/30 transition-colors">
                <div className="text-[#005FD7] text-lg">{activity.icon}</div>
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
