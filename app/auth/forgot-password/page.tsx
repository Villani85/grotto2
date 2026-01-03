"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiMail, FiAlertCircle, FiCheck, FiArrowLeft } from "react-icons/fi"
import { getFirebaseAuth, initializeFirebase } from "@/lib/firebase-client"
import { sendPasswordResetEmail } from "firebase/auth"

// Helper per mascherare email nei log
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "invalid"
  const [local, domain] = email.split("@")
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local[0]}${"*".repeat(Math.min(local.length - 2, 5))}${local[local.length - 1]}@${domain}`
}

// Helper per validare email minimamente
function isValidEmail(email: string): boolean {
  const trimmed = email.trim()
  return trimmed.length > 0 && trimmed.includes("@") && trimmed.includes(".")
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFirebaseReady, setIsFirebaseReady] = useState(false)
  const [firebaseInitError, setFirebaseInitError] = useState<string | null>(null)

  // Pre-inizializza Firebase al mount
  useEffect(() => {
    const initFirebase = async () => {
      try {
        await initializeFirebase()
        // Verifica che auth sia disponibile dopo init
        const auth = getFirebaseAuth()
        if (auth) {
          setIsFirebaseReady(true)
          setFirebaseInitError(null)
          if (process.env.NODE_ENV === "development") {
            console.log("[ForgotPassword] firebase ready")
          }
        } else {
          // Se ancora null, aspetta un po' e riprova
          setTimeout(() => {
            const retryAuth = getFirebaseAuth()
            if (retryAuth) {
              setIsFirebaseReady(true)
              setFirebaseInitError(null)
              if (process.env.NODE_ENV === "development") {
                console.log("[ForgotPassword] firebase ready (after retry)")
              }
            } else {
              setFirebaseInitError("Impossibile inizializzare il servizio. Ricarica la pagina.")
            }
          }, 500)
        }
      } catch (err: any) {
        console.error("[ForgotPassword] Firebase init error:", err)
        setFirebaseInitError("Errore nell'inizializzazione. Ricarica la pagina.")
      }
    }

    initFirebase()
  }, [])

  // Retry logic per ottenere auth con tentativi
  const getAuthWithRetry = async (maxRetries = 3, delayMs = 500): Promise<ReturnType<typeof getFirebaseAuth>> => {
    // Assicurati che Firebase sia inizializzato
    await initializeFirebase()

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const auth = getFirebaseAuth()
      if (auth) {
        return auth
      }

      if (attempt < maxRetries) {
        // Aspetta prima del prossimo tentativo
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validazione email base
    const trimmedEmail = email.trim()
    if (!isValidEmail(trimmedEmail)) {
      setError("Inserisci un indirizzo email valido")
      setIsLoading(false)
      return
    }

    // Logging DEV
    if (process.env.NODE_ENV === "development") {
      console.log("[ForgotPassword] submit start", { emailMasked: maskEmail(trimmedEmail) })
    }

    try {
      // Retry logic per ottenere auth
      const auth = await getAuthWithRetry(3, 500)

      if (!auth) {
        throw new Error("Servizio non disponibile. Riprova tra qualche secondo.")
      }

      await sendPasswordResetEmail(auth, trimmedEmail)
      setSuccess(true)
    } catch (err: any) {
      console.error("[ForgotPassword] reset error", { code: err?.code, message: err?.message })

      // Error mapping migliorato
      let errorMessage = "Errore durante l'invio. Riprova più tardi."

      if (err?.code) {
        switch (err.code) {
          case "auth/user-not-found":
            errorMessage = "Nessun account trovato con questa email"
            break
          case "auth/invalid-email":
            errorMessage = "Email non valida"
            break
          case "auth/too-many-requests":
            errorMessage = "Troppi tentativi. Attendi qualche minuto prima di riprovare."
            break
          default:
            // Mantieni il messaggio originale se disponibile, altrimenti usa il generico
            errorMessage = err.message || errorMessage
        }
      } else if (err?.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-[#005FD7] to-[#005FD7]/80 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">BH</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Recupera Password</h1>
          <p className="text-gray-400">Inserisci la tua email per ricevere il link di reset</p>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          {success ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <FiCheck className="text-green-400 text-2xl" />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2">Email Inviata!</h2>
                <p className="text-gray-400 mb-4">
                  Controlla la tua casella email. Ti abbiamo inviato un link per reimpostare la password.
                </p>
                <p className="text-sm text-gray-500">
                  Non hai ricevuto l'email? Controlla la cartella spam o riprova.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center w-full py-3 px-4 bg-[#005FD7] hover:bg-[#0051b8] rounded-lg font-semibold transition-all"
              >
                <FiArrowLeft className="mr-2" />
                Torna al Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <FiAlertCircle className="text-red-400 mt-0.5 flex-shrink-0" />
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {firebaseInitError && (
                <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                  <FiAlertCircle className="text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-yellow-400 text-sm">{firebaseInitError}</p>
                </div>
              )}

              {!isFirebaseReady && !firebaseInitError && (
                <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-blue-400 text-sm text-center">Sto preparando il servizio...</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiMail className="text-gray-500" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:border-[#005FD7] focus:ring-2 focus:ring-[#005FD7]/20 focus:outline-none transition-all text-white"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isFirebaseReady || !isValidEmail(email.trim()) || !!firebaseInitError}
                  className="w-full py-3 px-4 bg-[#005FD7] hover:bg-[#0051b8] text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Invio in corso..." : "Invia Link di Reset"}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-800">
                <Link
                  href="/auth/login"
                  className="flex items-center justify-center text-sm text-[#005FD7] hover:text-[#0051b8]"
                >
                  <FiArrowLeft className="mr-2" />
                  Torna al Login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
