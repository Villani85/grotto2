"use client"

import { useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { AdminRequired } from "@/components/AdminRequired"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react"

export default function MakeAllAdminPage() {
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    usersUpdated: number
  } | null>(null)

  const makeAllUsersAdmin = async () => {
    if (!confirm("Sei sicuro di voler rendere TUTTI gli utenti amministratori? Questa operazione non può essere annullata facilmente.")) {
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const { getFirebaseFirestore } = await import("@/lib/firebase-client")
      const db = getFirebaseFirestore()
      
      if (!db) {
        throw new Error("Firebase non inizializzato")
      }

      const { collection, getDocs, doc, updateDoc } = await import("firebase/firestore")
      
      // Get all users
      const usersRef = collection(db, "users")
      const snapshot = await getDocs(usersRef)
      
      let updated = 0
      const errors: string[] = []

      // Update each user
      for (const userDoc of snapshot.docs) {
        try {
          const userRef = doc(db, "users", userDoc.id)
          await updateDoc(userRef, {
            isAdmin: true,
            updatedAt: new Date(),
          })
          updated++
        } catch (error: any) {
          errors.push(`Errore aggiornando ${userDoc.id}: ${error.message}`)
          console.error(`Error updating user ${userDoc.id}:`, error)
        }
      }

      if (errors.length > 0) {
        setResult({
          success: false,
          message: `Aggiornati ${updated} utenti, ma ci sono stati ${errors.length} errori.`,
          usersUpdated: updated,
        })
      } else {
        setResult({
          success: true,
          message: `Tutti gli utenti (${updated}) sono stati resi amministratori con successo!`,
          usersUpdated: updated,
        })
      }
    } catch (error: any) {
      console.error("Error making all users admin:", error)
      setResult({
        success: false,
        message: `Errore: ${error.message}`,
        usersUpdated: 0,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <AdminRequired>
      <div className="py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Rendi Tutti gli Utenti Amministratori</CardTitle>
            <CardDescription>
              Questa pagina permette di rendere tutti gli utenti attuali amministratori.
              <br />
              <strong className="text-red-500">ATTENZIONE:</strong> Questa operazione è irreversibile senza intervento manuale.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {result && (
              <Alert variant={result.success ? "default" : "destructive"}>
                {result.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  {result.message}
                  {result.usersUpdated > 0 && (
                    <div className="mt-2 text-sm">
                      Utenti aggiornati: {result.usersUpdated}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Cosa fa questa operazione:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Legge tutti gli utenti dalla collection <code>users</code></li>
                <li>Imposta il campo <code>isAdmin: true</code> per ogni utente</li>
                <li>Aggiorna il campo <code>updatedAt</code></li>
              </ul>
            </div>

            <Button
              onClick={makeAllUsersAdmin}
              disabled={isProcessing}
              variant="destructive"
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Elaborazione in corso...
                </>
              ) : (
                "Rendi Tutti gli Utenti Amministratori"
              )}
            </Button>

            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-1">Nota:</p>
              <p>
                Dopo questa operazione, tutti gli utenti avranno accesso completo al pannello admin.
                Puoi rimuovere manualmente i privilegi admin da utenti specifici dalla pagina{" "}
                <a href="/admin/users" className="text-accent hover:underline">
                  Gestione Utenti
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminRequired>
  )
}





