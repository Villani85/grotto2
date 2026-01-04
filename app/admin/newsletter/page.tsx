"use client"

import { useState, useEffect } from "react"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Mail, Plus, Edit, Send, Calendar, Eye } from "lucide-react"
import type { NewsletterCampaign } from "@/lib/types"
import Link from "next/link"

export default function AdminNewsletterPage() {
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sendsStats, setSendsStats] = useState<Record<string, { sent: number; failed: number; total: number }>>({})

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const { getFirebaseIdToken } = await import("@/lib/api-helpers")
      const token = await getFirebaseIdToken()
      const headers: HeadersInit = { "Content-Type": "application/json" }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }
      
      const response = await fetch("/api/admin/newsletter", { headers })
      const data = await response.json()
      setCampaigns(data)
      
      // Fetch stats for each campaign
      const stats: Record<string, { sent: number; failed: number; total: number }> = {}
      for (const campaign of data) {
        try {
          const sendsResponse = await fetch(`/api/admin/newsletter/${campaign.id}/sends`, { headers })
          if (sendsResponse.ok) {
            const sendsData = await sendsResponse.json()
            stats[campaign.id] = {
              sent: sendsData.sent || 0,
              failed: sendsData.failed || 0,
              total: sendsData.total || 0,
            }
          }
        } catch (error) {
          // Ignore errors for individual stats
        }
      }
      setSendsStats(stats)
    } catch (error) {
      console.error("Error fetching campaigns:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: NewsletterCampaign["status"]) => {
    const variants = {
      draft: "outline",
      scheduled: "secondary",
      sending: "default",
      sent: "default",
      failed: "destructive",
    } as const

    const labels = {
      draft: "Bozza",
      scheduled: "Programmata",
      sending: "In invio",
      sent: "Inviata",
      failed: "Fallita",
    }

    return <Badge variant={variants[status]}>{labels[status]}</Badge>
  }

  return (
    <AdminRequired>
      <div className="py-8">
        <DemoModeBanner />

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Newsletter Studio</h1>
            <p className="text-muted-foreground">Crea e invia newsletter ai tuoi membri</p>
          </div>
          <Link href="/admin/newsletter/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuova Campagna
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Campagne Newsletter
            </CardTitle>
            <CardDescription>
              Totale: {campaigns.length} campagne | Inviate: {campaigns.filter((c) => c.status === "sent").length}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Oggetto</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Invii</TableHead>
                      <TableHead>Data Creazione</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaigns.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nessuna campagna trovata. Crea la tua prima newsletter!
                        </TableCell>
                      </TableRow>
                    ) : (
                      campaigns.map((campaign) => (
                        <TableRow key={campaign.id}>
                          <TableCell className="font-medium">{campaign.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {campaign.audience.include.includes("all")
                                ? "Tutti"
                                : campaign.audience.include.includes("subscribers_active")
                                  ? "Abbonati"
                                  : "Personalizzata"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                          <TableCell>
                            {sendsStats[campaign.id] ? (
                              <div className="text-sm space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-green-400">✓ {sendsStats[campaign.id].sent}</span>
                                  {sendsStats[campaign.id].failed > 0 && (
                                    <span className="text-red-400">✗ {sendsStats[campaign.id].failed}</span>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Totale: {sendsStats[campaign.id].total}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(campaign.createdAt).toLocaleDateString("it-IT")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {campaign.status === "draft" && (
                                <>
                                  <Link href={`/admin/newsletter/${campaign.id}`}>
                                    <Button size="sm" variant="outline">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </Link>
                                  <Button size="sm" variant="default">
                                    <Send className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              {campaign.status === "scheduled" && (
                                <Button size="sm" variant="outline">
                                  <Calendar className="h-4 w-4" />
                                </Button>
                              )}
                              {(campaign.status === "sent" || campaign.status === "sending" || campaign.status === "failed") && (
                                <Link href={`/admin/newsletter/${campaign.id}/sends`}>
                                  <Button size="sm" variant="outline">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Storico
                                  </Button>
                                </Link>
                              )}
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
