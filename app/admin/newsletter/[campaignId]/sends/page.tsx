"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import { useRouter } from "next/navigation"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Mail, CheckCircle, XCircle, Clock, Eye, EyeOff } from "lucide-react"
import type { NewsletterSend } from "@/lib/types"

export default function NewsletterSendsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = use(params)
  const router = useRouter()
  const [sends, setSends] = useState<NewsletterSend[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSend, setExpandedSend] = useState<string | null>(null)

  useEffect(() => {
    fetchSends()
  }, [campaignId])

  const fetchSends = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/newsletter/${campaignId}/sends`)
      if (response.ok) {
        const data = await response.json()
        setSends(data.sends || [])
      }
    } catch (error) {
      console.error("Error fetching sends:", error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: sends.length,
    sent: sends.filter((s) => s.status === "sent").length,
    failed: sends.filter((s) => s.status === "failed").length,
    pending: sends.filter((s) => s.status === "pending").length,
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Inviata
          </Badge>
        )
      case "failed":
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            Fallita
          </Badge>
        )
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            In attesa
          </Badge>
        )
    }
  }

  return (
    <AdminRequired>
      <div className="py-8">
        <DemoModeBanner />

        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/admin/newsletter")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Torna alle campagne
          </Button>
          <h1 className="text-3xl font-bold mb-2">Storico Invii Newsletter</h1>
          <p className="text-muted-foreground">Campagna: {campaignId}</p>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Totale</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inviate</p>
                  <p className="text-2xl font-bold text-green-400">{stats.sent}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fallite</p>
                  <p className="text-2xl font-bold text-red-400">{stats.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">In attesa</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sends List */}
        {loading ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#005FD7] mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Caricamento storico...</p>
            </CardContent>
          </Card>
        ) : sends.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Nessun invio registrato per questa campagna</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sends.map((send) => (
              <Card key={send.id} className="hover:border-[#005FD7]/30 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(send.status)}
                        <span className="font-semibold">{send.toEmail}</span>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Inviato il: {send.sentAt ? new Date(send.sentAt).toLocaleString("it-IT") : "N/A"}</p>
                        {send.resendId && (
                          <p>Resend ID: <code className="text-xs bg-gray-800 px-1 py-0.5 rounded">{send.resendId}</code></p>
                        )}
                        {send.requestDetails?.method && (
                          <p>Metodo: <Badge variant="outline" className="text-xs">{send.requestDetails.method}</Badge></p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedSend(expandedSend === send.id ? null : send.id)}
                    >
                      {expandedSend === send.id ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-2" />
                          Nascondi dettagli
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-2" />
                          Mostra dettagli
                        </>
                      )}
                    </Button>
                  </div>

                  {expandedSend === send.id && (
                    <div className="mt-4 pt-4 border-t border-gray-800 space-y-4">
                      {/* Request Details */}
                      {send.requestDetails && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Dettagli Richiesta</h4>
                          <div className="bg-gray-900/50 rounded-lg p-4 text-sm font-mono space-y-1">
                            <p><span className="text-muted-foreground">From:</span> {send.requestDetails.from}</p>
                            <p><span className="text-muted-foreground">To:</span> {send.requestDetails.to}</p>
                            <p><span className="text-muted-foreground">Subject:</span> {send.requestDetails.subject}</p>
                            {send.requestDetails.replyTo && (
                              <p><span className="text-muted-foreground">Reply-To:</span> {send.requestDetails.replyTo}</p>
                            )}
                            <p><span className="text-muted-foreground">Method:</span> {send.requestDetails.method}</p>
                          </div>
                        </div>
                      )}

                      {/* Resend Response */}
                      {send.resendResponse && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm">Risposta Resend API</h4>
                          <div className="bg-gray-900/50 rounded-lg p-4">
                            <pre className="text-xs overflow-auto max-h-96">
                              {JSON.stringify(send.resendResponse, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* Error */}
                      {send.error && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm text-red-400">Errore</h4>
                          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                            <p className="text-sm text-red-400 font-mono">{send.error}</p>
                          </div>
                        </div>
                      )}

                      {/* Metadata */}
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>ID: <code className="bg-gray-800 px-1 py-0.5 rounded">{send.id}</code></p>
                        <p>User ID: <code className="bg-gray-800 px-1 py-0.5 rounded">{send.toUserId || "N/A"}</code></p>
                        <p>Creato il: {new Date(send.createdAt).toLocaleString("it-IT")}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminRequired>
  )
}




