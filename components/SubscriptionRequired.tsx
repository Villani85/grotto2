"use client"

import type React from "react"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Lock } from "lucide-react"

interface SubscriptionRequiredProps {
  children: React.ReactNode
}

export function SubscriptionRequired({ children }: SubscriptionRequiredProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Check if user has active subscription OR is admin
  // Admins have access to everything regardless of subscription
  const hasActiveSubscription = user.subscriptionStatus === "active"
  const isAdmin = user.isAdmin || false
  
  // In demo mode or if subscriptionStatus is undefined, allow access
  const allowAccess = hasActiveSubscription || isAdmin || !user.subscriptionStatus

  if (!allowAccess) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Alert className="border-accent">
          <Lock className="h-5 w-5" />
          <AlertTitle className="text-xl font-bold">Abbonamento Richiesto</AlertTitle>
          <AlertDescription className="mt-4">
            <p className="mb-4">Questa sezione è riservata ai membri abbonati della Brain Hacking Academy.</p>
            <p className="mb-6">
              Sblocca l'accesso completo a tutti i corsi, la community e le funzionalità esclusive.
            </p>
            <Button onClick={() => router.push("/abbonamento")} className="w-full sm:w-auto">
              Scopri i Piani di Abbonamento
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <>{children}</>
}
