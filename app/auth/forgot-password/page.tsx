"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FiMail, FiAlertCircle, FiCheck, FiArrowLeft } from "react-icons/fi"
import { getFirebaseAuth } from "@/lib/firebase-client"
import { sendPasswordResetEmail } from "firebase/auth"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const auth = getFirebaseAuth()
      if (!auth) {
        throw new Error("Servizio non disponibile. Riprova più tardi.")
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
                  disabled={isLoading}
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
