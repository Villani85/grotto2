"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { FiTarget, FiCheck, FiTrendingUp, FiAward, FiCalendar, FiZap } from "react-icons/fi"

export default function ObiettiviPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  const [obiettivi, setObiettivi] = useState([
    {
      id: 1,
      titolo: "Completa 5 corsi questo mese",
      descrizione: "Raggiungi il prossimo livello completando 5 corsi formativi",
      progresso: 60,
      scadenza: "2025-02-28",
      punti: 500,
      completato: false,
    },
    {
      id: 2,
      titolo: "Partecipa a 3 eventi live",
      descrizione: "Iscriviti e partecipa a 3 eventi live per guadagnare punti extra",
      progresso: 33,
      scadenza: "2025-02-15",
      punti: 300,
      completato: false,
    },
    {
      id: 3,
      titolo: "Raggiungi Livello 2",
      descrizione: "Accumula 1000 punti totali per raggiungere il livello successivo",
      progresso: 45,
      scadenza: "2025-03-31",
      punti: 200,
      completato: false,
    },
    {
      id: 4,
      titolo: "Crea 10 post in community",
      descrizione: "Condividi conoscenze e interagisci con la community",
      progresso: 70,
      scadenza: "2025-02-20",
      punti: 150,
      completato: false,
    },
  ])

  const obiettiviCompletati = [
    {
      id: 5,
      titolo: "Completa il primo corso",
      completatoIl: "2025-01-15",
      puntiGuadagnati: 100,
    },
    {
      id: 6,
      titolo: "Raggiungi 7 giorni di streak",
      completatoIl: "2025-01-20",
      puntiGuadagnati: 50,
    },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#005FD7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Caricamento obiettivi...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-black rounded-2xl p-6 border border-gray-800">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-[#005FD7] rounded-xl flex items-center justify-center">
            <FiTarget className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">I Tuoi Obiettivi</h1>
            <p className="text-gray-400">Traccia i tuoi progressi e raggiungi nuovi traguardi</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Obiettivi Attivi</div>
            <div className="text-2xl font-bold text-[#005FD7]">{obiettivi.length}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Completati</div>
            <div className="text-2xl font-bold text-green-400">{obiettiviCompletati.length}</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 mb-1">Punti Totali Obiettivi</div>
            <div className="text-2xl font-bold text-yellow-400">
              {obiettivi.reduce((acc, o) => acc + o.punti, 0) + obiettiviCompletati.reduce((acc, o) => acc + o.puntiGuadagnati, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Obiettivi Attivi */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FiTrendingUp className="text-[#005FD7]" />
          Obiettivi in Corso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {obiettivi.map((obiettivo) => (
            <div
              key={obiettivo.id}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-[#005FD7]/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold mb-2">{obiettivo.titolo}</h3>
                  <p className="text-gray-400 text-sm mb-4">{obiettivo.descrizione}</p>
                </div>
                <div className="w-12 h-12 bg-[#005FD7]/20 rounded-lg flex items-center justify-center">
                  <FiTarget className="text-[#005FD7]" />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progresso</span>
                  <span className="font-semibold">{obiettivo.progresso}%</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#005FD7] to-blue-600 rounded-full transition-all"
                    style={{ width: `${obiettivo.progresso}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <FiCalendar />
                  <span>Scadenza: {obiettivo.scadenza}</span>
                </div>
                <div className="flex items-center gap-2 text-yellow-400 font-semibold">
                  <FiAward />
                  <span>{obiettivo.punti} punti</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Obiettivi Completati */}
      <div>
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FiCheck className="text-green-400" />
          Obiettivi Completati
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {obiettiviCompletati.map((obiettivo) => (
            <div
              key={obiettivo.id}
              className="bg-gray-900 rounded-xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FiCheck className="text-green-400" />
                    <h3 className="text-xl font-semibold line-through text-gray-500">{obiettivo.titolo}</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Completato il {obiettivo.completatoIl}</p>
                </div>
                <div className="flex items-center gap-2 text-green-400 font-semibold">
                  <FiAward />
                  <span>+{obiettivo.puntiGuadagnati}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
