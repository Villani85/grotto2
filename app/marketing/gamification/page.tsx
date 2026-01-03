"use client"

import { FiAward, FiTrendingUp, FiTarget, FiUsers, FiStar, FiZap } from "react-icons/fi"
import Link from "next/link"

export default function GamificationPage() {
  const stats = [
    { label: "Livelli Disponibili", value: "10+", icon: <FiTrendingUp /> },
    { label: "Obiettivi Attivi", value: "50+", icon: <FiTarget /> },
    { label: "Badge Sbloccabili", value: "25+", icon: <FiAward /> },
    { label: "Utenti Attivi", value: "1.250+", icon: <FiUsers /> },
  ]

  const levels = [
    { livello: 1, punti: "0-999", nome: "Novizio", colore: "from-gray-500 to-gray-600" },
    { livello: 2, punti: "1.000-2.999", nome: "Apprendista", colore: "from-green-500 to-green-600" },
    { livello: 3, punti: "3.000-4.999", nome: "Esperto", colore: "from-blue-500 to-blue-600" },
    { livello: 4, punti: "5.000-9.999", nome: "Maestro", colore: "from-purple-500 to-purple-600" },
    { livello: 5, punti: "10.000+", nome: "Leggenda", colore: "from-yellow-500 to-orange-500" },
  ]

  const badges = [
    { nome: "Primo Passo", descrizione: "Completa il tuo primo corso", icon: <FiStar /> },
    { nome: "Streak Master", descrizione: "Mantieni 30 giorni di attività consecutiva", icon: <FiZap /> },
    { nome: "Community Leader", descrizione: "Crea 50 post nella community", icon: <FiUsers /> },
    { nome: "Live Enthusiast", descrizione: "Partecipa a 10 eventi live", icon: <FiAward /> },
  ]

  return (
    <div className="space-y-16 py-12">
      {/* Hero */}
      <div className="text-center max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-black mb-6">
          Sistema di <span className="text-[#005FD7]">Gamification</span>
        </h1>
        <p className="text-xl text-gray-400 leading-relaxed">
          Trasforma l'apprendimento in un'esperienza coinvolgente. Guadagna punti, sblocca livelli e raggiungi nuovi traguardi.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-900 rounded-xl p-6 border border-gray-800 text-center">
            <div className="text-3xl text-[#005FD7] mb-3 flex justify-center">{stat.icon}</div>
            <div className="text-3xl font-bold mb-2">{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Livelli */}
      <div>
        <h2 className="text-3xl font-bold mb-8 text-center">Sistema a Livelli</h2>
        <div className="space-y-4">
          {levels.map((level, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-[#005FD7]/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-r ${level.colore} flex items-center justify-center text-white text-2xl font-bold`}>
                    {level.livello}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{level.nome}</h3>
                    <p className="text-gray-400">{level.punti} punti</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">Benefici</div>
                  <div className="text-[#005FD7] font-semibold">Accesso esclusivo</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badge */}
      <div>
        <h2 className="text-3xl font-bold mb-8 text-center">Badge e Achievement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {badges.map((badge, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-yellow-500/50 transition-all"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-yellow-400 text-xl">
                  {badge.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-2">{badge.nome}</h3>
                  <p className="text-gray-400">{badge.descrizione}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Come Guadagnare Punti */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-12 border border-gray-800">
        <h2 className="text-3xl font-bold mb-8 text-center">Come Guadagnare Punti</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-start gap-4">
            <FiAward className="text-[#005FD7] text-2xl flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Completa Corsi</h3>
              <p className="text-gray-400">100-500 punti per corso completato</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <FiZap className="text-[#005FD7] text-2xl flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Partecipa a Live</h3>
              <p className="text-gray-400">50 punti per evento live partecipato</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <FiUsers className="text-[#005FD7] text-2xl flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Interagisci in Community</h3>
              <p className="text-gray-400">10-25 punti per post e commento</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <FiTarget className="text-[#005FD7] text-2xl flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold mb-1">Completa Obiettivi</h3>
              <p className="text-gray-400">150-500 punti per obiettivo completato</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-[#005FD7]/10 rounded-2xl p-12 border border-[#005FD7]/20">
        <h2 className="text-3xl font-bold mb-4">Inizia a Guadagnare Punti Oggi</h2>
        <p className="text-gray-400 mb-8 text-lg">Unisciti alla community e inizia il tuo viaggio verso il livello successivo</p>
        <Link
          href="/auth/register"
          className="inline-flex items-center justify-center px-8 py-4 bg-[#005FD7] hover:bg-[#0051b8] rounded-xl font-bold text-lg transition-all hover:scale-105"
        >
          Inizia Gratuitamente
        </Link>
      </div>
    </div>
  )
}
