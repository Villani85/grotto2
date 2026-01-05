"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FiSend, FiSearch, FiUser, FiMessageCircle } from "react-icons/fi"
import type { Conversation, Message } from "@/lib/types"
import { mockUsers } from "@/lib/mock/data"
import { getFirebaseIdToken } from "@/lib/api-helpers"

export default function MessagesPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showUserSearch, setShowUserSearch] = useState(true) // Mostra sempre la lista membri

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  const loadConversations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/conversations?userId=${user?.uid}`)
      if (res.ok) {
        const data = await res.json()
        setConversations(data.data || [])
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadMessages = useCallback(async () => {
    if (!selectedConversation) return

    try {
      const res = await fetch(`/api/messages?conversationId=${selectedConversation.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.data || [])
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }, [selectedConversation])

  const loadAllUsers = useCallback(async () => {
    try {
      console.log("[Messages] 📥 Loading all users...")
      
      // Get Firebase ID token
      const token = await getFirebaseIdToken()
      if (!token) {
        console.warn("[Messages] ⚠️ No token available, using mock data")
        setAllUsers(mockUsers)
        return
      }

      // Call API route (server-side, uses Admin SDK)
      const response = await fetch("/api/users?limit=200", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        if (data.users && data.users.length > 0) {
          console.log("[Messages] ✅ Loaded", data.users.length, "users from API")
          // Map API response to User type
          const mappedUsers = data.users.map((u: any) => ({
            uid: u.uid,
            email: u.email || "",
            nickname: u.nickname || "User",
            avatarUrl: u.avatarUrl || null,
            bio: u.bio || null,
            location: u.location || null,
            pointsTotal: 0,
            subscriptionStatus: "none" as const,
            isAdmin: false,
            marketingOptIn: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          }))
          setAllUsers(mappedUsers)
          return
        }
      } else {
        console.error("[Messages] ❌ API error:", response.status, response.statusText)
      }

      // Fallback to mock
      console.log("[Messages] ⚠️ No users from API, using mock data")
      setAllUsers(mockUsers)
    } catch (error) {
      console.error("[Messages] ❌ Error loading users:", error)
      setAllUsers(mockUsers)
    }
  }, [])

  useEffect(() => {
    if (user) {
      loadConversations()
      loadAllUsers()
    }
  }, [user, loadConversations, loadAllUsers])

  useEffect(() => {
    if (selectedConversation) {
      loadMessages()
    }
  }, [selectedConversation, loadMessages])

  // Check URL for conversation parameter
  useEffect(() => {
    if (typeof window !== "undefined" && user) {
      const params = new URLSearchParams(window.location.search)
      const conversationId = params.get("conversation")
      if (conversationId && conversations.length > 0) {
        const conv = conversations.find((c) => c.id === conversationId)
        if (conv) {
          setSelectedConversation(conv)
        }
      }
    }
  }, [conversations, user])

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return

    const otherUserId = selectedConversation.participantIds.find((id) => id !== user.uid)
    if (!otherUserId) return

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          fromUserId: user.uid,
          toUserId: otherUserId,
          content: newMessage,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setMessages([...messages, data.data])
        setNewMessage("")
        loadConversations() // Refresh to update last message
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const getOtherUser = (conversation: Conversation) => {
    if (!user) return null
    const otherUserId = conversation.participantIds.find((id) => id !== user.uid)
    return allUsers.find((u) => u.uid === otherUserId) || mockUsers.find((u) => u.uid === otherUserId)
  }

  const handleStartConversation = async (otherUserId: string) => {
    if (!user || otherUserId === user.uid) {
      console.warn("[Messages] ⚠️ Cannot start conversation with self")
      return
    }

    const otherUser = allUsers.find((u) => u.uid === otherUserId)
    console.log("[Messages] 💬 Starting conversation with:", {
      otherUserId,
      otherUserNickname: otherUser?.nickname || otherUser?.email,
      currentUserId: user.uid,
    })

    try {
      const requestBody = {
        participantIds: [user.uid, otherUserId],
      }
      console.log("[Messages] 📤 Sending conversation creation request:", requestBody)
      
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })
      
      console.log("[Messages] 📥 Response status:", res.status, res.statusText)

      if (res.ok) {
        const data = await res.json()
        console.log("[Messages] ✅ Conversation created:", data.data.id)
        setSelectedConversation(data.data)
        setSearchQuery("") // Clear search but keep user list visible
        await loadConversations()
        // Update URL without reload
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href)
          url.searchParams.set("conversation", data.data.id)
          window.history.pushState({}, "", url.toString())
        }
      } else {
        const errorData = await res.json()
        console.error("[Messages] ❌ Failed to create conversation:", errorData)
        alert(`Errore: ${errorData.error || "Impossibile avviare la conversazione"}`)
      }
    } catch (error: any) {
      console.error("[Messages] ❌ Error starting conversation:", error)
      alert("Errore nell'avviare la conversazione")
    }
  }

  const filteredUsers = allUsers
    .filter((u) => u.uid !== user?.uid) // Exclude current user
    .filter((u) => {
      if (!searchQuery.trim()) return true // Show all if no search
      const query = searchQuery.toLowerCase()
      return (
        u.nickname?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.bio?.toLowerCase().includes(query)
      )
    })
    .sort((a, b) => {
      // Sort by nickname or email
      const nameA = (a.nickname || a.email || "").toLowerCase()
      const nameB = (b.nickname || b.email || "").toLowerCase()
      return nameA.localeCompare(nameB)
    })

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#005FD7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Caricamento messaggi...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Messaggi</h1>
        <p className="text-muted-foreground">Chatta privatamente con altri membri</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {/* Members List & Conversations */}
        <div className="lg:col-span-1 space-y-4 overflow-y-auto">
          {/* All Members Section */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-3">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <FiUser className="h-4 w-4" />
                  Tutti i Membri
                </h3>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cerca per nome o email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {searchQuery ? "Nessun utente trovato" : "Caricamento membri..."}
                  </p>
                ) : (
                  filteredUsers.map((u) => (
                    <div
                      key={u.uid}
                      className="flex items-center gap-3 p-3 hover:bg-gray-800 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-700"
                      onClick={() => handleStartConversation(u.uid)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                        {u.avatarUrl ? (
                          <img src={u.avatarUrl} alt={u.nickname} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="text-sm font-semibold">
                            {(u.nickname || u.email || "U").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{u.nickname || u.email}</div>
                        {u.nickname && (
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        )}
                        {u.bio && (
                          <div className="text-xs text-muted-foreground truncate mt-1">{u.bio.substring(0, 40)}...</div>
                        )}
                      </div>
                      <FiMessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Existing Conversations */}
          <div>
            <h3 className="font-semibold mb-2 px-2 flex items-center gap-2">
              <FiMessageCircle className="h-4 w-4" />
              Conversazioni
            </h3>
            {conversations.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">Nessuna conversazione ancora</p>
                  <p className="text-xs text-muted-foreground mt-2">Clicca su un membro sopra per iniziare</p>
                </CardContent>
              </Card>
            ) : (
              conversations.map((conv) => {
                const otherUser = getOtherUser(conv)
                return (
                  <Card
                    key={conv.id}
                    className={`cursor-pointer hover:bg-gray-800 transition-colors mb-2 ${
                      selectedConversation?.id === conv.id ? "bg-gray-800 border-[#005FD7]" : ""
                    }`}
                    onClick={() => setSelectedConversation(conv)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                          {otherUser?.avatarUrl ? (
                            <img src={otherUser.avatarUrl} alt={otherUser.nickname} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <FiUser className="text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold truncate text-sm">{otherUser?.nickname || "Utente"}</div>
                          {conv.lastMessageAt && (
                            <div className="text-xs text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleDateString("it-IT", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              {/* Messages List */}
              <Card className="flex-1 mb-4 overflow-hidden flex flex-col">
                <CardContent className="p-4 border-b border-gray-800">
                  <div className="font-semibold">
                    {getOtherUser(selectedConversation)?.nickname || "Utente"}
                  </div>
                </CardContent>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => {
                    const isFromMe = msg.fromUserId === user.uid
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isFromMe ? "bg-[#005FD7] text-white" : "bg-gray-800"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <div className={`text-xs mt-1 ${isFromMe ? "text-blue-100" : "text-muted-foreground"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Scrivi un messaggio..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <FiSend className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <Card className="flex-1">
              <CardContent className="p-8 text-center flex items-center justify-center h-full">
                <div>
                  <p className="text-muted-foreground">Seleziona una conversazione per iniziare a chattare</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

