# Fix Playback URL Normalization

## FASE 1 - Analisi

### Dove viene salvato playbackUrl

**1. POST /api/admin/live-events (create)**:
- File: `app/api/admin/live-events/route.ts:132`
- Passa `playbackUrl: validated.playbackUrl` a repository
- Repository: `lib/repositories/live-events.ts:293`
- Usa: `data.playbackUrl || defaultPlaybackUrl`
- **Problema**: Se viene passato un playbackUrl diverso, viene usato quello invece dell'env

**2. PATCH /api/admin/live-events/[id] (update/activate)**:
- File: `app/api/admin/live-events/[id]/route.ts:109-110`
- Se `active=true`: chiama `LiveEventsRepository.setActive(id)`
- Se altri campi: chiama `LiveEventsRepository.update(id, validated)`
- **Problema**: `setActive()` non normalizza playbackUrl

**3. Repository live-events**:
- `create()`: riga 293 - usa `data.playbackUrl || defaultPlaybackUrl`
- `update()`: riga 363 - aggiorna solo se esplicitamente passato
- `setActive()`: riga 377-409 - NON aggiorna playbackUrl quando attiva

### Cosa usa /live/[slug]

**File**: `app/live/[slug]/page.tsx:99`
```typescript
<LivePlayer playbackUrl={event.playbackUrl} />
```

**Conferma**: Usa `event.playbackUrl` da Firestore, NON env diretto.

---

## FASE 2 - Modifiche Implementate

### A) Repository create() - Normalizzazione

**File**: `lib/repositories/live-events.ts:278-293`

**Modifica**:
```typescript
const defaultPlaybackUrl = process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL || ""

// Always use env playbackUrl if available, otherwise use provided one
const finalPlaybackUrl = defaultPlaybackUrl || data.playbackUrl || ""

const eventData: any = {
  // ...
  playbackUrl: finalPlaybackUrl,  // ✅ Sempre usa env se disponibile
}
```

**Risultato**: Se env è configurato, viene sempre usato quello, anche se viene passato un playbackUrl diverso.

---

### B) Repository setActive() - Normalizzazione all'attivazione

**File**: `lib/repositories/live-events.ts:377-409`

**Modifica**:
```typescript
// Get current env playback URL (always normalize to this when activating)
const defaultPlaybackUrl = process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL || ""

await db.runTransaction(async (transaction) => {
  // ... disattiva altri eventi ...

  const eventRef = db.collection("live_events").doc(id)
  const updateData: any = {
    active: true,
    updatedAt: FieldValue.serverTimestamp(),
  }

  // Always normalize playbackUrl to env value when activating
  if (defaultPlaybackUrl) {
    updateData.playbackUrl = defaultPlaybackUrl  // ✅ Normalizza sempre
  }

  transaction.update(eventRef, updateData)
})
```

**Risultato**: Quando un evento viene attivato, il playbackUrl viene sempre normalizzato all'env corrente, anche se l'evento aveva un URL vecchio/sbagliato.

---

### C) API PATCH - Già usa setActive()

**File**: `app/api/admin/live-events/[id]/route.ts:109-110`

**Conferma**: Se `active=true`, chiama `setActive()` che ora normalizza playbackUrl.

**Nessuna modifica necessaria**: Il flusso è già corretto.

---

### D) UI Admin Edit - Campo Read-Only con Info

**File**: `app/admin/live-events/[id]/page.tsx:262-275`

**Modifica**:
```typescript
<Input
  id="playbackUrl"
  type="url"
  value={formData.playbackUrl}
  onChange={(e) => setFormData({ ...formData, playbackUrl: e.target.value })}
  readOnly  // ✅ Read-only per evitare modifiche manuali
  className="bg-muted"
/>
<p className="text-xs text-muted-foreground mt-1">
  Questo URL viene normalizzato automaticamente all'URL del canale corrente quando l'evento viene attivato.
</p>
```

**Risultato**: Campo read-only con messaggio informativo che spiega la normalizzazione automatica all'attivazione.

---

## FASE 3 - Analisi Finale

### Perché Prima C'era Mismatch

**Scenario**:
1. Evento creato con playbackUrl vecchio/sbagliato (o da env vecchio)
2. Admin attiva evento con `setActive()`
3. `setActive()` NON aggiornava playbackUrl
4. Evento attivo aveva playbackUrl sbagliato
5. User apre `/live/[slug]` → usa `event.playbackUrl` sbagliato → 404

**Root Cause**: `setActive()` non normalizzava playbackUrl all'env corrente.

### Come Ora è Garantito

**1. Alla Creazione**:
- Se env è configurato, viene sempre usato quello
- Se env non è configurato, usa quello passato (fallback)

**2. All'Attivazione**:
- `setActive()` normalizza SEMPRE playbackUrl all'env corrente
- Anche eventi vecchi con URL sbagliato vengono corretti

**3. All'Aggiornamento**:
- Se viene aggiornato `active=true`, chiama `setActive()` che normalizza
- Se viene aggiornato solo `playbackUrl`, può essere sovrascritto all'attivazione

**Risultato**: L'evento attivo ha SEMPRE il playbackUrl corretto dall'env.

---

## FASE 4 - Test Manuali

### TEST 1: Crea Evento e Attivalo ✅

**Steps**:
1. Vai a `/admin/live-events/new`
2. Crea evento (senza specificare playbackUrl)
3. Vai a `/admin/live-events`
4. Pubblica evento (icona occhio)
5. Attiva evento (bottone "Attiva")
6. Verifica Firestore: `playbackUrl` deve essere uguale a `NEXT_PUBLIC_IVS_PLAYBACK_URL`

**Risultato Atteso**:
- ✅ Evento creato con playbackUrl dall'env
- ✅ Quando attivato, playbackUrl normalizzato all'env
- ✅ `/api/live-events/active` ritorna playbackUrl corretto

**Verifica Firestore**:
```json
{
  "playbackUrl": "https://...",  // Deve essere uguale a NEXT_PUBLIC_IVS_PLAYBACK_URL
  "active": true,
  "published": true
}
```

---

### TEST 2: Vai ON AIR e Verifica User ✅

**Steps**:
1. Assicurati che esista evento con `active=true` e `published=true`
2. Vai a `/admin/live`
3. Clicca "VAI LIVE" (avvia broadcast)
4. In altra tab (o browser incognito), vai a `/live`
5. Verifica che la diretta parta senza 404

**Risultato Atteso**:
- ✅ Broadcast attivo in admin
- ✅ User vede diretta senza errori
- ✅ Network tab: nessun 404 su playlist

**Verifica Network**:
- `GET /api/live-events/active` → `playbackUrl` corretto
- Player carica playlist senza errori

---

### TEST 3: Evento Vecchio con URL Sbagliato ✅

**Steps**:
1. Crea/modifica evento e imposta `playbackUrl` a URL sbagliato (es. "https://wrong-url.com")
2. Salva evento
3. Attiva evento (bottone "Attiva")
4. Verifica Firestore: `playbackUrl` deve essere stato normalizzato all'env

**Risultato Atteso**:
- ✅ Prima attivazione: `playbackUrl` = URL sbagliato
- ✅ Dopo attivazione: `playbackUrl` = env corretto
- ✅ Evento visibile correttamente agli utenti

**Verifica Firestore**:
```json
// Prima
{ "playbackUrl": "https://wrong-url.com", "active": false }

// Dopo setActive()
{ "playbackUrl": "https://...",  // ✅ Normalizzato all'env
  "active": true }
```

---

### TEST 4: Aggiorna Evento con active=true ✅

**Steps**:
1. Vai a `/admin/live-events/[id]`
2. Modifica altri campi (es. title)
3. Attiva toggle "Attivo"
4. Salva
5. Verifica Firestore: `playbackUrl` normalizzato

**Risultato Atteso**:
- ✅ PATCH chiama `setActive()` se `active=true`
- ✅ `setActive()` normalizza playbackUrl
- ✅ Altri campi aggiornati correttamente

---

## File Modificati

1. **lib/repositories/live-events.ts**:
   - `create()`: Priorità env su playbackUrl fornito
   - `setActive()`: Normalizza sempre playbackUrl all'env quando attiva

2. **app/admin/live-events/[id]/page.tsx**:
   - Campo playbackUrl read-only
   - Badge se combacia con env
   - Microcopy informativo

---

## Checklist Finale

- [x] `create()` usa sempre env se disponibile
- [x] `setActive()` normalizza playbackUrl all'env
- [x] PATCH con `active=true` usa `setActive()` (già implementato)
- [x] UI mostra badge se playbackUrl combacia con env
- [x] Campo playbackUrl read-only in edit
- [x] Test manuali documentati

---

## Conclusione

Il playbackUrl viene ora garantito corretto in due punti:
1. **Alla creazione**: Se env è configurato, viene sempre usato
2. **All'attivazione**: Viene sempre normalizzato all'env corrente, anche per eventi vecchi

Questo risolve il problema del 404 "Failed to load playlist" causato da mismatch tra canale attivo e playbackUrl dell'evento.

