"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { SubscriptionRequired } from "@/components/SubscriptionRequired"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useToast } from "@/hooks/use-toast"
import { Settings, Save, Publish, FileText } from "lucide-react"

interface NeuroCreditRule {
  points: number
  enabled: boolean
  dailyCap: number | null
  description?: string
}

interface NeuroCreditConfig {
  active: {
    versionId: string
    status: string
    createdAt: string
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>
    objectives: Array<any>
    rewards: Array<any>
  }
  draft: {
    versionId: string
    status: string
    createdAt: string
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<any>
    objectives: Array<any>
    rewards: Array<any>
  } | null
}

export default function AdminNeuroCreditsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [config, setConfig] = useState<NeuroCreditConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("rules")

  useEffect(() => {
    if (!authLoading && user) {
      if (!user.isAdmin) {
        router.push("/area-riservata/dashboard")
        return
      }
      loadConfig()
    }
  }, [user, authLoading, router])

  const loadConfig = async () => {
    try {
      setIsLoading(true)
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Token non disponibile")
      }

      const response = await fetch("/api/admin/neurocredits/config", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 403) {
          router.push("/area-riservata/dashboard")
          return
        }
        throw new Error("Errore nel caricare la configurazione")
      }

      const data = await response.json()
      setConfig(data)
    } catch (error: any) {
      console.error("Error loading config:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile caricare la configurazione",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createDraft = async () => {
    try {
      setIsSaving(true)
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Token non disponibile")
      }

      const response = await fetch("/api/admin/neurocredits/config/draft", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore nel creare la bozza")
      }

      toast({
        title: "Bozza creata",
        description: "La bozza è stata creata con successo",
      })

      loadConfig()
    } catch (error: any) {
      console.error("Error creating draft:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare la bozza",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const publishDraft = async () => {
    if (!confirm("Sei sicuro di voler pubblicare questa bozza? Sostituirà la configurazione attiva.")) {
      return
    }

    try {
      setIsSaving(true)
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Token non disponibile")
      }

      const response = await fetch("/api/admin/neurocredits/config/publish", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore nel pubblicare la bozza")
      }

      toast({
        title: "Bozza pubblicata",
        description: "La configurazione è stata pubblicata con successo",
      })

      // Clear cache and reload
      loadConfig()
    } catch (error: any) {
      console.error("Error publishing draft:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile pubblicare la bozza",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <SubscriptionRequired>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#005FD7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Caricamento configurazione...</p>
          </div>
        </div>
      </SubscriptionRequired>
    )
  }

  if (!user?.isAdmin) {
    return null
  }

  const workingConfig = config?.draft || config?.active

  return (
    <SubscriptionRequired>
      <div className="py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Configurazione NeuroCredits</h1>
            <p className="text-muted-foreground">
              Gestisci regole, livelli, obiettivi e premi del sistema NeuroCredits
            </p>
          </div>
          <div className="flex gap-2">
            {!config?.draft && (
              <Button onClick={createDraft} disabled={isSaving}>
                <FileText className="h-4 w-4 mr-2" />
                Crea Bozza
              </Button>
            )}
            {config?.draft && (
              <Button onClick={publishDraft} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                <Publish className="h-4 w-4 mr-2" />
                Pubblica Bozza
              </Button>
            )}
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Configurazione Attiva</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <p className="text-sm font-medium">Versione: {config?.active?.versionId || "default"}</p>
                <p className="text-xs text-muted-foreground">
                  Creata: {config?.active?.createdAt ? new Date(config.active.createdAt).toLocaleDateString("it-IT") : "N/A"}
                </p>
                {config?.active?.notes && (
                  <p className="text-xs text-muted-foreground">Note: {config.active.notes}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {config?.draft && (
            <Card className="border-yellow-500">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  Bozza in Lavorazione
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                    Draft
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Versione: {config.draft.versionId}</p>
                  <p className="text-xs text-muted-foreground">
                    Creata: {new Date(config.draft.createdAt).toLocaleDateString("it-IT")}
                  </p>
                  {config.draft.notes && (
                    <p className="text-xs text-muted-foreground">Note: {config.draft.notes}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabs */}
        {workingConfig && (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="rules">Regole</TabsTrigger>
              <TabsTrigger value="levels">Livelli</TabsTrigger>
              <TabsTrigger value="objectives">Obiettivi</TabsTrigger>
              <TabsTrigger value="rewards">Premi</TabsTrigger>
              <TabsTrigger value="publish">Pubblica</TabsTrigger>
            </TabsList>

            <TabsContent value="rules" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Regole Eventi</CardTitle>
                  <CardDescription>
                    Configura i punti e i limiti giornalieri per ogni tipo di evento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(workingConfig.rules || {}).map(([eventType, rule]) => (
                      <div key={eventType} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{eventType}</span>
                            <Badge variant={rule.enabled ? "default" : "secondary"}>
                              {rule.enabled ? "Abilitato" : "Disabilitato"}
                            </Badge>
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Punti</p>
                            <p className="text-lg font-bold">{rule.points}</p>
                          </div>
                          {rule.dailyCap !== null && (
                            <div className="text-right">
                              <p className="text-sm text-muted-foreground">Cap Giornaliero</p>
                              <p className="text-lg font-bold">{rule.dailyCap}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4">
                    ⚠️ La modifica delle regole richiede l'aggiornamento della bozza. Usa "Crea Bozza" per iniziare.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="levels" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Livelli</CardTitle>
                  <CardDescription>Configura i livelli e le soglie di NeuroCredits</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {workingConfig.levels?.map((level) => (
                      <div key={level.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-semibold">Livello {level.id}: {level.name}</span>
                        </div>
                        <Badge variant="outline">{level.minPoints} punti minimi</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="objectives" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Obiettivi</CardTitle>
                  <CardDescription>Configura gli obiettivi e le ricompense</CardDescription>
                </CardHeader>
                <CardContent>
                  {workingConfig.objectives?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nessun obiettivo configurato</p>
                  ) : (
                    <div className="space-y-2">
                      {workingConfig.objectives?.map((obj: any) => (
                        <div key={obj.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{obj.title}</span>
                            <Badge variant={obj.enabled ? "default" : "secondary"}>
                              {obj.enabled ? "Abilitato" : "Disabilitato"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {obj.metric} → {obj.target} in {obj.windowDays} giorni → +{obj.rewardPoints} punti
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rewards" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Premi</CardTitle>
                  <CardDescription>Catalogo premi riscattabili con NeuroCredits</CardDescription>
                </CardHeader>
                <CardContent>
                  {workingConfig.rewards?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nessun premio configurato</p>
                  ) : (
                    <div className="space-y-2">
                      {workingConfig.rewards?.map((reward: any) => (
                        <div key={reward.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold">{reward.title}</span>
                              {reward.description && (
                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{reward.cost} NeuroCredits</Badge>
                              <Badge variant={reward.enabled ? "default" : "secondary"}>
                                {reward.enabled ? "Disponibile" : "Non disponibile"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="publish" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Pubblica Bozza</CardTitle>
                  <CardDescription>
                    Rivedi le modifiche e pubblica la bozza per renderla attiva
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {config?.draft ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                        <p className="text-sm font-medium mb-2">⚠️ Attenzione</p>
                        <p className="text-sm text-muted-foreground">
                          Pubblicando questa bozza, sostituirai la configurazione attiva. Assicurati di aver verificato tutte le modifiche.
                        </p>
                      </div>
                      <Button onClick={publishDraft} disabled={isSaving} className="w-full bg-green-600 hover:bg-green-700">
                        <Publish className="h-4 w-4 mr-2" />
                        {isSaving ? "Pubblicazione..." : "Pubblica Bozza"}
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">Nessuna bozza disponibile</p>
                      <Button onClick={createDraft}>
                        <FileText className="h-4 w-4 mr-2" />
                        Crea Bozza
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </SubscriptionRequired>
  )
}
