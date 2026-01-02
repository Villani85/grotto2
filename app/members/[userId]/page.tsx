"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FiMail, FiMapPin, FiGlobe, FiTwitter, FiLinkedin, FiInstagram, FiFacebook, FiUser, FiAward, FiCalendar } from "react-icons/fi"
import { getUserFromFirestore } from "@/lib/firestore-client"
import type { User } from "@/lib/types"

export default function PublicProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const userId = params?.userId as string
  
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isStartingConversation, setIsStartingConversation] = useState(false)

  useEffect(() => {
    if (userId) {
      loadUserProfile()
    }
  }, [userId])

  const loadUserProfile = async () => {
    try {
      setLoading(true)
      const user = await getUserFromFirestore(userId)
      if (user) {
        setProfileUser(user)
      } else {
        // Try API fallback
        const res = await fetch(`/api/users/${userId}`)
        if (res.ok) {
          const data = await res.json()
          setProfileUser(data)
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartConversation = async () => {
    if (!currentUser || !profileUser || isStartingConversation) return

    setIsStartingConversation(true)
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: [currentUser.uid, profileUser.uid],
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Redirect to messages page with conversation selected
        router.push(`/area-riservata/messages?conversation=${data.data.id}`)
      } else {
        alert("Errore nell'avviare la conversazione")
      }
    } catch (error) {
      console.error("Error starting conversation:", error)
      alert("Errore nell'avviare la conversazione")
    } finally {
      setIsStartingConversation(false)
    }
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

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Profilo non trovato</p>
          <Button onClick={() => router.push("/area-riservata/community")}>
            Torna alla Community
          </Button>
        </div>
      </div>
    )
  }

  const isOwnProfile = currentUser?.uid === profileUser.uid

  return (
    <div className="py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Profilo Pubblico</h1>
          <p className="text-muted-foreground">Visualizza il profilo di {profileUser.nickname}</p>
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
              <div className="w-32 h-32 rounded-full bg-gray-700 flex items-center justify-center">
                {profileUser.avatarUrl ? (
                  <img 
                    src={profileUser.avatarUrl} 
                    alt={profileUser.nickname} 
                    className="w-full h-full rounded-full object-cover" 
                  />
                ) : (
                  <FiUser className="h-16 w-16 text-gray-400" />
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-2xl font-bold mb-1">{profileUser.nickname}</h2>
                {profileUser.bio && (
                  <p className="text-muted-foreground mt-2">{profileUser.bio}</p>
                )}
              </div>

              {/* Public Info */}
              <div className="flex flex-wrap gap-4 text-sm">
                {profileUser.location && (
                  <div className="flex items-center gap-2">
                    <FiMapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{profileUser.location}</span>
                  </div>
                )}
                {profileUser.website && (
                  <div className="flex items-center gap-2">
                    <FiGlobe className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={profileUser.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#005FD7] hover:underline"
                    >
                      Sito Web
                    </a>
                  </div>
                )}
                {profileUser.publicEmail && profileUser.email && (
                  <div className="flex items-center gap-2">
                    <FiMail className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`mailto:${profileUser.email}`}
                      className="text-[#005FD7] hover:underline"
                    >
                      {profileUser.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Social Links */}
              {profileUser.socialLinks && (
                <div className="flex gap-3">
                  {profileUser.socialLinks.twitter && (
                    <a
                      href={profileUser.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <FiTwitter className="h-5 w-5" />
                    </a>
                  )}
                  {profileUser.socialLinks.linkedin && (
                    <a
                      href={profileUser.socialLinks.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <FiLinkedin className="h-5 w-5" />
                    </a>
                  )}
                  {profileUser.socialLinks.instagram && (
                    <a
                      href={profileUser.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <FiInstagram className="h-5 w-5" />
                    </a>
                  )}
                  {profileUser.socialLinks.facebook && (
                    <a
                      href={profileUser.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
                    >
                      <FiFacebook className="h-5 w-5" />
                    </a>
                  )}
                </div>
              )}

              {/* Action Button */}
              {!isOwnProfile && currentUser && (
                <div className="pt-2">
                  <Button 
                    onClick={handleStartConversation}
                    disabled={isStartingConversation}
                    className="w-full md:w-auto"
                  >
                    <FiMail className="h-4 w-4 mr-2" />
                    {isStartingConversation ? "Apertura..." : "Scrivi a questo utente"}
                  </Button>
                </div>
              )}
              {!currentUser && (
                <div className="pt-2">
                  <Button 
                    onClick={() => router.push("/auth/login")}
                    variant="outline"
                    className="w-full md:w-auto"
                  >
                    Accedi per scrivere
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats & Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <FiAward className="h-6 w-6 text-yellow-500" />
              <div className="text-sm text-muted-foreground">Punti Totali</div>
            </div>
            <div className="text-2xl font-bold">{profileUser.pointsTotal || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <FiCalendar className="h-6 w-6 text-blue-500" />
              <div className="text-sm text-muted-foreground">Membro dal</div>
            </div>
            <div className="text-lg font-semibold">
              {profileUser.createdAt
                ? new Date(profileUser.createdAt).toLocaleDateString("it-IT", { 
                    month: "long", 
                    year: "numeric" 
                  })
                : "N/A"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-2">
              <FiUser className="h-6 w-6 text-purple-500" />
              <div className="text-sm text-muted-foreground">Stato</div>
            </div>
            <div className="text-lg font-semibold capitalize">
              {profileUser.subscriptionStatus === "active" ? "Abbonato" : "Non abbonato"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interests */}
      {profileUser.interests && profileUser.interests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interessi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profileUser.interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-800 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}





