"use client"

import { SubscriptionCard } from "@/components/SubscriptionCard"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { useEffect, useState } from "react"
import type { AdminSettings } from "@/lib/types"

export default function AbbonamentoPage() {
  const [settings, setSettings] = useState<AdminSettings | null>(null)

  useEffect(() => {
    fetch("/api/admin/settings/public")
      .then((res) => res.json())
      .then(setSettings)
      .catch(console.error)
  }, [])

  const monthlyDisabled = settings?.billingPlansEnabled === "yearly_only"

  return (
    <div className="py-12">
      <DemoModeBanner />

      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Scegli il Tuo Piano</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Sblocca il pieno potenziale della tua mente con l&apos;accesso completo alla Brain Hacking Academy
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
        <SubscriptionCard
          title="Mensile"
          price="€29"
          period="mese"
          priceType="monthly"
          disabled={monthlyDisabled}
          features={[
            "Accesso completo a tutti i corsi",
            "Community esclusiva membri",
            "Nuovi contenuti ogni settimana",
            "Sistema di gamification e premi",
            "Supporto prioritario",
            "Cancella in qualsiasi momento",
          ]}
        />

        <SubscriptionCard
          title="Annuale"
          price="€249"
          period="anno"
          priceType="yearly"
          popular
          features={[
            "Tutto del piano mensile",
            "Risparmia oltre €100 all&apos;anno",
            "Accesso anticipato a nuovi corsi",
            "Sessioni Q&A esclusive mensili",
            "Certificati di completamento",
            "Materiali scaricabili premium",
          ]}
        />
      </div>

      <div className="max-w-3xl mx-auto mt-12 px-4">
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Cosa Include l&apos;Abbonamento</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2 text-card-foreground">Contenuti Educativi</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• 50+ ore di videocorsi</li>
                <li>• Esercizi pratici interattivi</li>
                <li>• Quiz di valutazione</li>
                <li>• Risorse scaricabili</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2 text-card-foreground">Community & Supporto</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• Forum privato membri</li>
                <li>• Sessioni live settimanali</li>
                <li>• Supporto via email</li>
                <li>• Network di professionisti</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
