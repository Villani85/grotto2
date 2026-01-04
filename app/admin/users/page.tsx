"use client"

import { useState, useEffect } from "react"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, UserCog, CheckCircle2, XCircle, Crown } from "lucide-react"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import type { User } from "@/lib/types"

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    filterUsers()
  }, [users, searchQuery, filterStatus])

  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      
      // Try to load from Firestore first
      try {
        const { getAllUsersFromFirestore } = await import("@/lib/firestore-users")
        const firestoreUsers = await getAllUsersFromFirestore()
        console.log("[Admin Users] Firestore users loaded:", firestoreUsers.length)
        
        // Always use Firestore data if available (even if empty, it's real data)
        // Only fallback to API if Firestore throws an error
        setUsers(firestoreUsers)
        setIsLoading(false)
        return
      } catch (firestoreError) {
        console.error("[Admin Users] Firestore load failed, using API fallback:", firestoreError)
      }

      // Fallback to API only if Firestore completely fails
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch("/api/admin/users", { headers })
      if (response.ok) {
        const data = await response.json()
        console.log("[Admin Users] API users loaded:", data.length)
        setUsers(data)
      } else {
        console.error("Error fetching users from API:", response.statusText)
        if (response.status === 401 || response.status === 403) {
          console.error("[Admin Users] Authentication failed - user may not be admin")
        }
      }
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.nickname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((user) => user.subscriptionStatus === filterStatus)
    }

    setFilteredUsers(filtered)
  }

  const toggleSubscription = async (userId: string, currentStatus: User["subscriptionStatus"]) => {
    const newStatus = currentStatus === "active" ? "none" : "active"
    const subscriptionEnd = newStatus === "active" 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
      : undefined

    try {
      // Try Firestore first
      try {
        const { updateUserInFirestore } = await import("@/lib/firestore-client")
        const updated = await updateUserInFirestore(userId, {
          subscriptionStatus: newStatus,
          isManualSubscription: true,
          subscriptionEnd,
        })
        if (updated) {
          console.log("[Admin] Subscription updated in Firestore")
          fetchUsers()
          return
        }
      } catch (firestoreError) {
        console.log("[Admin] Firestore update failed, using API fallback")
      }

      // Fallback to API
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          subscriptionStatus: newStatus,
          isManualSubscription: true,
          subscriptionEnd: subscriptionEnd?.toISOString(),
        }),
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Non autorizzato. Verifica di essere un amministratore.")
        }
        throw new Error("Errore durante l'aggiornamento")
      }

      fetchUsers()
    } catch (error) {
      console.error("Error updating subscription:", error)
      alert("Errore durante l'aggiornamento dell'abbonamento")
    }
  }

  const toggleAdmin = async (userId: string, currentIsAdmin: boolean) => {
    if (!confirm(`Sei sicuro di voler ${currentIsAdmin ? "rimuovere" : "assegnare"} i privilegi amministratore?`)) {
      return
    }

    try {
      // Try Firestore first
      try {
        const { updateUserInFirestore } = await import("@/lib/firestore-client")
        const updated = await updateUserInFirestore(userId, {
          isAdmin: !currentIsAdmin,
        })
        if (updated) {
          console.log("[Admin] Admin status updated in Firestore")
          fetchUsers()
          return
        }
      } catch (firestoreError) {
        console.log("[Admin] Firestore update failed, using API fallback")
      }

      // Fallback to API
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          isAdmin: !currentIsAdmin,
        }),
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Non autorizzato. Verifica di essere un amministratore.")
        }
        throw new Error("Errore durante l'aggiornamento")
      }

      fetchUsers()
    } catch (error) {
      console.error("Error updating admin status:", error)
      alert("Errore durante l'aggiornamento dei privilegi amministratore")
    }
  }

  const getStatusBadge = (status: User["subscriptionStatus"]) => {
    const variants = {
      active: "default",
      cancelled: "secondary",
      expired: "secondary",
      none: "outline",
    } as const

    return (
      <Badge variant={variants[status] || "outline"}>
        {status === "active"
          ? "Attivo"
          : status === "cancelled"
            ? "Cancellato"
            : status === "expired"
              ? "Scaduto"
              : "Nessuno"}
      </Badge>
    )
  }

  return (
    <AdminRequired>
      <div className="py-8">
        <DemoModeBanner />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gestione Utenti</h1>
          <p className="text-muted-foreground">Gestisci gli utenti e i loro abbonamenti</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Utenti Registrati
            </CardTitle>
            <CardDescription>
              Totale: {users.length} utenti | Abbonati attivi:{" "}
              {users.filter((u) => u.subscriptionStatus === "active").length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cerca per nome o email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtra per stato" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tutti</SelectItem>
                  <SelectItem value="active">Abbonati Attivi</SelectItem>
                  <SelectItem value="none">Non Abbonati</SelectItem>
                  <SelectItem value="cancelled">Cancellati</SelectItem>
                  <SelectItem value="expired">Scaduti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Punti</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessun utente trovato
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.uid}>
                          <TableCell className="font-medium">{user.nickname}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                          <TableCell>{user.pointsTotal}</TableCell>
                          <TableCell>{getStatusBadge(user.subscriptionStatus)}</TableCell>
                          <TableCell>
                            {user.isAdmin && (
                              <Badge variant="secondary" className="gap-1">
                                <Crown className="h-3 w-3" />
                                Admin
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleSubscription(user.uid, user.subscriptionStatus)}
                              >
                                {user.subscriptionStatus === "active" ? (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Disattiva
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Attiva
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant={user.isAdmin ? "destructive" : "outline"}
                                onClick={() => toggleAdmin(user.uid, user.isAdmin || false)}
                              >
                                <Crown className="h-4 w-4 mr-1" />
                                {user.isAdmin ? "Rimuovi Admin" : "Rendi Admin"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminRequired>
  )
}
