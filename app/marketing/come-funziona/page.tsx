"use client"

import { FiPlay, FiUsers, FiAward, FiZap, FiMessageCircle, FiCheck, FiArrowRight } from "react-icons/fi"
import Link from "next/link"

export default function ComeFunzionaPage() {
  const steps = [
    {
      numero: "01",
      titolo: "Iscriviti Gratuitamente",
      descrizione: "Crea il tuo account in pochi secondi. Nessuna carta di credito richiesta per iniziare.",
      icon: <FiUsers />,
      colore: "from-blue-500 to-blue-600",
    },
    {
      numero: "02",
      titolo: "Esplora il Catalogo",
      descrizione: "Accedi a centinaia di ore di contenuti formativi, eventi live e risorse esclusive.",
      icon: <FiPlay />,
      colore: "from-purple-500 to-pink-500",
    },
    {
      numero: "03",
      titolo: "Impara e Pratica",
      descrizione: "Segui i corsi al tuo ritmo, partecipa agli eventi live e interagisci con la community.",
      icon: <FiZap />,
      colore: "from-orange-500 to-red-500",
    },
    {
      numero: "04",
      titolo: "Guadagna Punti",
      descrizione: "Completa obiettivi, partecipa attivamente e accumula punti per sbloccare nuovi livelli.",
      icon: <FiAward />,
      colore: "from-green-500 to-emerald-500",
    },
    {
      numero: "05",
      titolo: "Cresci con la Community",
      descrizione: "Connettiti con altri Brain Hacker, condividi esperienze e accelera la tua crescita.",
      icon: <FiMessageCircle />,
      colore: "from-indigo-500 to-blue-500",
    },
  ]

  const features = [
    "Accesso illimitato a tutti i contenuti",
    "12 eventi live esclusivi all'anno",
    "Community privata con esperti",
    "Sistema di gamification avanzato",
    "Supporto dedicato 24/7",
    "Aggiornamenti continui e nuovi contenuti",
  ]

  return (
    <div className="space-y-16 py-12">
      {/* Hero Section */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-black mb-6">
          Come <span className="text-[#005FD7]">Funziona</span>
        </h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          Un sistema completo e strutturato per trasformare la tua mente e raggiungere risultati straordinari
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-12">
        {steps.map((step, index) => (
          <div
            key={index}
            className="flex flex-col md:flex-row items-center gap-8 bg-gray-900 rounded-2xl p-8 border border-gray-800 hover:border-[#005FD7]/50 transition-all"
          >
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-r ${step.colore} flex items-center justify-center text-white text-4xl flex-shrink-0`}>
              {step.icon}
            </div>
            <div className="flex-1 text-center md:text-left">
              <div className="text-sm text-[#005FD7] font-bold mb-2">STEP {step.numero}</div>
              <h2 className="text-3xl font-bold mb-4">{step.titolo}</h2>
              <p className="text-gray-400 text-lg leading-relaxed">{step.descrizione}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Features */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-12 border border-gray-800">
        <h2 className="text-3xl font-bold mb-8 text-center">Cosa Include il Tuo Abbonamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center gap-3">
              <FiCheck className="text-[#005FD7] text-xl flex-shrink-0" />
              <span className="text-gray-300">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-[#005FD7]/10 rounded-2xl p-12 border border-[#005FD7]/20">
        <h2 className="text-3xl font-bold mb-4">Pronto a Iniziare?</h2>
        <p className="text-gray-400 mb-8 text-lg">Unisciti a oltre 1.250 Brain Hacker che stanno già trasformando le loro vite</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#005FD7] hover:bg-[#0051b8] rounded-xl font-bold text-lg transition-all hover:scale-105"
          >
            Inizia Gratuitamente
            <FiArrowRight className="ml-2" />
          </Link>
          <Link
            href="/marketing/abbonamento"
            className="inline-flex items-center justify-center px-8 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-lg transition-all"
          >
            Scopri i Prezzi
          </Link>
        </div>
      </div>
    </div>
  )
}
