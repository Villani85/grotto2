"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  FiMail,
  FiMapPin,
  FiGlobe,
  FiTwitter,
  FiLinkedin,
  FiInstagram,
  FiFacebook,
  FiUser,
  FiAward,
  FiCalendar,
  FiTrendingUp,
  FiExternalLink,
} from "react-icons/fi"
import { Trophy } from "lucide-react"
import { getPeriodId } from "@/lib/neurocredits-rules"
import Link from "next/link"

interface PublicProfile {
  uid: string
  nickname: string
  bio?: string
  location?: string
  website?: string
  publicEmail?: boolean
  interests?: string[]
  socialLinks?: {
    twitter?: string
    linkedin?: string
    instagram?: string
    facebook?: string
  }
  avatarUrl?: string | null
}

interface DerivedStats {
  neuroCredits_total: number
  neuroCredits_month_current: number
  level: {
    levelId: number
    title: string
    minPoints: number
    nextLevelPoints: number | null
    pointsToNext: number
  }
  rank: {
    all_time: number | null
    month_current: number | null
  }
}

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const uid = params?.uid as string

  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null)
  const [derivedStats, setDerivedStats] = useState<DerivedStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (uid) {
      loadProfile()
    }
  }, [uid])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/profile/${uid}`)
      if (res.ok) {
        const data = await res.json()
        setPublicProfile(data.publicProfile)
        setDerivedStats(data.derivedStats)
      } else {
        console.error("Error loading profile:", res.statusText)
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    } finally {
      setLoading(false)
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

  const formatRank = (rank: number | null) => {
    if (rank === null) {
      return "Fuori dalla top 200"
    }
    return `#${rank}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#005FD7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Caricamento profilo...</p>
        </div>
      </div>
    )
  }

  if (!publicProfile) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Profilo non trovato</p>
          <Button onClick={() => router.push("/bacheca")}>Torna alla Bacheca</Button>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.uid === publicProfile.uid
  const currentMonth = getPeriodId()

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Profilo Pubblico</h1>
          <p className="text-muted-foreground">Visualizza il profilo di {publicProfile.nickname}</p>
        </div>
        {isOwnProfile && (
          <Button onClick={() => router.push("/area-riservata/profile")} variant="outline">
            Modifica Profilo
          </Button>
        )}
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <Avatar className="w-32 h-32">
                <AvatarImage src={publicProfile.avatarUrl || undefined} alt={publicProfile.nickname} />
                <AvatarFallback className="text-4xl">{getInitials(publicProfile.nickname)}</AvatarFallback>
              </Avatar>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{publicProfile.nickname}</h2>
                {publicProfile.bio && <p className="text-muted-foreground">{publicProfile.bio}</p>}
              </div>

              {/* NeuroCredits Box */}
              {derivedStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-to-br from-[#005FD7]/20 to-purple-600/20 rounded-lg border border-[#005FD7]/30">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FiAward className="h-4 w-4 text-[#005FD7]" />
                      <span className="text-sm text-muted-foreground">Livello</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-[#005FD7] text-white">{derivedStats.level.levelId}</Badge>
                      <span className="font-semibold">{derivedStats.level.title}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground">NeuroCredits</span>
                    </div>
                    <p className="text-xl font-bold">{derivedStats.neuroCredits_total.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Questo mese: {derivedStats.neuroCredits_month_current}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <FiTrendingUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm text-muted-foreground">Classifica</span>
                    </div>
                    <p className="text-sm font-semibold">All-time: {formatRank(derivedStats.rank.all_time)}</p>
                    <p className="text-sm font-semibold">Mese: {formatRank(derivedStats.rank.month_current)}</p>
                  </div>
                </div>
              )}

              {/* Link to Leaderboard */}
              {derivedStats && (
                <Link href={`/neurocredits?period=${currentMonth}&metric=neuroCredits`}>
                  <Button variant="outline" className="w-full md:w-auto">
                    <FiExternalLink className="h-4 w-4 mr-2" />
                    Vedi Leaderboard
                  </Button>
                </Link>
              )}

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {publicProfile.location && (
                  <div className="flex items-center gap-2">
                    <FiMapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{publicProfile.location}</span>
                  </div>
                )}
                {publicProfile.website && (
                  <div className="flex items-center gap-2">
                    <FiGlobe className="h-4 w-4 text-muted-foreground" />
                    <a href={publicProfile.website} target="_blank" rel="noopener noreferrer" className="hover:text-[#005FD7]">
                      {publicProfile.website}
                    </a>
                  </div>
                )}
                {publicProfile.publicEmail && publicProfile.uid && (
                  <div className="flex items-center gap-2">
                    <FiMail className="h-4 w-4 text-muted-foreground" />
                    <span>{/* Email would be here if available */}</span>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {publicProfile.socialLinks && Object.values(publicProfile.socialLinks).some((link) => link) && (
                <div className="flex gap-3">
                  {publicProfile.socialLinks.twitter && (
                    <a
                      href={publicProfile.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#1DA1F2] transition-colors"
                    >
                      <FiTwitter className="h-5 w-5" />
                    </a>
                  )}
                  {publicProfile.socialLinks.linkedin && (
                    <a
                      href={publicProfile.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#0077B5] transition-colors"
                    >
                      <FiLinkedin className="h-5 w-5" />
                    </a>
                  )}
                  {publicProfile.socialLinks.instagram && (
                    <a
                      href={publicProfile.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#E4405F] transition-colors"
                    >
                      <FiInstagram className="h-5 w-5" />
                    </a>
                  )}
                  {publicProfile.socialLinks.facebook && (
                    <a
                      href={publicProfile.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-[#1877F2] transition-colors"
                    >
                      <FiFacebook className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}

              {/* Interests */}
              {publicProfile.interests && publicProfile.interests.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Interessi</h3>
                  <div className="flex flex-wrap gap-2">
                    {publicProfile.interests.map((interest, index) => (
                      <Badge key={index} variant="outline">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

