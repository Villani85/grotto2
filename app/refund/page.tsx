"use client"

import { FiCheck, FiX, FiClock } from "react-icons/fi"

export default function RefundPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Politica di Rimborso</h1>
        <p className="text-gray-400">Ultimo aggiornamento: 27 Gennaio 2025</p>
      </div>

      <div className="prose prose-invert max-w-none space-y-8">
        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Garanzia Soddisfatti o Rimborsati</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Offriamo una garanzia di rimborso completo entro i primi <strong>30 giorni</strong> dall'acquisto
            se non sei completamente soddisfatto del servizio.
          </p>
          <div className="bg-[#005FD7]/10 border border-[#005FD7]/20 rounded-lg p-4">
            <p className="text-[#005FD7] font-semibold">
              ✓ Rimborso completo entro 30 giorni senza domande
            </p>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Come Richiedere un Rimborso</h2>
          <ol className="space-y-3 text-gray-300 list-decimal list-inside">
            <li>Invia una richiesta via email a refund@brainhackingacademy.com</li>
            <li>Includi il tuo numero di ordine o email utilizzata per l'iscrizione</li>
            <li>Indica il motivo della richiesta (opzionale ma apprezzato)</li>
            <li>Riceverai conferma entro 48 ore</li>
            <li>Il rimborso verrà processato entro 5-10 giorni lavorativi</li>
          </ol>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Casi di Rimborso</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FiCheck className="text-green-400 text-xl flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Rimborso Completo (entro 30 giorni)</h3>
                <p className="text-gray-300 text-sm">Se non sei soddisfatto per qualsiasi motivo</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FiCheck className="text-green-400 text-xl flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Rimborso Parziale</h3>
                <p className="text-gray-300 text-sm">Per problemi tecnici persistenti o servizio non erogato</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FiX className="text-red-400 text-xl flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Nessun Rimborso</h3>
                <p className="text-gray-300 text-sm">Dopo 30 giorni dall'acquisto o per violazione dei Termini di Servizio</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Tempi di Rimborso</h2>
          <div className="space-y-3 text-gray-300">
            <div className="flex items-center gap-3">
              <FiClock className="text-[#005FD7]" />
              <span><strong>Processamento:</strong> 5-10 giorni lavorativi</span>
            </div>
            <div className="flex items-center gap-3">
              <FiClock className="text-[#005FD7]" />
              <span><strong>Carta di Credito:</strong> 3-5 giorni lavorativi dopo processamento</span>
            </div>
            <div className="flex items-center gap-3">
              <FiClock className="text-[#005FD7]" />
              <span><strong>PayPal:</strong> 1-3 giorni lavorativi dopo processamento</span>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Cosa Succede Dopo il Rimborso</h2>
          <p className="text-gray-300 leading-relaxed">
            Dopo il processamento del rimborso, il tuo accesso alla piattaforma verrà revocato.
            Potrai comunque mantenere l'accesso ai contenuti scaricati durante il periodo di abbonamento.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Contatti</h2>
          <p className="text-gray-300 leading-relaxed">
            Per richieste di rimborso o domande, contattaci a:{" "}
            <a href="mailto:refund@brainhackingacademy.com" className="text-[#005FD7] hover:underline">
              refund@brainhackingacademy.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
