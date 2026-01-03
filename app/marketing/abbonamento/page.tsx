"use client"

import { FiCheck, FiArrowRight, FiZap, FiUsers, FiAward } from "react-icons/fi"
import Link from "next/link"

export default function AbbonamentoPage() {
  const plans = [
    {
      nome: "Mensile",
      prezzo: "29",
      periodo: "al mese",
      risparmio: null,
      features: [
        "Accesso completo a tutti i contenuti",
        "12 eventi live all'anno",
        "Community privata",
        "Supporto via email",
        "Aggiornamenti continui",
      ],
      popolare: false,
    },
    {
      nome: "Annuale",
      prezzo: "299",
      periodo: "all'anno",
      risparmio: "Risparmia 2 mesi",
      features: [
        "Tutto del piano Mensile",
        "Priorità su eventi live",
        "Accesso anticipato a nuovi contenuti",
        "Supporto prioritario",
        "Badge esclusivo",
      ],
      popolare: true,
    },
  ]

  const benefits = [
    { icon: <FiZap />, testo: "156+ ore di contenuti on-demand" },
    { icon: <FiUsers />, testo: "Community esclusiva con 1.250+ membri" },
    { icon: <FiAward />, testo: "Sistema di gamification avanzato" },
  ]

  return (
    <div className="space-y-16 py-12">
      {/* Hero */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-black mb-6">
          Scegli il Tuo <span className="text-[#005FD7]">Piano</span>
        </h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          Investi nella tua crescita mentale. Solo 1€ al giorno per accesso completo a formazione, community e supporto.
        </p>
      </div>

      {/* Piani */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {plans.map((plan, index) => (
          <div
            key={index}
            className={`bg-gray-900 rounded-2xl p-8 border-2 transition-all ${
              plan.popolare
                ? "border-[#005FD7] scale-105 relative"
                : "border-gray-800 hover:border-gray-700"
            }`}
          >
            {plan.popolare && (
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-[#005FD7] text-white px-4 py-1 rounded-full text-sm font-bold">
                PIÙ POPOLARE
              </div>
            )}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{plan.nome}</h2>
              <div className="flex items-baseline justify-center gap-2 mb-2">
                <span className="text-5xl font-black">€{plan.prezzo}</span>
                <span className="text-gray-400">/{plan.periodo}</span>
              </div>
              {plan.risparmio && (
                <div className="text-green-400 text-sm font-semibold">{plan.risparmio}</div>
              )}
            </div>
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <FiCheck className="text-[#005FD7] text-xl flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/auth/register"
              className={`w-full block text-center py-4 rounded-xl font-bold transition-all ${
                plan.popolare
                  ? "bg-[#005FD7] hover:bg-[#0051b8] text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-white"
              }`}
            >
              Inizia Ora
            </Link>
          </div>
        ))}
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-12 border border-gray-800">
        <h2 className="text-3xl font-bold mb-8 text-center">Cosa Ottieni con il Tuo Abbonamento</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-[#005FD7]/20 rounded-xl flex items-center justify-center text-[#005FD7] text-2xl mx-auto mb-4">
                {benefit.icon}
              </div>
              <p className="text-gray-300">{benefit.testo}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-3xl font-bold mb-8 text-center">Domande Frequenti</h2>
        <div className="space-y-4 max-w-3xl mx-auto">
          {[
            {
              domanda: "Posso cancellare in qualsiasi momento?",
              risposta: "Sì, puoi cancellare il tuo abbonamento in qualsiasi momento senza penali o costi aggiuntivi.",
            },
            {
              domanda: "Cosa succede se non sono soddisfatto?",
              risposta: "Offriamo garanzia soddisfatti o rimborsati entro i primi 30 giorni.",
            },
            {
              domanda: "I contenuti vengono aggiornati?",
              risposta: "Sì, aggiungiamo nuovi contenuti ogni settimana e aggiorniamo regolarmente i corsi esistenti.",
            },
          ].map((faq, index) => (
            <div key={index} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h3 className="font-bold mb-2">{faq.domanda}</h3>
              <p className="text-gray-400">{faq.risposta}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Finale */}
      <div className="text-center bg-[#005FD7]/10 rounded-2xl p-12 border border-[#005FD7]/20">
        <h2 className="text-3xl font-bold mb-4">Pronto a Iniziare?</h2>
        <p className="text-gray-400 mb-8 text-lg">Unisciti a oltre 1.250 Brain Hacker</p>
        <Link
          href="/auth/register"
          className="inline-flex items-center justify-center px-8 py-4 bg-[#005FD7] hover:bg-[#0051b8] rounded-xl font-bold text-lg transition-all hover:scale-105"
        >
          Inizia Gratuitamente
          <FiArrowRight className="ml-2" />
        </Link>
      </div>
    </div>
  )
}
