"use client"

export default function CookiesPage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black mb-4">Cookie Policy</h1>
        <p className="text-gray-400">Ultimo aggiornamento: 27 Gennaio 2025</p>
      </div>

      <div className="prose prose-invert max-w-none space-y-8">
        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Cosa sono i Cookie</h2>
          <p className="text-gray-300 leading-relaxed">
            I cookie sono piccoli file di testo che vengono memorizzati sul tuo dispositivo quando visiti un sito web.
            Ci aiutano a fornire, proteggere e migliorare i nostri servizi.
          </p>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Tipi di Cookie che Utilizziamo</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">Cookie Essenziali</h3>
              <p className="text-gray-300">
                Necessari per il funzionamento del sito. Includono cookie di autenticazione e sicurezza.
                Non possono essere disabilitati.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Cookie di Prestazioni</h3>
              <p className="text-gray-300">
                Raccolgono informazioni su come utilizzi il sito per migliorare le prestazioni e l'esperienza utente.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">Cookie di Funzionalità</h3>
              <p className="text-gray-300">
                Permettono al sito di ricordare le tue preferenze (lingua, tema, ecc.) per offrirti un'esperienza personalizzata.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Cookie di Terze Parti</h2>
          <p className="text-gray-300 mb-4 leading-relaxed">Utilizziamo servizi di terze parti che possono impostare cookie:</p>
          <ul className="space-y-2 text-gray-300 list-disc list-inside">
            <li>
              <strong>Firebase:</strong> Autenticazione e database (cookie essenziali)
            </li>
            <li>
              <strong>Analytics:</strong> Per analizzare l'utilizzo del sito (se attivato)
            </li>
          </ul>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Gestione dei Cookie</h2>
          <p className="text-gray-300 leading-relaxed mb-4">
            Puoi gestire le preferenze dei cookie attraverso le impostazioni del tuo browser. Tuttavia, disabilitare
            alcuni cookie potrebbe limitare la funzionalità del sito.
          </p>
          <div className="bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-400">
              <strong>Nota:</strong> Attualmente non utilizziamo cookie di profilazione o marketing. Utilizziamo solo
              cookie tecnici necessari per il funzionamento della piattaforma.
            </p>
          </div>
        </section>

        <section className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <h2 className="text-2xl font-bold mb-4">Contatti</h2>
          <p className="text-gray-300 leading-relaxed">
            Per domande sulla Cookie Policy, contattaci a:{" "}
            <a href="mailto:privacy@brainhackingacademy.com" className="text-[#005FD7] hover:underline">
              privacy@brainhackingacademy.com
            </a>
          </p>
        </section>
      </div>
    </div>
  )
}
