"use client"

import { useState, useEffect } from "react"
import { SubscriptionRequired } from "@/components/SubscriptionRequired"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { FiVideo, FiCalendar, FiTrendingUp, FiAward } from "react-icons/fi"
import { FaTrophy } from "react-icons/fa"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useAuth } from "@/context/AuthContext"
import { calculateLevel, getLevelName, getProgressToNextLevel } from "@/lib/neurocredits-levels"

interface LeaderboardEntry {
  rank: number
  uid: string
  displayName: string
  avatarUrl: string | null
  neuroCredits: number
  videosCompleted: number
  activeDays: number
}

interface MeSummary {
  rank: number | null
  neuroCredits: number
  videosCompleted: number
  activeDays: number
}

interface MyStats {
  neuroCredits_total: number
  neuroCredits_month_current: number
  videosCompleted_total: number
  videosCompleted_month_current: number
  activeDays_total: number
  activeDays_month_current: number
  streak_current: number
  streak_best: number
  level: {
    current: number
    name: string
    progress: {
      current: number
      next: number
      progress: number
    }
  }
}

export default function NeuroCreditsPage() {
  const { user } = useAuth()
  const [period, setPeriod] = useState<"all_time" | "monthly">("all_time")
  const [metric, setMetric] = useState<"neuroCredits" | "videosCompleted" | "activeDays">("neuroCredits")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [meSummary, setMeSummary] = useState<MeSummary | null>(null)
  const [myStats, setMyStats] = useState<MyStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchLeaderboard()
      fetchMyStats()
    }
  }, [user, period, metric])

  // Listen for post creation to refresh stats
  useEffect(() => {
    const handleRefresh = () => {
      fetchMyStats()
      fetchLeaderboard()
    }

    window.addEventListener("refreshNeuroCredits", handleRefresh)
    return () => window.removeEventListener("refreshNeuroCredits", handleRefresh)
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      
      // Get token for Authorization header (if available)
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = {}
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/leaderboard?period=${period}&metric=${metric}&limit=50`, {
        headers,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("[NeuroCredits] Error fetching leaderboard:", response.status, errorText)
        setEntries([])
        setMeSummary(null)
        return
      }
      
      const data = await response.json()
      console.log("[NeuroCredits] Leaderboard loaded:", { entries: data.entries?.length || 0, me: data.me })
      setEntries(data.entries || [])
      setMeSummary(data.me || null)
    } catch (error) {
      console.error("[NeuroCredits] Error fetching leaderboard:", error)
      setEntries([])
      setMeSummary(null)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMyStats = async () => {
    try {
      const token = await getFirebaseIdToken()
      if (!token) {
        console.warn("[NeuroCredits] No token available")
        return
      }

      const response = await fetch("/api/neurocredits/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[NeuroCredits] Error fetching stats:", response.status, errorText)
        return
      }

      const data = await response.json()
      console.log("[NeuroCredits] Stats loaded:", data)
      setMyStats(data)
    } catch (error) {
      console.error("[NeuroCredits] Error fetching my stats:", error)
    }
  }

  const getMetricValue = (entry: LeaderboardEntry) => {
    switch (metric) {
      case "neuroCredits":
        return entry.neuroCredits
      case "videosCompleted":
        return entry.videosCompleted
      case "activeDays":
        return entry.activeDays
    }
  }

  const getMetricLabel = () => {
    switch (metric) {
      case "neuroCredits":
        return "NeuroCredits"
      case "videosCompleted":
        return "Video Completati"
      case "activeDays":
        return "Giorni Attivi"
    }
  }

  const getMetricIcon = () => {
    switch (metric) {
      case "neuroCredits":
        return <FaTrophy className="h-5 w-5" />
      case "videosCompleted":
        return <FiVideo className="h-5 w-5" />
      case "activeDays":
        return <FiCalendar className="h-5 w-5" />
    }
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return <Badge className="bg-yellow-500 text-black">🥇 1°</Badge>
    }
    if (rank === 2) {
      return <Badge className="bg-gray-300 text-black">🥈 2°</Badge>
    }
    if (rank === 3) {
      return <Badge className="bg-orange-400 text-black">🥉 3°</Badge>
    }
    return <span className="text-muted-foreground">#{rank}</span>
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <SubscriptionRequired>
      <div className="py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">NeuroCredits & Leaderboard</h1>
          <p className="text-muted-foreground">Competi con la community e scala i livelli!</p>
        </div>

        {/* My Stats Card */}
        {myStats && (
          <Card className="bg-gradient-to-br from-[#005FD7]/20 to-purple-600/20 border-[#005FD7]/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FiAward className="h-5 w-5" />
                Le Tue Statistiche
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Livello</p>
                  <p className="text-2xl font-bold">{myStats.level.current}</p>
                  <p className="text-xs text-muted-foreground">{myStats.level.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">NeuroCredits</p>
                  <p className="text-2xl font-bold">{myStats.neuroCredits_total.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {period === "monthly" ? `Questo mese: ${myStats.neuroCredits_month_current}` : `Totale`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Video Completati</p>
                  <p className="text-2xl font-bold">{myStats.videosCompleted_total}</p>
                  <p className="text-xs text-muted-foreground">
                    {period === "monthly" ? `Questo mese: ${myStats.videosCompleted_month_current}` : `Totale`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Giorni Attivi</p>
                  <p className="text-2xl font-bold">{myStats.activeDays_total}</p>
                  <p className="text-xs text-muted-foreground">
                    {period === "monthly" ? `Questo mese: ${myStats.activeDays_month_current}` : `Totale`}
                  </p>
                </div>
              </div>

              {/* Level Progress */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso al Livello {myStats.level.current + 1}</span>
                  <span className="text-sm text-muted-foreground">
                    {myStats.level.progress.current.toLocaleString()} / {myStats.level.progress.next.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-[#005FD7] to-purple-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${myStats.level.progress.progress}%` }}
                  />
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Streak Attuale</p>
                  <p className="text-xl font-bold">{myStats.streak_current} giorni</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Miglior Streak</p>
                  <p className="text-xl font-bold">{myStats.streak_best} giorni</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Leaderboard Controls */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="flex items-center gap-4">
                <Select value={period} onValueChange={(value: "all_time" | "monthly") => setPeriod(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_time">Tutti i Tempi</SelectItem>
                    <SelectItem value="monthly">Questo Mese</SelectItem>
                  </SelectContent>
                </Select>

                <Tabs value={metric} onValueChange={(value) => setMetric(value as typeof metric)}>
                  <TabsList>
                    <TabsTrigger value="neuroCredits" className="flex items-center gap-2">
                      <FaTrophy className="h-4 w-4" />
                      NeuroCredits
                    </TabsTrigger>
                    <TabsTrigger value="videosCompleted" className="flex items-center gap-2">
                      <FiVideo className="h-4 w-4" />
                      Video
                    </TabsTrigger>
                    <TabsTrigger value="activeDays" className="flex items-center gap-2">
                      <FiCalendar className="h-4 w-4" />
                      Giorni
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getMetricIcon()}
              Leaderboard - {getMetricLabel()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005FD7] mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Caricamento leaderboard...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Nessun dato disponibile</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div
                    key={entry.uid}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      entry.uid === user?.uid
                        ? "bg-[#005FD7]/10 border-[#005FD7]"
                        : "bg-gray-800/30 border-gray-700 hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="w-12 text-center">{getRankBadge(entry.rank)}</div>
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.avatarUrl || undefined} alt={entry.displayName} />
                      <AvatarFallback>{getInitials(entry.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{entry.displayName}</p>
                      {entry.uid === user?.uid && (
                        <Badge variant="outline" className="mt-1">
                          Tu
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{getMetricValue(entry).toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{getMetricLabel()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* My Summary if not in top 50 */}
            {meSummary && !entries.find((e) => e.uid === user?.uid) && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-4 p-4 rounded-lg bg-[#005FD7]/10 border border-[#005FD7]">
                  <div className="w-12 text-center">
                    {meSummary.rank ? (
                      <span className="text-muted-foreground">#{meSummary.rank}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.avatarUrl || undefined} alt={user?.nickname || "Tu"} />
                    <AvatarFallback>{getInitials(user?.nickname || user?.email || "Tu")}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold">Tu</p>
                    <Badge variant="outline">Fuori dalla top 50</Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      {metric === "neuroCredits"
                        ? meSummary.neuroCredits.toLocaleString()
                        : metric === "videosCompleted"
                          ? meSummary.videosCompleted.toLocaleString()
                          : meSummary.activeDays.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{getMetricLabel()}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SubscriptionRequired>
  )
}

