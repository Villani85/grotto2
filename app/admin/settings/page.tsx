"use client"

import { useState, useEffect } from "react"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Eye, CreditCard } from "lucide-react"
import type { AdminSettings } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { getFirebaseIdToken } = await import("@/lib/api-helpers")
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch("/api/admin/settings", { headers })
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!settings) return

    setIsSaving(true)
    try {
      const { getFirebaseIdToken } = await import("@/lib/api-helpers")
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify(settings),
      })
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Non autorizzato. Verifica di essere un amministratore.")
        }
        throw new Error("Errore durante il salvataggio")
      }

      toast({
        title: "Impostazioni salvate",
        description: "Le modifiche sono state applicate con successo",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Errore",
        description: "Impossibile salvare le impostazioni",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AdminRequired>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
        </div>
      </AdminRequired>
    )
  }

  return (
    <AdminRequired>
      <div className="py-8 max-w-4xl">
        <DemoModeBanner />

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Impostazioni Globali</h1>
          <p className="text-muted-foreground">Configura le funzionalità della piattaforma</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Visibilità Community
              </CardTitle>
              <CardDescription>Controlla chi può accedere alla sezione Community</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="community-visibility">Accesso Community</Label>
                  <Select
                    value={settings?.communityVisibility}
                    onValueChange={(value: AdminSettings["communityVisibility"]) =>
                      setSettings((prev) => (prev ? { ...prev, communityVisibility: value } : null))
                    }
                  >
                    <SelectTrigger id="community-visibility" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="subscribers_only">Solo Abbonati</SelectItem>
                      <SelectItem value="authenticated">Tutti gli Utenti Registrati</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {settings?.communityVisibility === "subscribers_only"
                      ? "Solo gli utenti con abbonamento attivo possono accedere alla community"
                      : "Tutti gli utenti registrati possono accedere alla community"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Piani di Abbonamento
              </CardTitle>
              <CardDescription>Configura quali piani sono disponibili per l'acquisto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="billing-plans">Piani Disponibili</Label>
                  <Select
                    value={settings?.billingPlansEnabled}
                    onValueChange={(value: AdminSettings["billingPlansEnabled"]) =>
                      setSettings((prev) => (prev ? { ...prev, billingPlansEnabled: value } : null))
                    }
                  >
                    <SelectTrigger id="billing-plans" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yearly_only">Solo Piano Annuale</SelectItem>
                      <SelectItem value="monthly_and_yearly">Piano Mensile e Annuale</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {settings?.billingPlansEnabled === "yearly_only"
                      ? "Solo il piano annuale sarà disponibile sulla pagina abbonamento"
                      : "Entrambi i piani mensile e annuale saranno disponibili"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Salvataggio...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </AdminRequired>
  )
}
