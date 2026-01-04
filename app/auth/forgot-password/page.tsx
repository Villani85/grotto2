"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { sendPasswordResetEmail } from "firebase/auth"
import { getFirebaseAuth, initializeFirebase } from "@/lib/firebase-client"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)

  // Pre-initialize Firebase on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeFirebase()
        setIsFirebaseReady(true)
      } catch (err) {
        console.error("[ForgotPassword] Firebase init error:", err)
      }
    }
    init()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setIsLoading(true)

    try {
      // Ensure Firebase is initialized with retry logic
      let auth = getFirebaseAuth()

      if (!auth) {
        console.log("[ForgotPassword] Auth not ready, initializing...")
        await initializeFirebase()
        auth = getFirebaseAuth()
      }

      // Retry loop if still null
      let retries = 3
      while (!auth && retries > 0) {
        console.log(`[ForgotPassword] Retry waiting for auth... (${retries})`)
        await new Promise(resolve => setTimeout(resolve, 500))
        auth = getFirebaseAuth()
        retries--
      }

      if (!auth) {
        throw new Error("Servizio di autenticazione non disponibile. Riprova tra qualche istante.")
      }

      await sendPasswordResetEmail(auth, email)
      setSuccess(true)
    } catch (err: any) {
      console.error("Password reset error:", err)
      const errorMessage =
        err.code === "auth/user-not-found"
          ? "Nessun account trovato con questa email"
          : err.code === "auth/invalid-email"
          ? "Email non valida"
          : err.message || "Errore durante l'invio. Riprova più tardi."
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6 bg-card border-border">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Recupera Password</h1>
          <p className="text-muted-foreground">
            Inserisci la tua email per ricevere il link di reset
          </p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 p-4 rounded-lg text-center space-y-4">
            <p>Email inviata! Controlla la tua casella di posta (e lo spam).</p>
            <Button
              className="w-full bg-transparent border border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={() => setSuccess(false)}
            >
              Invia un'altra email
            </Button>
            <Link href="/auth/login" className="block text-sm text-muted-foreground hover:text-foreground">
              Torna al login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full p-3 rounded-lg bg-background border border-input focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors"
                placeholder="nome@esempio.com"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-3 rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "Invio in corso..." : "Invia Link di Reset"}
            </Button>

            <div className="text-center pt-2">
              <Link href="/auth/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Torna al login
              </Link>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
