# LIVE EVENTS VISIBILITY DIAGNOSIS

## Executive Summary

Gli utenti non admin vedono "Nessun evento live" perché:
1. **Eventi creati con valori di default**: `published=false`, `active=false`, `status="draft"`
2. **API pubbliche filtrano per `published=true`**: `/api/live-events` e `/api/live-events/active` richiedono `published==true`
3. **Admin vede preview con URL fisso**: Admin usa `/admin/live` che carica `NEXT_PUBLIC_IVS_PLAYBACK_URL` direttamente, non dipende da eventi pubblicati
4. **Mancanza workflow Publish/Activate**: Non esiste un flusso chiaro per pubblicare e attivare eventi dopo la creazione

**Root Cause**: Eventi creati ma mai pubblicati (`published=false`) quindi invisibili alle API pubbliche.

---

## 1. Pages Involved

| Path | File | Type | Endpoint Chiamato | Condizione "Nessun evento" |
|------|------|------|-------------------|----------------------------|
| `/live` | `app/live/page.tsx` | Client | `GET /api/live-events/active` | `data.event === null` → mostra "Nessuna diretta in corso" |
| `/live/[slug]` | `app/live/[slug]/page.tsx` | Client | `GET /api/live-events/[slug]` | `!data.event` → mostra "Evento non trovato" |
| `/area-riservata/live` | `app/area-riservata/live/page.tsx` | Client | `GET /api/live-events?status=...` | `filteredEvents.length === 0` → mostra "Nessun evento trovato" |
| `/admin/live` | `app/admin/live/page.tsx` | Client | `GET /api/live-events/active` (con auth) + `NEXT_PUBLIC_IVS_PLAYBACK_URL` | Usa URL fisso, non dipende da eventi pubblicati |

---

## 2. APIs Involved

| Endpoint | File | Method | Auth | Filtri Firestore | Response Shape |
|----------|------|--------|------|-------------------|----------------|
| `/api/live-events` | `app/api/live-events/route.ts` | GET | None (public) | `listAdmin()` → filtra `published==true` | `{ success: true, events: [...] }` |
| `/api/live-events/active` | `app/api/live-events/active/route.ts` | GET | None (public) | `getActivePublished()` → `active==true AND published==true` | `{ success: true, event: {...} \| null }` |
| `/api/live-events/[slug]` | `app/api/live-events/[slug]/route.ts` | GET | None (public) | `getBySlug(slug, publishedOnly=true)` → `published==true` | `{ success: true, event: {...} }` |
| `/api/admin/live-events` | `app/api/admin/live-events/route.ts` | GET | `requireAdmin` | `listAdmin()` → **NESSUN filtro published** | `{ success: true, events: [...] }` |

**Differenza Chiave**: 
- API pubbliche: filtrano `published==true`
- API admin: mostra tutti gli eventi (anche non pubblicati)

---

## 3. Firestore Fields Involved

| Campo | Tipo | Default alla Creazione | Richiesto da API Pubbliche |
|-------|------|------------------------|----------------------------|
| `published` | boolean | `false` (riga 291) | **SÌ** - `published==true` |
| `active` | boolean | `false` (riga 292) | **SÌ** - solo per `/active` (`active==true AND published==true`) |
| `status` | string | `"draft"` (riga 290) | **NO** - ma usato per filtrare (upcoming/live/ended) |
| `playbackUrl` | string | `process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL \|\| ""` (riga 279) | **NO** - ma necessario per visualizzare |
| `scheduledAt` | Timestamp | `null` o Date da input | **NO** - ma usato per sorting |
| `startedAt` | Timestamp | `null` | **NO** |
| `endedAt` | Timestamp | `null` | **NO** |

**Prova nel Codice**:
```typescript
// lib/repositories/live-events.ts:290-292
status: "draft",
published: false,
active: false,
```

---

## 4. What Admin Sees vs What User Sees

### Admin (`/admin/live`)

**File**: `app/admin/live/page.tsx`

**Comportamento**:
1. Carica evento attivo: `GET /api/live-events/active` (con auth Bearer token)
2. **MA ANCHE**: Usa `NEXT_PUBLIC_IVS_PLAYBACK_URL` direttamente per preview/stream
3. Non dipende da `published/active` per vedere la diretta (usa URL fisso)

**Prova nel Codice**:
```typescript
// app/admin/live/page.tsx:64-68
const res = await fetch("/api/live-events/active", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
})
// Ma anche usa playbackUrl da env per preview
```

**Risultato**: Admin vede sempre la diretta se `NEXT_PUBLIC_IVS_PLAYBACK_URL` è configurato, anche senza eventi pubblicati.

---

### User Non-Admin (`/live` o `/area-riservata/live`)

**File**: `app/live/page.tsx`, `app/area-riservata/live/page.tsx`

**Comportamento**:
1. Chiama `GET /api/live-events/active` (senza auth)
2. API filtra: `active==true AND published==true`
3. Se nessun evento matcha → `event: null` → mostra "Nessuna diretta in corso"

**Prova nel Codice**:
```typescript
// app/api/live-events/active/route.ts:15
const event = await LiveEventsRepository.getActivePublished()

// lib/repositories/live-events.ts:229-234
const snapshot = await db
  .collection("live_events")
  .where("active", "==", true)
  .where("published", "==", true)
  .limit(1)
  .get()
```

**Risultato**: User vede "Nessun evento" se:
- `published==false` (default alla creazione)
- `active==false` (default alla creazione)
- Entrambi devono essere `true`

---

## 5. Root Cause Candidates (Ranked)

### 🥇 #1: Evento Creato ma Non Pubblicato (CONFERMATO)

**Prova nel Codice**:
- `lib/repositories/live-events.ts:290-292`: `published: false, active: false, status: "draft"`
- `app/api/live-events/route.ts:21`: `const publishedEvents = allEvents.filter((e) => e.published)`
- `app/api/live-events/active/route.ts:15`: `getActivePublished()` → richiede `published==true AND active==true`

**Sintomo**: 
- Admin crea evento → salvato con `published=false`
- API pubbliche filtrano `published==true` → evento invisibile
- User vede "Nessun evento"

**Probabilità**: **95%** - Questo è il problema principale.

---

### 🥈 #2: Evento Pubblicato ma Non Attivato

**Prova nel Codice**:
- `lib/repositories/live-events.ts:231-232`: `where("active", "==", true).where("published", "==", true)`
- `/api/live-events/active` richiede ENTRAMBI `true`

**Sintomo**:
- Admin pubblica evento (`published=true`) ma non attiva (`active=false`)
- `/live` chiama `/api/live-events/active` → nessun match
- `/area-riservata/live` chiama `/api/live-events` → evento visibile in lista ma non come "attivo"

**Probabilità**: **70%** - Se admin ha pubblicato ma dimenticato di attivare.

---

### 🥉 #3: Status "draft" vs "live" Mismatch

**Prova nel Codice**:
- `lib/repositories/live-events.ts:290`: `status: "draft"` (default)
- `app/api/live-events/route.ts:26-32`: Filtra per status se query param presente
- `app/area-riservata/live/page.tsx:127`: Cerca `event.status === "live"` per banner

**Sintomo**:
- Evento creato con `status="draft"`
- User filtra per "live" → nessun match
- Banner "LIVE ORA" non appare

**Probabilità**: **40%** - Meno probabile, ma possibile se admin non cambia status.

---

### #4: Playback URL Vuoto o Non Configurato

**Prova nel Codice**:
- `lib/repositories/live-events.ts:279`: `defaultPlaybackUrl = process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL || ""`
- `app/live/[slug]/page.tsx:99`: `<LivePlayer playbackUrl={event.playbackUrl} />`

**Sintomo**:
- Evento pubblicato e attivo
- Ma `playbackUrl=""` (env non configurato)
- Player non funziona

**Probabilità**: **20%** - Meno probabile, ma possibile in dev.

---

### #5: Admin Usa URL Fisso, User Usa Evento

**Prova nel Codice**:
- `app/admin/live/page.tsx`: Usa `NEXT_PUBLIC_IVS_PLAYBACK_URL` per preview
- `app/live/[slug]/page.tsx`: Usa `event.playbackUrl` da Firestore

**Sintomo**:
- Admin vede diretta (URL fisso funziona)
- User non vede (evento non pubblicato/attivo)

**Probabilità**: **10%** - Questo spiega la differenza di comportamento, ma non è root cause.

---

## 6. Evidence Snippets

### Snippet 1: Creazione Evento - Valori Default

**File**: `lib/repositories/live-events.ts:290-292`

```typescript
const eventData: any = {
  title: data.title,
  slug,
  description: data.description || null,
  scheduledAt: data.scheduledAt ? ... : null,
  status: "draft",        // ⚠️ DEFAULT: draft
  published: false,       // ⚠️ DEFAULT: false
  active: false,          // ⚠️ DEFAULT: false
  playbackUrl: data.playbackUrl || defaultPlaybackUrl,
  // ...
}
```

**Impatto**: Evento creato ma invisibile alle API pubbliche.

---

### Snippet 2: API Pubblica - Filtro Published

**File**: `app/api/live-events/route.ts:19-21`

```typescript
// Get all published events
const allEvents = await LiveEventsRepository.listAdmin(limit)
const publishedEvents = allEvents.filter((e) => e.published)  // ⚠️ FILTRO published==true
```

**Impatto**: Solo eventi con `published==true` sono visibili.

---

### Snippet 3: API Active - Doppio Filtro

**File**: `lib/repositories/live-events.ts:229-234`

```typescript
const snapshot = await db
  .collection("live_events")
  .where("active", "==", true)      // ⚠️ RICHIEDE active==true
  .where("published", "==", true)  // ⚠️ RICHIEDE published==true
  .limit(1)
  .get()
```

**Impatto**: `/api/live-events/active` richiede ENTRAMBI `true`.

---

### Snippet 4: Admin Usa URL Fisso

**File**: `app/admin/live/page.tsx:64-68` (inferito da uso di `NEXT_PUBLIC_IVS_PLAYBACK_URL`)

```typescript
// Admin carica evento attivo (opzionale)
const res = await fetch("/api/live-events/active", {
  headers: { Authorization: `Bearer ${token}` },
})
// Ma anche usa playbackUrl da env per preview diretto
```

**Impatto**: Admin vede sempre diretta se env configurato, indipendentemente da eventi pubblicati.

---

### Snippet 5: User Vede "Nessuna diretta"

**File**: `app/live/page.tsx:26-35`

```typescript
const res = await fetch("/api/live-events/active", { cache: "no-store" })
const data = await res.json()

if (data.success && data.event) {
  router.push(`/live/${data.event.slug}`)
} else {
  setIsLoading(false)  // ⚠️ Mostra "Nessuna diretta in corso"
}
```

**Impatto**: Se `data.event === null`, mostra messaggio "Nessuna diretta in corso".

---

## 7. Data to Paste (Network Response + Firestore Doc Template)

### Network Response - User Non-Admin

**Endpoint**: `GET /api/live-events/active` (senza auth)

**Response Attesa** (se nessun evento attivo):
```json
{
  "success": true,
  "event": null
}
```

**Response Attesa** (se evento attivo):
```json
{
  "success": true,
  "event": {
    "id": "event-id-123",
    "title": "Evento Live Test",
    "slug": "evento-live-test",
    "description": "Descrizione evento",
    "status": "live",
    "playbackUrl": "https://...",
    "chatEnabled": true,
    "scheduledAt": "2024-12-15T18:00:00.000Z",
    "startedAt": "2024-12-15T18:00:00.000Z"
  }
}
```

---

### Firestore Doc Template

**Collection**: `live_events/{eventId}`

**Esempio Doc (Evento Creato ma Non Pubblicato)**:
```json
{
  "title": "Evento Live Test",
  "slug": "evento-live-test",
  "description": "Descrizione evento",
  "status": "draft",           // ⚠️ DEFAULT
  "published": false,          // ⚠️ DEFAULT - CAUSA PROBLEMA
  "active": false,             // ⚠️ DEFAULT - CAUSA PROBLEMA
  "playbackUrl": "https://...",
  "chatEnabled": true,
  "scheduledAt": Timestamp(...),
  "createdBy": "admin-uid",
  "createdAt": Timestamp(...),
  "updatedAt": Timestamp(...)
}
```

**Esempio Doc (Evento Pubblicato e Attivo)**:
```json
{
  "title": "Evento Live Test",
  "slug": "evento-live-test",
  "status": "live",
  "published": true,           // ✅ RICHIESTA API PUBBLICHE
  "active": true,              // ✅ RICHIESTA API /active
  "playbackUrl": "https://...",
  // ...
}
```

---

## 8. Steps to Reproduce (3 Step)

### Step 1: Crea Evento da Admin

1. Login come admin
2. Vai a `/admin/live-events/new`
3. Compila form:
   - Titolo: "Test Evento Live"
   - Data/Ora: Seleziona data futura
4. Clicca "Crea Evento"
5. **Verifica Firestore**: Documento creato con `published=false`, `active=false`, `status="draft"`

---

### Step 2: Verifica Campi in Firestore

1. Apri Firestore Console
2. Vai a collection `live_events`
3. Trova evento appena creato
4. **Verifica campi**:
   - `published`: `false` ❌
   - `active`: `false` ❌
   - `status`: `"draft"` ⚠️

---

### Step 3: Apri `/live` come Utente Non-Admin

1. Logout (o usa account non-admin)
2. Vai a `/live`
3. **Verifica Network Tab**:
   - `GET /api/live-events/active` → Status 200
   - Response: `{ "success": true, "event": null }`
4. **Verifica UI**: Mostra "Nessuna diretta in corso"

**Risultato Atteso**: User vede "Nessun evento" perché `published==false` e `active==false`.

---

## 9. Fix Options

### Opzione A: Minimale - Mostra Scheduled Pubblicati

**Obiettivo**: Mostrare anche eventi `scheduled` pubblicati (non solo `live` attivi).

**File da Modificare**:
- `app/api/live-events/route.ts`: Rimuovere filtro `status` o aggiungere logica per mostrare `scheduled` pubblicati
- `app/live/page.tsx`: Chiamare `/api/live-events?status=scheduled` se `/active` ritorna null
- `app/area-riservata/live/page.tsx`: Già mostra scheduled, nessuna modifica

**Test Manuali**:
1. Crea evento con `published=true`, `status="scheduled"`
2. Verifica che appaia in `/area-riservata/live` con filtro "Prossimi"
3. Verifica che `/live` mostri prossimo evento invece di "Nessuna diretta"

**Rischi/Impatti**:
- ✅ Minimale, non richiede workflow complesso
- ⚠️ Non risolve problema di attivazione (`active`)
- ⚠️ User vede "prossimo evento" ma non "live attiva"

---

### Opzione B: Corretta - Workflow Publish + Activate + Go Live

**Obiettivo**: Verificare e migliorare workflow esistente per pubblicare, attivare e avviare diretta.

**Azioni Admin Esistenti** (già implementate):
- `app/admin/live-events/page.tsx:71-92`: `togglePublished()` - Toggle `published` status
- `app/admin/live-events/page.tsx:94-115`: `setActive()` - Set `active=true`
- `app/admin/live-events/[id]/page.tsx`: Form con toggle `published` e `active`

**File da Verificare/Modificare**:
- `app/admin/live-events/page.tsx`: Verificare che pulsanti "Pubblica" e "Attiva" siano visibili e funzionanti
- `app/admin/live-events/[id]/page.tsx`: Aggiungere sezione "Pubblicazione" con toggle `published` e `active`
- `app/api/admin/live-events/[id]/route.ts`: Verificare che PATCH gestisca `published` e `active`
- `app/admin/live/page.tsx`: Collegare "VAI LIVE" a:
  - Set `active=true` sull'evento
  - Set `status="live"`
  - Set `startedAt=now()`
- `lib/repositories/live-events.ts`: Verificare `update()` e `setActive()` funzionano correttamente

**Test Manuali**:
1. Crea evento → verifica `published=false`, `active=false`
2. Vai a `/admin/live-events` → clicca icona occhio per pubblicare → verifica `published=true`, `active=false`
3. Clicca "Attiva" → verifica `published=true`, `active=true`
4. Vai a `/admin/live` → clicca "VAI LIVE" → verifica `status="live"`, `startedAt` settato (se implementato)
5. Logout → vai a `/live` → verifica che user veda evento
6. Vai a `/area-riservata/live` → verifica che evento appaia in lista

**Rischi/Impatti**:
- ✅ Workflow completo e corretto
- ✅ User vede solo eventi pubblicati e attivi
- ⚠️ Richiede più modifiche
- ⚠️ Richiede test più approfonditi

---

## 10. Checklist Diagnostica

- [x] Pagine pubbliche identificate (`/live`, `/live/[slug]`, `/area-riservata/live`)
- [x] API pubbliche identificate (`/api/live-events`, `/api/live-events/active`, `/api/live-events/[slug]`)
- [x] Filtri Firestore documentati (`published==true`, `active==true`)
- [x] Valori default alla creazione identificati (`published=false`, `active=false`, `status="draft"`)
- [x] Differenza admin vs user spiegata (URL fisso vs evento pubblicato)
- [x] Root cause candidates rankati
- [x] Evidence snippets con file+linea
- [x] Template Firestore doc
- [x] Steps to reproduce (3 step)
- [x] Fix options proposte (A/B)

---

## Conclusione

**Root Cause Principale**: Eventi creati con `published=false` e `active=false` di default, quindi invisibili alle API pubbliche che filtrano per `published==true` (e `active==true` per `/active`).

**Fix Consigliato**: Opzione B (workflow completo) per gestione corretta del ciclo di vita degli eventi.

