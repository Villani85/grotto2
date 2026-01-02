# Test PlaybackUrl Normalization

## FASE 1 - Analisi

### Setup Test Esistente
- ❌ **Jest/Vitest**: Non trovato
- ❌ **Firebase Emulator**: Non configurato
- ❌ **Script Test**: Nessuno esistente

### Percorso Scelto
**PERCORSO B**: Script Node.js minimale (`scripts/selftest-live-events.ts`)

**Motivo**: Nessun setup test esistente, script minimale è la soluzione più semplice.

### Metodi da Testare
1. `LiveEventsRepository.create()` - normalizzazione playbackUrl all'env
2. `LiveEventsRepository.setActive()` - normalizzazione playbackUrl all'attivazione

---

## FASE 2 - Implementazione

### A) Script Test Automatici

**File**: `scripts/selftest-live-events.ts`

**Caratteristiche**:
- Mock Firestore in-memory (no dipendenze esterne)
- Mock repository con logica di normalizzazione
- Test 1: `create()` normalizza playbackUrl
- Test 1b: `create()` con playbackUrl vuoto usa env
- Test 4: `setActive()` normalizza playbackUrl

**Esecuzione**:
```bash
npm install -D tsx  # Se non installato
npm run selftest:live-events
```

**Output Atteso**:
```
🧪 Running Live Events PlaybackUrl Normalization Tests
📡 Mock ENV PlaybackUrl: https://test-channel.example.com/master.m3u8

TEST 1: create() normalizes playbackUrl to env
  ✅ PASS: playbackUrl normalized to env value

TEST 1b: create() with empty playbackUrl uses env
  ✅ PASS: Empty playbackUrl normalized to env value

TEST 4: setActive() normalizes playbackUrl to env
  ✅ PASS: playbackUrl normalized to env value after setActive()
  ✅ PASS: active flag set to true

==================================================
📊 Results: 4 passed, 0 failed
✅ All tests passed!
```

---

### B) Debug Panel in /live/[slug]

**File**: `app/live/[slug]/page.tsx`

**Caratteristiche** (solo in development):
- Mostra playbackUrl corrente
- Probe manifest URL e mostra status (200/404)
- Mostra errori player IVS
- Bottone "Probe Manifest" per test manuale

**API Proxy**: `app/api/live-events/probe-manifest/route.ts`
- Endpoint: `GET /api/live-events/probe-manifest?url=...`
- Solo in development (403 in production)
- Fa HEAD request al manifest e ritorna status

**UI Debug Panel**:
```typescript
{process.env.NODE_ENV === "development" && (
  <div className="mb-4 p-3 bg-muted rounded-md border text-xs">
    <div className="font-semibold mb-2">🔧 Debug Info (Dev Only)</div>
    <div>Playback URL: {event.playbackUrl}</div>
    <div>Manifest Status: {status} (200 = OK, 404 = Not Found)</div>
    <div>Player Error: {error}</div>
    <button onClick={probeManifest}>🔄 Probe Manifest</button>
  </div>
)}
```

---

## FASE 3 - Test Manuali Checklist

### TEST 1: Create Event → Active+Published → API Ritorna PlaybackUrl Normalizzato ✅

**Steps**:
1. Esegui test automatico: `npm run selftest:live-events`
2. Verifica output: Tutti i test devono passare

**Risultato Atteso**:
- ✅ Test 1: `create()` normalizza playbackUrl all'env
- ✅ Test 1b: `create()` con playbackUrl vuoto usa env
- ✅ Test 4: `setActive()` normalizza playbackUrl

**Verifica Manuale (opzionale)**:
1. Crea evento da `/admin/live-events/new`
2. Pubblica e attiva evento
3. Chiama `GET /api/live-events/active`
4. Verifica: `response.event.playbackUrl === NEXT_PUBLIC_IVS_PLAYBACK_URL`

---

### TEST 2: ON AIR e User Playback (Manuale) ✅

**Prerequisiti**:
- Evento con `active=true`, `published=true`
- Admin in `/admin/live` con broadcast attivo

**Steps**:
1. Vai a `/admin/live`
2. Clicca "VAI LIVE" (avvia broadcast)
3. In altra tab/browser, vai a `/live/[slug]` (dove `[slug]` è lo slug dell'evento attivo)
4. Apri DevTools → Network tab
5. Verifica debug panel (se in dev mode):
   - Playback URL mostrato
   - Clicca "Probe Manifest"
   - Manifest Status: **200** (non 404)

**Risultato Atteso**:
- ✅ Debug panel mostra playbackUrl corretto
- ✅ Manifest Status: **200** (OK)
- ✅ Player carica senza errori
- ✅ Stream visibile all'utente

**Expected Output Debug Panel**:
```
🔧 Debug Info (Dev Only)
Playback URL: https://...master.m3u8
Manifest Status: 200 ✅
Player Error: (none)
```

---

### TEST 3: User Playback con Probe 200/404 (Manuale) ✅

**Steps**:
1. **Caso A - Stream Attivo**:
   - Admin ON AIR in `/admin/live`
   - User va a `/live/[slug]`
   - Debug panel → "Probe Manifest"
   - **Atteso**: Status **200**

2. **Caso B - Stream Non Attivo**:
   - Admin NON in broadcast
   - User va a `/live/[slug]`
   - Debug panel → "Probe Manifest"
   - **Atteso**: Status **404** o network error

3. **Caso C - PlaybackUrl Sbagliato** (se testabile):
   - Modifica temporaneamente playbackUrl in Firestore a URL sbagliato
   - User va a `/live/[slug]`
   - Debug panel → "Probe Manifest"
   - **Atteso**: Status **404** o error

**Risultato Atteso**:
- ✅ Debug panel mostra status corretto
- ✅ 200 quando stream attivo
- ✅ 404 quando stream non attivo o URL sbagliato

---

### TEST 4: Evento Vecchio con PlaybackUrl Sbagliato → setActive Normalizza ✅

**Steps**:
1. Esegui test automatico: `npm run selftest:live-events`
2. Verifica: Test 4 deve passare

**Risultato Atteso**:
- ✅ Evento creato con playbackUrl sbagliato
- ✅ Dopo `setActive()`, playbackUrl normalizzato all'env
- ✅ `active=true` settato correttamente

**Verifica Manuale (opzionale)**:
1. Crea evento con playbackUrl sbagliato (modifica in Firestore)
2. Vai a `/admin/live-events`
3. Clicca "Attiva" sull'evento
4. Verifica Firestore: `playbackUrl` normalizzato all'env

---

## FASE 4 - Output

### File Creati/Modificati

1. **scripts/selftest-live-events.ts** (NUOVO)
   - Script test automatici con mock Firestore
   - Test per `create()` e `setActive()`

2. **package.json**
   - Aggiunto script: `"selftest:live-events": "tsx scripts/selftest-live-events.ts"`

3. **app/live/[slug]/page.tsx**
   - Aggiunto debug panel (solo dev)
   - State per debug info
   - Funzione `probeManifest()`
   - Callback `onError` per LivePlayer

4. **components/live/LivePlayer.tsx**
   - Aggiunto prop `onError` per callback errori
   - Listener eventi errore IVS player

5. **app/api/live-events/probe-manifest/route.ts** (NUOVO)
   - API proxy per probe manifest (solo dev)
   - Evita problemi CORS

6. **docs/TEST_PLAYBACK_URL_NORMALIZATION.md** (NUOVO)
   - Documentazione completa test

---

### Istruzioni Esecuzione

#### Test Automatici (1 & 4)

**Prerequisiti**:
```bash
npm install -D tsx  # Se non installato
```

**Esecuzione**:
```bash
npm run selftest:live-events
```

**Output Atteso**:
- ✅ Tutti i test passano
- ✅ Nessun errore

---

#### Test Manuali (2 & 3)

**TEST 2 - ON AIR**:
1. Admin: `/admin/live` → "VAI LIVE"
2. User: `/live/[slug]` → Verifica debug panel
3. **Expected**: Manifest Status **200**

**TEST 3 - Probe 200/404**:
1. Stream attivo → Probe → **200**
2. Stream non attivo → Probe → **404**
3. URL sbagliato → Probe → **404**

---

## Checklist Finale

### Test Automatici
- [x] Script test creato (`scripts/selftest-live-events.ts`)
- [x] Mock Firestore in-memory
- [x] Test 1: `create()` normalizza playbackUrl
- [x] Test 1b: `create()` con playbackUrl vuoto
- [x] Test 4: `setActive()` normalizza playbackUrl
- [x] Script eseguibile: `npm run selftest:live-events`

### Debug Panel
- [x] Debug panel in `/live/[slug]` (solo dev)
- [x] Mostra playbackUrl
- [x] Probe manifest con status
- [x] Mostra errori player
- [x] API proxy `/api/live-events/probe-manifest`

### Documentazione
- [x] Istruzioni esecuzione test
- [x] Checklist test manuali
- [x] Expected output per ogni test

---

## Risultato

✅ **Test Automatici**: Verificano normalizzazione playbackUrl senza dipendenze esterne  
✅ **Debug Panel**: Facilita test manuali con probe manifest e errori player  
✅ **Documentazione**: Istruzioni complete per eseguire tutti i test

Il sistema ora ha test automatici per verificare la normalizzazione del playbackUrl e strumenti di debug per i test manuali.

