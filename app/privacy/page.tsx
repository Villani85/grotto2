"use client"

export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Privacy Policy</h1>
        <p className="text-gray-400">Ultimo aggiornamento: 27 Gennaio 2025</p>
      </div>

      <div className="prose prose-invert max-w-none space-y-8">
        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">1. Introduzione</h2>
          <p className="text-gray-300 leading-relaxed">
            Brain Hacking Academy ("noi", "nostro", "nostra") rispetta la tua privacy e si impegna a proteggere i tuoi dati personali.
            Questa Privacy Policy spiega come raccogliamo, utilizziamo e proteggiamo le tue informazioni quando utilizzi la nostra piattaforma.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">2. Dati che Raccogliamo</h2>
          <div className="space-y-4 text-gray-300">
            <div>
              <h3 className="font-semibold mb-2">Dati di Registrazione</h3>
              <p>Email, nickname, password (criptata)</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Dati di Utilizzo</h3>
              <p>Progresso corsi, partecipazione eventi, interazioni community</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Dati Tecnici</h3>
              <p>Indirizzo IP, tipo di browser, dispositivo utilizzato</p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">3. Come Utilizziamo i Dati</h2>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li>Fornire e migliorare i nostri servizi</li>
            <li>Personalizzare la tua esperienza</li>
            <li>Comunicare con te riguardo al servizio</li>
            <li>Analizzare l'utilizzo della piattaforma</li>
            <li>Rispettare obblighi legali</li>
          </ul>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">4. Condivisione dei Dati</h2>
          <p className="text-gray-300 leading-relaxed">
            Non vendiamo i tuoi dati personali. Condividiamo i dati solo con fornitori di servizi che ci aiutano a operare la piattaforma
            (es. Firebase, hosting) e solo per scopi strettamente necessari.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">5. I Tuoi Diritti (GDPR)</h2>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li>Diritto di accesso ai tuoi dati</li>
            <li>Diritto di rettifica</li>
            <li>Diritto alla cancellazione</li>
            <li>Diritto alla portabilità dei dati</li>
            <li>Diritto di opposizione al trattamento</li>
          </ul>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">6. Contatti</h2>
          <p className="text-gray-300 leading-relaxed">
            Per esercitare i tuoi diritti o per domande sulla privacy, contattaci a:{" "}
            <a href="mailto:privacy@brainhackingacademy.com" className="text-[#005FD7] hover:underline">
              privacy@brainhackingacademy.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
