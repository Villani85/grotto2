"use client"

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Termini di Servizio</h1>
        <p className="text-gray-400">Ultimo aggiornamento: 27 Gennaio 2025</p>
      </div>

      <div className="prose prose-invert max-w-none space-y-8">
        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">1. Accettazione dei Termini</h2>
          <p className="text-gray-300 leading-relaxed">
            Accedendo e utilizzando Brain Hacking Academy, accetti di essere vincolato da questi Termini di Servizio.
            Se non accetti questi termini, non utilizzare la piattaforma.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">2. Account e Registrazione</h2>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li>Devi avere almeno 18 anni per registrarti</li>
            <li>Sei responsabile di mantenere la sicurezza del tuo account</li>
            <li>Non condividere le tue credenziali con altri</li>
            <li>Notificaci immediatamente di qualsiasi uso non autorizzato</li>
          </ul>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">3. Utilizzo del Servizio</h2>
          <p className="text-gray-300 mb-4 leading-relaxed">Ti è vietato:</p>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li>Utilizzare il servizio per scopi illegali</li>
            <li>Violare diritti di proprietà intellettuale</li>
            <li>Interferire con il funzionamento della piattaforma</li>
            <li>Condividere contenuti offensivi o inappropriati</li>
          </ul>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">4. Abbonamento e Pagamenti</h2>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li>Gli abbonamenti si rinnovano automaticamente</li>
            <li>Puoi cancellare in qualsiasi momento</li>
            <li>I rimborsi sono gestiti secondo la nostra Politica di Rimborso</li>
            <li>I prezzi possono essere modificati con preavviso di 30 giorni</li>
          </ul>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">5. Proprietà Intellettuale</h2>
          <p className="text-gray-300 leading-relaxed">
            Tutti i contenuti della piattaforma (corsi, video, testi) sono di proprietà di Brain Hacking Academy
            e protetti da copyright. È vietata la riproduzione, distribuzione o condivisione non autorizzata.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">6. Limitazione di Responsabilità</h2>
          <p className="text-gray-300 leading-relaxed">
            Brain Hacking Academy fornisce il servizio "così com'è". Non garantiamo che il servizio sarà
            ininterrotto, sicuro o privo di errori. Non siamo responsabili per danni derivanti dall'utilizzo del servizio.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">7. Modifiche ai Termini</h2>
          <p className="text-gray-300 leading-relaxed">
            Ci riserviamo il diritto di modificare questi termini in qualsiasi momento. Le modifiche entreranno
            in vigore immediatamente dopo la pubblicazione. Il tuo utilizzo continuato del servizio costituisce
            accettazione dei nuovi termini.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">8. Contatti</h2>
          <p className="text-gray-300 leading-relaxed">
            Per domande sui Termini di Servizio, contattaci a:{" "}
            <a href="mailto:legal@brainhackingacademy.com" className="text-[#005FD7] hover:underline">
              legal@brainhackingacademy.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
