# Admin Live - Evento Attivo Status Box

## FASE 1 - Analisi Iniziale

### Struttura Pagina

**File**: `app/admin/live/page.tsx`

**Punto di Inserimento Identificato**:
- **Posizione**: All'inizio di `CardContent`, subito dopo l'apertura (riga ~715)
- **Ragione**: Visibile subito, non interferisce con logica broadcast esistente
- **Layout**: DemoModeBanner → Card → CardContent → **[NUOVO BOX QUI]** → Info Recording → Status → Canvas → Controls

**Struttura Esistente**:
- Client Component (`"use client"`)
- Usa già `useState`, `useEffect`, `useRef`
- Ha già `activeEvent` state ma solo per metadata (con auth)
- Ha funzione `loadActiveEvent()` ma usa auth token

---

## FASE 2 - Modifiche Implementate

### A) Stato e Fetch

**State Aggiunti**:
```typescript
const [publicActiveEvent, setPublicActiveEvent] = useState<{
  id: string
  title: string
  slug: string
  status: string
  playbackUrl?: string
  chatEnabled?: boolean
} | null>(null)
const [isLoadingPublicEvent, setIsLoadingPublicEvent] = useState(false)
const [publicEventError, setPublicEventError] = useState<string | null>(null)
```

**Funzione `loadPublicActiveEvent()`**:
- Fetch senza auth: `fetch("/api/live-events/active", { cache: "no-store" })`
- Parsing robusto: `res.text()` → `JSON.parse()` con try/catch
- Gestione errori: set `publicEventError` se fallisce
- Set `publicActiveEvent` se `data.event` presente, altrimenti `null`

**useEffect**:
- Chiama `loadPublicActiveEvent()` all'avvio del componente

### B) UI Box

**Posizione**: All'inizio di `CardContent`, prima di "Info: Recording"

**Stati Visualizzati**:

1. **Loading**: "Carico evento attivo..."
2. **Error**: Messaggio errore + bottone "Riprova"
3. **Evento Presente**:
   - Titolo: "✅ Evento attivo pubblicato"
   - Badge: "VISIBILE AGLI UTENTI ✅"
   - Dettagli: titolo, slug, status
   - Link: `/live/${slug}` (target blank)
   - Bottone: "Aggiorna stato evento"
   - Microcopy: "Gli utenti vedranno questo evento in /live"
4. **Nessun Evento**:
   - Titolo: "⚠️ Nessun evento attivo pubblicato"
   - Testo esplicativo
   - Bottoni: "Gestisci eventi" → `/admin/live-events`, "Crea evento" → `/admin/live-events/new`
   - Bottone: "Aggiorna stato evento"

### C) Non Interferenza

- Nessuna modifica a logica broadcast esistente
- State separati (`publicActiveEvent` vs `activeEvent`)
- Fetch separato (senza auth vs con auth)
- Nessuna dipendenza nuova

---

## FASE 3 - Analisi Finale

### Perché Prima l'Admin Poteva Vedere Preview Senza Evento

**Admin (`/admin/live`)**:
- Usa `NEXT_PUBLIC_IVS_PLAYBACK_URL` direttamente per preview/stream
- Non dipende da eventi pubblicati per vedere la diretta
- Può avviare broadcast anche senza evento attivo

**User (`/live`)**:
- Chiama `/api/live-events/active` (pubblico, senza auth)
- API filtra: `active==true AND published==true`
- Se nessun evento matcha → `event: null` → "Nessuna diretta in corso"

**Risultato**: Admin vede sempre diretta (se env configurato), user vede "Nessun evento" se evento non pubblicato/attivo.

### Come il Box Previene l'Errore Operativo

**Prima**:
- Admin avvia diretta senza pubblicare/attivare evento
- Admin vede preview funzionante
- User vede "Nessuna diretta"
- **Problema**: Admin non sa che user non vede nulla

**Dopo**:
- Box mostra sempre stato evento pubblico attivo
- Se nessun evento → warning visibile + bottoni per gestire
- Admin sa immediatamente se user vede o no
- **Prevenzione**: Admin non può "dimenticare" di pubblicare/attivare

---

## FASE 4 - Test Manuali

### TEST 1: Nessun Evento Attivo Pubblicato ✅

**Steps**:
1. Assicurati che non esista evento con `active=true AND published=true` in Firestore
2. Vai a `/admin/live`

**Risultato Atteso**:
- ✅ Box mostra: "⚠️ Nessun evento attivo pubblicato"
- ✅ Testo esplicativo visibile
- ✅ Bottoni "Gestisci eventi" e "Crea evento" presenti e funzionanti
- ✅ Bottone "Aggiorna stato evento" presente
- ✅ Broadcast controls funzionano normalmente

**Verifica**:
- Box visibile in alto, prima di "Info: Recording"
- Link funzionano correttamente

---

### TEST 2: Evento Attivo Pubblicato Presente ✅

**Steps**:
1. Vai a `/admin/live-events`
2. Crea o modifica evento:
   - Imposta `published=true` (icona occhio)
   - Clicca "Attiva" per impostare `active=true`
3. Vai a `/admin/live`

**Risultato Atteso**:
- ✅ Box mostra: "✅ Evento attivo pubblicato"
- ✅ Badge "VISIBILE AGLI UTENTI ✅" visibile
- ✅ Dettagli evento: titolo, slug, status
- ✅ Link "Apri pagina pubblica" funziona e apre `/live/[slug]` in nuova tab
- ✅ Bottone "Aggiorna stato evento" presente
- ✅ Microcopy "Gli utenti vedranno questo evento in /live" visibile

**Verifica**:
- Link pubblico apre pagina corretta
- Dettagli corrispondono all'evento in Firestore

---

### TEST 3: Refresh Stato Evento ✅

**Steps**:
1. Apri `/admin/live` con evento attivo presente
2. In altra tab, vai a `/admin/live-events` e disattiva l'evento (o attiva altro evento)
3. Torna a `/admin/live` e clicca "Aggiorna stato evento"

**Risultato Atteso**:
- ✅ Box si aggiorna senza refresh pagina
- ✅ Se evento disattivato: box passa a stato "Nessun evento attivo"
- ✅ Se altro evento attivato: box mostra nuovo evento
- ✅ Nessun errore in console

**Verifica**:
- Network tab mostra `GET /api/live-events/active` al click
- UI si aggiorna correttamente

---

### TEST 4: Errore di Rete ✅

**Steps**:
1. Apri `/admin/live`
2. Disconnetti internet (o blocca richiesta in DevTools)
3. Clicca "Aggiorna stato evento"

**Risultato Atteso**:
- ✅ Box mostra: "⚠️ Impossibile verificare evento attivo: [errore]"
- ✅ Bottone "Riprova" presente
- ✅ Broadcast controls continuano a funzionare
- ✅ Nessun crash della pagina

**Verifica**:
- Messaggio errore leggibile
- UI non bloccata

---

## Diff File Modificato

### app/admin/live/page.tsx

```diff
+ import Link from "next/link"

  export default function AdminLivePage() {
    // ... existing state ...
+   // Public active event state (for visibility check)
+   const [publicActiveEvent, setPublicActiveEvent] = useState<{
+     id: string
+     title: string
+     slug: string
+     status: string
+     playbackUrl?: string
+     chatEnabled?: boolean
+   } | null>(null)
+   const [isLoadingPublicEvent, setIsLoadingPublicEvent] = useState(false)
+   const [publicEventError, setPublicEventError] = useState<string | null>(null)

+   // Load public active event (no auth required, for visibility check)
+   const loadPublicActiveEvent = async () => {
+     setIsLoadingPublicEvent(true)
+     setPublicEventError(null)
+     try {
+       const res = await fetch("/api/live-events/active", { cache: "no-store" })
+       const text = await res.text()
+       let data: any = null
+       if (text && text.trim() !== "") {
+         try {
+           data = JSON.parse(text)
+         } catch (parseError) {
+           setPublicEventError("Risposta non valida dal server")
+           setPublicActiveEvent(null)
+           return
+         }
+       }
+       if (!res.ok || !data?.success) {
+         setPublicEventError(data?.error || `Errore ${res.status}`)
+         setPublicActiveEvent(null)
+         return
+       }
+       if (data.event) {
+         setPublicActiveEvent({ ... })
+       } else {
+         setPublicActiveEvent(null)
+       }
+     } catch (err: any) {
+       setPublicEventError(err.message || "Errore di rete")
+       setPublicActiveEvent(null)
+     } finally {
+       setIsLoadingPublicEvent(false)
+     }
+   }

+   useEffect(() => {
+     loadPublicActiveEvent()
+   }, [])

    return (
    <AdminRequired>
      <div className="py-8">
        <DemoModeBanner />
        <Card>
          <CardHeader>
            <CardTitle>Studio Diretta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
+           {/* Public Active Event Status Box */}
+           <div className="rounded-md border p-4 space-y-3">
+             {isLoadingPublicEvent ? (
+               <div>Carico evento attivo...</div>
+             ) : publicEventError ? (
+               <div>
+                 <p>⚠️ Impossibile verificare evento attivo: {publicEventError}</p>
+                 <Button onClick={loadPublicActiveEvent}>Riprova</Button>
+               </div>
+             ) : publicActiveEvent ? (
+               <div>
+                 <h3>✅ Evento attivo pubblicato</h3>
+                 <span>VISIBILE AGLI UTENTI ✅</span>
+                 <p>Titolo: {publicActiveEvent.title}</p>
+                 <p>Slug: {publicActiveEvent.slug}</p>
+                 <p>Status: {publicActiveEvent.status}</p>
+                 <Link href={`/live/${publicActiveEvent.slug}`}>
+                   <Button>Apri pagina pubblica</Button>
+                 </Link>
+                 <Button onClick={loadPublicActiveEvent}>Aggiorna stato evento</Button>
+                 <p>Gli utenti vedranno questo evento in /live</p>
+               </div>
+             ) : (
+               <div>
+                 <h3>⚠️ Nessun evento attivo pubblicato</h3>
+                 <p>La diretta può essere attiva, ma gli utenti vedranno "Nessuna diretta"...</p>
+                 <Link href="/admin/live-events">
+                   <Button>Gestisci eventi</Button>
+                 </Link>
+                 <Link href="/admin/live-events/new">
+                   <Button>Crea evento</Button>
+                 </Link>
+                 <Button onClick={loadPublicActiveEvent}>Aggiorna stato evento</Button>
+               </div>
+             )}
+           </div>

            {/* Info: Recording */}
            {/* ... rest of existing code ... */}
```

---

## Checklist Finale

- [x] State aggiunti per publicActiveEvent, loading, error
- [x] Funzione loadPublicActiveEvent() implementata (senza auth)
- [x] Parsing robusto con gestione errori
- [x] useEffect per caricare all'avvio
- [x] Box UI implementato con tutti gli stati
- [x] Link a pagine admin e pubblica funzionanti
- [x] Bottone "Aggiorna stato evento" presente
- [x] Non interferisce con logica broadcast esistente
- [x] Test manuali documentati

---

## Conclusione

Il box "Evento attivo" è stato aggiunto con successo in `/admin/live`. L'admin ora vede sempre lo stato dell'evento pubblico attivo e può verificare immediatamente se gli utenti vedranno la diretta. Questo previene l'errore operativo di avviare broadcast senza pubblicare/attivare evento.

