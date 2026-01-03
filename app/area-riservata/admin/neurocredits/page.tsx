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
import { Settings, Save, Send, FileText, Plus, Trash2, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface NeuroCreditRule {
  points: number
  enabled: boolean
  dailyCap: number | null
  description?: string
}

interface NeuroCreditLevel {
  id: number
  name: string
  minPoints: number
  color?: string
  icon?: string
}

interface NeuroCreditObjective {
  id: string
  title: string
  metric: "neuroCredits" | "videosCompleted" | "activeDays" | "streak"
  target: number
  windowDays: number
  rewardPoints: number
  enabled: boolean
}

interface NeuroCreditReward {
  id: string
  title: string
  description?: string
  cost: number
  enabled: boolean
  stock: number | null
  minLevel: number | null
  expiresAt: string | null
}

interface NeuroCreditConfig {
  active: {
    versionId: string
    status: string
    createdAt: string
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<NeuroCreditLevel>
    objectives: Array<NeuroCreditObjective>
    rewards: Array<NeuroCreditReward>
  }
  draft: {
    versionId: string
    status: string
    createdAt: string
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<NeuroCreditLevel>
    objectives: Array<NeuroCreditObjective>
    rewards: Array<NeuroCreditReward>
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
  const [draftForm, setDraftForm] = useState<NeuroCreditConfig["draft"] | null>(null)

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
      // Initialize draft form if draft exists
      if (data.draft) {
        setDraftForm(JSON.parse(JSON.stringify(data.draft))) // Deep copy
      } else {
        setDraftForm(null)
      }
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

      const draftData = await response.json()
      toast({
        title: "Bozza creata",
        description: "La bozza è stata creata con successo",
      })

      await loadConfig()
      // Initialize draft form with the new draft
      if (draftData) {
        setDraftForm(JSON.parse(JSON.stringify(draftData)))
      }
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

  const saveDraft = async () => {
    if (!draftForm) {
      toast({
        title: "Errore",
        description: "Nessuna bozza da salvare",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Token non disponibile")
      }

      const response = await fetch("/api/admin/neurocredits/config/draft", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rules: draftForm.rules,
          levels: draftForm.levels,
          objectives: draftForm.objectives,
          rewards: draftForm.rewards,
          notes: draftForm.notes,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore nel salvare la bozza")
      }

      toast({
        title: "Bozza salvata",
        description: "Le modifiche sono state salvate con successo",
      })

      // Reload config to sync with server
      await loadConfig()
    } catch (error: any) {
      console.error("Error saving draft:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile salvare la bozza",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Helper functions for managing arrays
  const addLevel = () => {
    if (!draftForm) return
    const maxId = draftForm.levels.length > 0 ? Math.max(...draftForm.levels.map((l) => l.id)) : 0
    const newLevel: NeuroCreditLevel = {
      id: maxId + 1,
      name: `Level ${maxId + 1}`,
      minPoints: 0,
      color: undefined,
      icon: undefined,
    }
    const updatedLevels = [...draftForm.levels, newLevel].sort((a, b) => a.minPoints - b.minPoints)
    setDraftForm({ ...draftForm, levels: updatedLevels })
  }

  const updateLevel = (index: number, patch: Partial<NeuroCreditLevel>) => {
    if (!draftForm) return
    const updatedLevels = [...draftForm.levels]
    updatedLevels[index] = { ...updatedLevels[index], ...patch }
    updatedLevels.sort((a, b) => a.minPoints - b.minPoints)
    setDraftForm({ ...draftForm, levels: updatedLevels })
  }

  const removeLevel = (index: number) => {
    if (!draftForm) return
    const updatedLevels = draftForm.levels.filter((_, i) => i !== index)
    setDraftForm({ ...draftForm, levels: updatedLevels })
  }

  const addObjective = () => {
    if (!draftForm) return
    const newObjective: NeuroCreditObjective = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      title: "Nuovo Obiettivo",
      metric: "neuroCredits",
      target: 100,
      windowDays: 7,
      rewardPoints: 50,
      enabled: true,
    }
    setDraftForm({ ...draftForm, objectives: [...draftForm.objectives, newObjective] })
  }

  const updateObjective = (index: number, patch: Partial<NeuroCreditObjective>) => {
    if (!draftForm) return
    const updatedObjectives = [...draftForm.objectives]
    updatedObjectives[index] = { ...updatedObjectives[index], ...patch }
    setDraftForm({ ...draftForm, objectives: updatedObjectives })
  }

  const removeObjective = (index: number) => {
    if (!draftForm) return
    const updatedObjectives = draftForm.objectives.filter((_, i) => i !== index)
    setDraftForm({ ...draftForm, objectives: updatedObjectives })
  }

  const addReward = () => {
    if (!draftForm) return
    const newReward: NeuroCreditReward = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      title: "Nuovo Premio",
      description: undefined,
      cost: 100,
      enabled: true,
      stock: null,
      minLevel: null,
      expiresAt: null,
    }
    setDraftForm({ ...draftForm, rewards: [...draftForm.rewards, newReward] })
  }

  const updateReward = (index: number, patch: Partial<NeuroCreditReward>) => {
    if (!draftForm) return
    const updatedRewards = [...draftForm.rewards]
    updatedRewards[index] = { ...updatedRewards[index], ...patch }
    setDraftForm({ ...draftForm, rewards: updatedRewards })
  }

  const removeReward = (index: number) => {
    if (!draftForm) return
    const updatedRewards = draftForm.rewards.filter((_, i) => i !== index)
    setDraftForm({ ...draftForm, rewards: updatedRewards })
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

  // Use draftForm if editing draft, otherwise use config
  const workingConfig = draftForm || config?.draft || config?.active
  const isEditingDraft = !!draftForm

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
              <>
                <Button onClick={saveDraft} disabled={isSaving || !isEditingDraft} variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Salva Bozza
                </Button>
                <Button onClick={publishDraft} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                  <Send className="h-4 w-4 mr-2" />
                  Pubblica Bozza
                </Button>
              </>
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
                            {isEditingDraft ? (
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={rule.enabled}
                                  onCheckedChange={(checked) => {
                                    if (draftForm) {
                                      setDraftForm({
                                        ...draftForm,
                                        rules: {
                                          ...draftForm.rules,
                                          [eventType]: {
                                            ...draftForm.rules[eventType],
                                            enabled: checked,
                                          },
                                        },
                                      })
                                    }
                                  }}
                                />
                                <Badge variant={rule.enabled ? "default" : "secondary"}>
                                  {rule.enabled ? "Abilitato" : "Disabilitato"}
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant={rule.enabled ? "default" : "secondary"}>
                                {rule.enabled ? "Abilitato" : "Disabilitato"}
                              </Badge>
                            )}
                          </div>
                          {rule.description && (
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className={isEditingDraft ? "flex flex-col gap-1" : "text-right"}>
                            <Label className="text-sm text-muted-foreground">Punti</Label>
                            {isEditingDraft ? (
                              <Input
                                type="number"
                                value={rule.points}
                                onChange={(e) => {
                                  if (draftForm) {
                                    setDraftForm({
                                      ...draftForm,
                                      rules: {
                                        ...draftForm.rules,
                                        [eventType]: {
                                          ...draftForm.rules[eventType],
                                          points: parseInt(e.target.value) || 0,
                                        },
                                      },
                                    })
                                  }
                                }}
                                className="w-20"
                              />
                            ) : (
                              <p className="text-lg font-bold">{rule.points}</p>
                            )}
                          </div>
                          {rule.dailyCap !== null && (
                            <div className={isEditingDraft ? "flex flex-col gap-1" : "text-right"}>
                              <Label className="text-sm text-muted-foreground">Cap Giornaliero</Label>
                              {isEditingDraft ? (
                                <Input
                                  type="number"
                                  value={rule.dailyCap || 0}
                                  onChange={(e) => {
                                    if (draftForm) {
                                      setDraftForm({
                                        ...draftForm,
                                        rules: {
                                          ...draftForm.rules,
                                          [eventType]: {
                                            ...draftForm.rules[eventType],
                                            dailyCap: e.target.value ? parseInt(e.target.value) : null,
                                          },
                                        },
                                      })
                                    }
                                  }}
                                  className="w-20"
                                />
                              ) : (
                                <p className="text-lg font-bold">{rule.dailyCap}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {!isEditingDraft && (
                    <p className="text-xs text-muted-foreground mt-4">
                      ⚠️ La modifica delle regole richiede l'aggiornamento della bozza. Usa "Crea Bozza" per iniziare.
                    </p>
                  )}
                  {isEditingDraft && (
                    <div className="mt-4 flex justify-end">
                      <Button onClick={saveDraft} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" />
                        Salva Modifiche
                      </Button>
                    </div>
                  )}
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
                  {isEditingDraft && (
                    <div className="mb-4">
                      <Button onClick={addLevel} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Livello
                      </Button>
                    </div>
                  )}
                  <div className="space-y-4">
                    {workingConfig.levels?.map((level, index) => (
                      <div key={level.id} className="p-4 border rounded-lg space-y-3">
                        {isEditingDraft ? (
                          <>
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-semibold">Livello {level.id}</Label>
                              <Button
                                onClick={() => removeLevel(index)}
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label>Nome</Label>
                                <Input
                                  value={level.name}
                                  onChange={(e) => updateLevel(index, { name: e.target.value })}
                                  placeholder="Nome livello"
                                />
                              </div>
                              <div>
                                <Label>Punti Minimi</Label>
                                <Input
                                  type="number"
                                  value={level.minPoints}
                                  onChange={(e) => updateLevel(index, { minPoints: parseInt(e.target.value) || 0 })}
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <Label>Colore (opzionale)</Label>
                                <Input
                                  value={level.color || ""}
                                  onChange={(e) => updateLevel(index, { color: e.target.value || undefined })}
                                  placeholder="#000000"
                                />
                              </div>
                              <div>
                                <Label>Icona (opzionale)</Label>
                                <Input
                                  value={level.icon || ""}
                                  onChange={(e) => updateLevel(index, { icon: e.target.value || undefined })}
                                  placeholder="icon-name"
                                />
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-semibold">Livello {level.id}: {level.name}</span>
                            </div>
                            <Badge variant="outline">{level.minPoints} punti minimi</Badge>
                          </div>
                        )}
                      </div>
                    ))}
                    {workingConfig.levels?.length === 0 && (
                      <p className="text-muted-foreground text-center py-8">Nessun livello configurato</p>
                    )}
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
                  {isEditingDraft && (
                    <div className="mb-4">
                      <Button onClick={addObjective} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Obiettivo
                      </Button>
                    </div>
                  )}
                  {workingConfig.objectives?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nessun obiettivo configurato</p>
                  ) : (
                    <div className="space-y-4">
                      {workingConfig.objectives?.map((obj, index) => (
                        <div key={obj.id} className="p-4 border rounded-lg space-y-3">
                          {isEditingDraft ? (
                            <>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Obiettivo {index + 1}</Label>
                                <Button
                                  onClick={() => removeObjective(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <Label>Titolo</Label>
                                  <Input
                                    value={obj.title}
                                    onChange={(e) => updateObjective(index, { title: e.target.value })}
                                    placeholder="Titolo obiettivo"
                                  />
                                </div>
                                <div>
                                  <Label>Metrica</Label>
                                  <Select
                                    value={obj.metric}
                                    onValueChange={(value: "neuroCredits" | "videosCompleted" | "activeDays" | "streak") =>
                                      updateObjective(index, { metric: value })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="neuroCredits">NeuroCredits</SelectItem>
                                      <SelectItem value="videosCompleted">Video Completati</SelectItem>
                                      <SelectItem value="activeDays">Giorni Attivi</SelectItem>
                                      <SelectItem value="streak">Streak</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Target</Label>
                                  <Input
                                    type="number"
                                    value={obj.target}
                                    onChange={(e) => updateObjective(index, { target: parseInt(e.target.value) || 0 })}
                                    placeholder="100"
                                  />
                                </div>
                                <div>
                                  <Label>Finestra (giorni)</Label>
                                  <Input
                                    type="number"
                                    value={obj.windowDays}
                                    onChange={(e) => updateObjective(index, { windowDays: parseInt(e.target.value) || 1 })}
                                    placeholder="7"
                                    min={1}
                                    max={365}
                                  />
                                </div>
                                <div>
                                  <Label>Punti Ricompensa</Label>
                                  <Input
                                    type="number"
                                    value={obj.rewardPoints}
                                    onChange={(e) => updateObjective(index, { rewardPoints: parseInt(e.target.value) || 0 })}
                                    placeholder="50"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={obj.enabled}
                                    onCheckedChange={(checked) => updateObjective(index, { enabled: checked })}
                                  />
                                  <Label>Abilitato</Label>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">{obj.title}</span>
                                <Badge variant={obj.enabled ? "default" : "secondary"}>
                                  {obj.enabled ? "Abilitato" : "Disabilitato"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {obj.metric} → {obj.target} in {obj.windowDays} giorni → +{obj.rewardPoints} punti
                              </p>
                            </>
                          )}
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
                  {isEditingDraft && (
                    <div className="mb-4">
                      <Button onClick={addReward} variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Aggiungi Premio
                      </Button>
                    </div>
                  )}
                  {workingConfig.rewards?.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Nessun premio configurato</p>
                  ) : (
                    <div className="space-y-4">
                      {workingConfig.rewards?.map((reward, index) => (
                        <div key={reward.id} className="p-4 border rounded-lg space-y-3">
                          {isEditingDraft ? (
                            <>
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Premio {index + 1}</Label>
                                <Button
                                  onClick={() => removeReward(index)}
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                  <Label>Titolo</Label>
                                  <Input
                                    value={reward.title}
                                    onChange={(e) => updateReward(index, { title: e.target.value })}
                                    placeholder="Titolo premio"
                                  />
                                </div>
                                <div className="md:col-span-2">
                                  <Label>Descrizione (opzionale)</Label>
                                  <Textarea
                                    value={reward.description || ""}
                                    onChange={(e) => updateReward(index, { description: e.target.value || undefined })}
                                    placeholder="Descrizione del premio"
                                    rows={2}
                                  />
                                </div>
                                <div>
                                  <Label>Costo (NeuroCredits)</Label>
                                  <Input
                                    type="number"
                                    value={reward.cost}
                                    onChange={(e) => updateReward(index, { cost: parseInt(e.target.value) || 1 })}
                                    placeholder="100"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <Label>Stock (vuoto = illimitato)</Label>
                                  <Input
                                    type="number"
                                    value={reward.stock === null ? "" : reward.stock}
                                    onChange={(e) =>
                                      updateReward(index, { stock: e.target.value ? parseInt(e.target.value) : null })
                                    }
                                    placeholder="Illimitato"
                                    min={0}
                                  />
                                </div>
                                <div>
                                  <Label>Livello Minimo (opzionale)</Label>
                                  <Input
                                    type="number"
                                    value={reward.minLevel === null ? "" : reward.minLevel}
                                    onChange={(e) =>
                                      updateReward(index, { minLevel: e.target.value ? parseInt(e.target.value) : null })
                                    }
                                    placeholder="Nessun limite"
                                    min={1}
                                  />
                                </div>
                                <div>
                                  <Label>Scadenza (opzionale)</Label>
                                  <Input
                                    type="datetime-local"
                                    value={
                                      reward.expiresAt
                                        ? new Date(reward.expiresAt).toISOString().slice(0, 16)
                                        : ""
                                    }
                                    onChange={(e) =>
                                      updateReward(index, {
                                        expiresAt: e.target.value ? new Date(e.target.value).toISOString() : null,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={reward.enabled}
                                    onCheckedChange={(checked) => updateReward(index, { enabled: checked })}
                                  />
                                  <Label>Disponibile</Label>
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
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
                              {(reward.stock !== null || reward.minLevel !== null || reward.expiresAt) && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  {reward.stock !== null && <span>Stock: {reward.stock} </span>}
                                  {reward.minLevel !== null && <span>Livello min: {reward.minLevel} </span>}
                                  {reward.expiresAt && (
                                    <span>Scade: {new Date(reward.expiresAt).toLocaleDateString("it-IT")}</span>
                                  )}
                                </div>
                              )}
                            </>
                          )}
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
                        <Send className="h-4 w-4 mr-2" />
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
