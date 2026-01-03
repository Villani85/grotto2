"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trophy } from "lucide-react"
import Link from "next/link"
import { getFirebaseIdToken } from "@/lib/api-helpers"

interface LeaderboardEntry {
  uid: string
  displayName: string
  avatarUrl: string | null
  neuroCredits: number
  rank: number
}

export function BachecaMiniLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setIsLoading(true)
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

      const response = await fetch("/api/leaderboard?period=monthly&metric=neuroCredits&limit=5", { headers })
      if (response.ok) {
        const data = await response.json()
        const topEntries = (data.entries || []).slice(0, 5).map((entry: any, index: number) => ({
          ...entry,
          rank: index + 1,
        }))
        setEntries(topEntries)
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setIsLoading(false)
    }
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
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          Top 5 Mese
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground">Caricamento...</p>
          </div>
        ) : entries.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nessun dato disponibile</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Link
                key={entry.uid}
                href={`/u/${entry.uid}`}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-xs font-semibold text-muted-foreground w-4">
                    #{entry.rank}
                  </span>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={entry.avatarUrl || undefined} alt={entry.displayName} />
                    <AvatarFallback className="text-xs">{getInitials(entry.displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium truncate">{entry.displayName}</span>
                </div>
                <span className="text-xs font-semibold text-[#005FD7]">{entry.neuroCredits}</span>
              </Link>
            ))}
          </div>
        )}
        <Link href="/neurocredits">
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              Vedi classifica completa →
            </p>
          </div>
        </Link>
      </CardContent>
    </Card>
  )
}
