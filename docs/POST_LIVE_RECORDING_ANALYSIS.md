# Post-Live Recording Integration Analysis

## 1. Executive Summary

Il sistema attuale ha già:
- ✅ Registrazioni IVS salvate in S3 e importate in Firestore (`ivsRecordings`)
- ✅ Campi `recordingId` e `recordingUrl` in `live_events` (schema supportato)
- ✅ Auto-associazione recording→evento quando stop broadcast (entro 5 minuti)
- ✅ Costruzione URL HLS VOD: `${s3Prefix}/media/hls/master.m3u8`

**Gap principale**: La pagina `/live/[slug]` usa solo `event.playbackUrl` (live) e non gestisce `recordingUrl` (VOD) quando evento è `ended`. Serve integrazione UI per switch automatico live→VOD e polling se recording non pronto.

---

## 2. Current State Map

### Pages

| Path | File | Type | Endpoint Called | Current Behavior |
|------|------|------|----------------|------------------|
| `/live` | `app/live/page.tsx` | Client | `/api/live-events/active` | Redirect a `/live/[slug]` se evento attivo, altrimenti "Nessuna diretta" |
| `/live/[slug]` | `app/live/[slug]/page.tsx` | Client | `/api/live-events/[slug]` | Mostra `LivePlayer` con `event.playbackUrl` (solo live) |

### APIs

| Endpoint | File | Auth | Returns | Notes |
|----------|------|------|---------|-------|
| `GET /api/live-events/active` | `app/api/live-events/active/route.ts` | Public | `{ event: { playbackUrl, status, ... } }` | **NOT FOUND**: Non ritorna `recordingUrl` |
| `GET /api/live-events/[slug]` | `app/api/live-events/[slug]/route.ts` | Public | `{ event: { playbackUrl, status, ... } }` | ✅ Esiste ma **NON ritorna `recordingUrl`** (riga 38) |
| `POST /api/admin/ivs/recordings` | `app/api/admin/ivs/recordings/route.ts` | Admin | Start/stop/import | Auto-associa recording a evento (righe 250-312) |
| `GET /api/admin/ivs/recordings/list` | `app/api/admin/ivs/recordings/list/route.ts` | Admin | Lista S3 recordings | Parsa `recording-ended.json` |

### Firestore Collections

| Collection | Fields (Key) | Purpose |
|------------|--------------|---------|
| `live_events` | `id`, `status`, `playbackUrl`, `recordingId`, `recordingUrl`, `startedAt`, `endedAt` | Eventi live con link a recording |
| `ivsRecordings` | `s3Prefix`, `endedKey`, `endedAt`, `status: "READY"`, `playbackUrl` (null) | Recordings importati da S3 |
| `ivs_recordings` | `streamKey`, `startedAt`, `stoppedAt`, `status: "live"|"completed"` | Metadata start/stop stream (legacy) |

---

## 3. Recording Data Flow (S3 → API → Firestore)

### Step 1: IVS Recording Completion

**S3 Structure** (da `list/route.ts:82-97`):
```
s3://bucket/prefix/{recording-id}/
  ├── events/
  │   └── recording-ended.json  (endedKey)
  └── media/
      └── hls/
          └── master.m3u8  (HLS VOD)
```

**recording-ended.json** (da `list/route.ts:137-144`):
```json
{
  "endedAt": "2024-01-01T12:00:00Z",
  "channelId": "abc123",
  "duration": 3600,
  "streamId": "xyz789"
}
```

### Step 2: Import to Firestore

**Hook**: `app/api/admin/ivs/recordings/route.ts:30-127`

**Process**:
1. Admin importa da S3 (POST con `title`, `endedKey`, `prefix`)
2. Crea doc in `ivsRecordings`:
   ```typescript
   {
     title: string,
     s3Prefix: string,  // e.g., "ivs/v1/rec-123"
     endedKey: string,   // e.g., "ivs/v1/rec-123/events/recording-ended.json"
     endedAt: Date,      // da recording-ended.json
     status: "READY",
     playbackUrl: null, // Placeholder (CloudFront futuro)
     cloudFrontDistributionId: null
   }
   ```

### Step 3: Auto-Association to Live Event

**Hook**: `app/api/admin/ivs/recordings/route.ts:250-312` (quando stop broadcast)

**Process**:
1. Admin ferma broadcast → POST `/api/admin/ivs/recordings` con `action: "stop"` + `eventSlug`
2. API cerca recording in `ivsRecordings` che finisce entro 5 minuti dalla fine evento
3. Costruisce `recordingUrl`:
   ```typescript
   recordingUrl = `https://${bucket}.s3.${region}.amazonaws.com/${s3Prefix}/media/hls/master.m3u8`
   ```
4. Aggiorna `live_events`:
   ```typescript
   {
     status: "ended",
     endedAt: Date,
     recordingId: string,  // ID doc ivsRecordings
     recordingUrl: string  // S3 HLS URL
   }
   ```

**Gap**: Se recording non è ancora importato quando stop, non viene associato. Serve polling o job background.

---

## 4. Gaps Found

### NOT FOUND: Public API Recording Fields

**File**: `app/api/live-events/active/route.ts:24-38`
- ❌ Non ritorna `recordingUrl` o `recordingId` nella response pubblica
- Solo ritorna: `id`, `title`, `slug`, `description`, `status`, `playbackUrl`, `chatEnabled`, `scheduledAt`, `startedAt`
- **NOTA**: `LiveEventsRepository.getActivePublished()` (riga 215-263) non include `recordingUrl` nel mapping (riga 253)

**File**: `app/api/live-events/[slug]/route.ts:29-44`
- ✅ **ESISTE**: Endpoint pubblico per slug
- ❌ **GAP**: Non ritorna `recordingUrl` o `recordingId` nella response (riga 38 ritorna solo `playbackUrl`)
- Ritorna: `id`, `title`, `slug`, `description`, `status`, `playbackUrl`, `chatEnabled`, `scheduledAt`, `startedAt`, `endedAt`

### NOT FOUND: UI Post-Live State

**File**: `app/live/[slug]/page.tsx:78-98`
- ❌ `fetchEvent()` chiama endpoint che non esiste (`/api/live-events/${slug}`)
- ❌ Usa solo `event.playbackUrl` (live), non gestisce `recordingUrl` (VOD)
- ❌ Non distingue stati: live ON, live OFF + recording ready, live OFF + recording processing

**File**: `components/live/LivePlayer.tsx`
- ❌ Supporta solo `playbackUrl` (non distingue live vs VOD)
- ✅ Gestisce errori 404 (mostra "Diretta offline")

### NOT FOUND: Repository Public GetBySlug

**File**: `lib/repositories/live-events.ts`
- ✅ Esiste `getBySlug(slug, publishedOnly)` ma è usato solo admin
- ❌ Non c'è endpoint pubblico che lo espone

---

## 5. Integration Options

### OPZIONE A (RECOMMENDED): "Update live_event on stop + background pull recordings"

**Approach**:
1. Quando admin stoppa broadcast: `live_event.status = "ended"` (già fatto)
2. Job background (o polling da UI) cerca recording in `ivsRecordings` che finisce entro 5-10 minuti
3. Se trovato: aggiorna `recordingUrl` e `recordingId`
4. `/live/[slug]` mostra VOD se `recordingUrl` presente, altrimenti "in elaborazione" + polling

**Pros**:
- ✅ Riutilizza logica esistente (auto-association già implementata)
- ✅ Non richiede modifiche S3/IVS
- ✅ Polling client-side semplice (setInterval)

**Cons**:
- ⚠️ Delay fino a quando recording è importato (admin deve importare manualmente)
- ⚠️ Polling client-side consuma risorse (ma accettabile per UX)

**File da toccare**:
- `app/api/live-events/[slug]/route.ts` (NUOVO) - Endpoint pubblico per slug
- `app/api/live-events/active/route.ts` - Aggiungere `recordingUrl` in response
- `app/live/[slug]/page.tsx` - Logica switch live→VOD + polling
- `components/live/LivePlayer.tsx` - Supporto VOD (già supporta HLS, nessuna modifica)

**Complessità**: Media (2-3 file, logica polling semplice)

**Rischi**: Basso (solo aggiunte, non modifiche breaking)

---

### OPZIONE B: "Poll S3 ended events dalla pagina /live"

**Approach**:
1. `/live/[slug]` fa polling a `/api/admin/ivs/recordings/list` (ma serve auth admin)
2. Oppure nuovo endpoint pubblico che cerca recording per `channelId` o timestamp
3. Quando recording disponibile, switcha su `recordingUrl`

**Pros**:
- ✅ Aggiornamento più veloce (non dipende da import manuale)

**Cons**:
- ❌ Richiede endpoint pubblico che accede a S3 (security risk)
- ❌ Richiede mapping `channelId` → `live_event` (non esiste)
- ❌ Polling S3 è costoso (rate limits)

**File da toccare**:
- `app/api/live-events/[slug]/recording/route.ts` (NUOVO) - Endpoint pubblico che cerca recording
- `app/live/[slug]/page.tsx` - Polling endpoint recording

**Complessità**: Alta (nuovo endpoint S3, mapping channelId, security)

**Rischi**: Alto (esposizione S3, rate limits)

---

### OPZIONE C: "Link diretto tra live_event e ivs_recordings tramite streamKey/channelId"

**Approach**:
1. `live_event` salva `channelId` o `streamKey` quando inizia broadcast
2. Quando arriva `recording-ended.json`, aggiorna direttamente `live_event` con `recordingUrl`
3. Richiede webhook S3 o job che monitora S3

**Pros**:
- ✅ Aggiornamento automatico immediato

**Cons**:
- ❌ Richiede webhook S3 (configurazione AWS complessa)
- ❌ O job background che monitora S3 (costo/risorse)
- ❌ `live_event` non salva `channelId` attualmente

**File da toccare**:
- `lib/repositories/live-events.ts` - Aggiungere campo `channelId`
- `app/admin/live/page.tsx` - Salvare `channelId` quando start broadcast
- Webhook handler o job background (NUOVO)

**Complessità**: Alta (webhook/job, modifiche schema)

**Rischi**: Medio-Alto (infrastruttura aggiuntiva)

---

## 6. Recommended Approach

**OPZIONE A** è la scelta consigliata perché:
1. ✅ Riutilizza logica esistente (auto-association già funziona)
2. ✅ Modifiche minime (solo aggiunte, non breaking changes)
3. ✅ Polling client-side è semplice e accettabile per UX
4. ✅ Non richiede infrastruttura aggiuntiva (webhook/job)

**Modifiche necessarie**:
1. Endpoint pubblico `/api/live-events/[slug]` che ritorna `recordingUrl`
2. Aggiornare `/api/live-events/active` per includere `recordingUrl`
3. UI in `/live/[slug]` che:
   - Se `status === "live"`: usa `playbackUrl` (live)
   - Se `status === "ended"` + `recordingUrl`: usa `recordingUrl` (VOD)
   - Se `status === "ended"` + NO `recordingUrl`: mostra "Registrazione in elaborazione" + polling ogni 10s

---

## 7. Minimal Spec

### Fields (già esistenti, nessuna modifica schema)

**`live_events`**:
- ✅ `recordingId: string | null` (già esiste)
- ✅ `recordingUrl: string | null` (già esiste)
- ✅ `status: "ended"` (già esiste)

**`ivsRecordings`**:
- ✅ `s3Prefix: string` (già esiste)
- ✅ `endedAt: Date` (già esiste)
- ✅ `status: "READY"` (già esiste)

### Endpoints Necessari

**1. `GET /api/live-events/[slug]` (MODIFY - Public)**
- **File**: `app/api/live-events/[slug]/route.ts:29-44`
- **Auth**: None (public) ✅
- **Change**: Aggiungere `recordingUrl` e `recordingId` in response (dopo riga 42)
- **Response**:
  ```typescript
  {
    success: true,
    event: {
      id, title, slug, description,
      status: "live" | "ended",
      playbackUrl: string,      // Live stream URL
      recordingUrl: string | null,  // VOD URL (se disponibile)
      recordingId: string | null,
      chatEnabled: boolean,
      scheduledAt: string | null,
      startedAt: string | null,
      endedAt: string | null
    }
  }
  ```
- **Implementation**: Già implementato, solo aggiungere campi `recordingUrl` e `recordingId`

**2. `GET /api/live-events/active` (MODIFY)**
- **File**: `app/api/live-events/active/route.ts:24-38`
- **Change**: Aggiungere `recordingUrl` e `recordingId` in response
- **Line**: Aggiungere dopo riga 36 (dopo `startedAt`):
  ```typescript
  recordingUrl: event.recordingUrl || null,
  recordingId: event.recordingId || null,
  endedAt: event.endedAt?.toISOString() || null,
  ```
- **NOTA**: `LiveEventsRepository.getActivePublished()` (riga 215-263) non include `recordingUrl` nel mapping. Serve modificare anche il repository per includere `recordingUrl` e `recordingId` (riga 253).

### UI States in `/live/[slug]`

**State Machine**:
```
1. Loading → fetchEvent()
2. if (!event) → "Evento non trovato"
3. if (event.status === "live") → LivePlayer(event.playbackUrl) [LIVE]
4. if (event.status === "ended" && event.recordingUrl) → LivePlayer(event.recordingUrl) [VOD]
5. if (event.status === "ended" && !event.recordingUrl) → "Registrazione in elaborazione" + polling
```

**Polling Logic** (quando `status === "ended" && !recordingUrl`):
- `setInterval(() => fetchEvent(), 10000)` (ogni 10s)
- Max 30 tentativi (5 minuti)
- Se `recordingUrl` appare, switcha a VOD e ferma polling

**File**: `app/live/[slug]/page.tsx:78-98`
- Modificare `fetchEvent()` per gestire `recordingUrl`
- Aggiungere state `isPollingRecording: boolean`
- Aggiungere useEffect per polling quando `status === "ended" && !recordingUrl`

---

## 8. Test Plan (Manuale Ripetibile)

### Test 1: Live Event → Recording Ready

**Steps**:
1. Admin crea evento live
2. Admin va ON AIR in `/admin/live`
3. Admin ferma broadcast (stop)
4. Admin importa recording da S3 in `/admin/live` (import recording)
5. Verifica Firestore: `live_events/{id}` ha `recordingUrl` settato
6. Utente va a `/live/[slug]`
7. **Expected**: Player mostra VOD (recording)

**Verifica Firestore**:
```json
{
  "status": "ended",
  "recordingUrl": "https://bucket.s3.region.amazonaws.com/prefix/media/hls/master.m3u8",
  "recordingId": "doc-id"
}
```

### Test 2: Live Event → Recording Not Ready (Polling)

**Steps**:
1. Admin crea evento live
2. Admin va ON AIR e ferma broadcast
3. **NON** importare recording
4. Utente va a `/live/[slug]`
5. **Expected**: Mostra "Registrazione in elaborazione" + polling ogni 10s
6. Admin importa recording
7. **Expected**: Dopo max 10s, player switcha a VOD automaticamente

**Verifica UI**:
- Messaggio: "Registrazione in elaborazione. Riprova tra qualche istante..."
- Polling visibile in console (fetch ogni 10s)
- Switch automatico quando `recordingUrl` disponibile

### Test 3: Live Event Active (No Recording)

**Steps**:
1. Admin crea evento live
2. Admin va ON AIR
3. Utente va a `/live/[slug]`
4. **Expected**: Player mostra live stream (non recording)

**Verifica**:
- `event.status === "live"`
- Player usa `event.playbackUrl` (live URL)
- Nessun polling attivo

### Test 4: Public API Returns Recording Fields

**Steps**:
1. Evento con `recordingUrl` settato
2. `GET /api/live-events/[slug]`
3. **Expected**: Response include `recordingUrl` e `recordingId`

**Verifica Response**:
```json
{
  "success": true,
  "event": {
    "status": "ended",
    "playbackUrl": "...",
    "recordingUrl": "https://...master.m3u8",
    "recordingId": "doc-id"
  }
}
```

---

## 9. What to Check (Lista Controlli Concreti)

### ✅ 1. Struttura S3 Reale

**Verificato** (da `list/route.ts:116-129`):
- Path HLS: `${prefix}/media/hls/master.m3u8`
- File manifest: Qualsiasi `.m3u8` in `media/hls/`
- **Confermato**: `master.m3u8` è il file standard IVS

### ✅ 2. Dati recording-ended.json

**Verificato** (da `list/route.ts:137-144`):
- Contiene: `endedAt`, `channelId`, `duration`, `streamId`
- **NOT FOUND**: `channelId` non viene salvato in `live_events` (non c'è mapping)

### ✅ 3. Costruzione URL VOD

**Verificato** (da `recordings/route.ts:287-291`):
- URL costruito: `https://${bucket}.s3.${region}.amazonaws.com/${s3Prefix}/media/hls/master.m3u8`
- **Confermato**: Codice già costruisce URL VOD correttamente

### ⚠️ 4. Auth/Roles

**Verificato**:
- `ivsRecordings` collection: **NOT FOUND** - Non verificato se utenti pubblici possono leggere
- **Raccomandazione**: Endpoint pubblico `/api/live-events/[slug]` che legge `live_events` (già pubblico) e ritorna `recordingUrl` (non serve leggere `ivsRecordings` direttamente)

**Firestore Rules** (da verificare manualmente):
- `live_events`: Deve essere readable pubblicamente se `published === true`
- `ivsRecordings`: Non necessario per utenti pubblici (solo admin)

---

## 10. Root Decision + Spec Minima

### Root Decision

**OPZIONE A** è la scelta perché:
1. ✅ Riutilizza logica esistente (auto-association già implementata)
2. ✅ Modifiche minime (solo aggiunte)
3. ✅ Polling client-side semplice
4. ✅ Nessuna infrastruttura aggiuntiva

### Minimal Spec

**Campi** (già esistenti, nessuna modifica):
- `live_events.recordingUrl: string | null` ✅
- `live_events.recordingId: string | null` ✅
- `live_events.status: "ended"` ✅

**Endpoints**:
1. `GET /api/live-events/[slug]` (NUOVO) - Public, ritorna `recordingUrl`
2. `GET /api/live-events/active` (MODIFY) - Aggiungere `recordingUrl` in response

**UI States**:
- **Live ON**: `status === "live"` → `LivePlayer(event.playbackUrl)`
- **Live OFF + Recording Ready**: `status === "ended" && recordingUrl` → `LivePlayer(event.recordingUrl)`
- **Live OFF + Recording Processing**: `status === "ended" && !recordingUrl` → "Registrazione in elaborazione" + polling 10s
- **No Event**: Empty state

**Polling**:
- Intervallo: 10s
- Max tentativi: 30 (5 minuti)
- Stop quando `recordingUrl` disponibile

---

## 11. Implementation Hooks (File + Funzione)

### Hook 1: Modify Public Endpoint

**File**: `app/api/live-events/[slug]/route.ts:29-44` (MODIFY)
**Function**: `GET(request, { params })`
**Change**: Aggiungere dopo riga 42 (dopo `endedAt`):
```typescript
recordingUrl: event.recordingUrl || null,
recordingId: event.recordingId || null,
```

### Hook 2: Modify Repository getActivePublished

**File**: `lib/repositories/live-events.ts:242-258`
**Function**: `getActivePublished()`
**Change**: Aggiungere dopo riga 254 (dopo `playbackUrl`):
```typescript
recordingUrl: data.recordingUrl || undefined,
recordingId: data.recordingId || undefined,
```

### Hook 3: Modify Active Endpoint

**File**: `app/api/live-events/active/route.ts:24-38`
**Function**: `GET(request)`
**Change**: Aggiungere dopo riga 36 (dopo `startedAt`):
```typescript
recordingUrl: event.recordingUrl || null,
recordingId: event.recordingId || null,
endedAt: event.endedAt?.toISOString() || null,
```

### Hook 4: UI Switch Logic

**File**: `app/live/[slug]/page.tsx:78-98`
**Function**: `fetchEvent()` + nuovo `useEffect` per polling
**Change**:
1. Modificare `fetchEvent()` per usare `/api/live-events/[slug]` (nuovo endpoint)
2. Aggiungere state: `const [isPollingRecording, setIsPollingRecording] = useState(false)`
3. Aggiungere useEffect:
```typescript
useEffect(() => {
  if (event?.status === "ended" && !event.recordingUrl && !isPollingRecording) {
    setIsPollingRecording(true)
    const interval = setInterval(async () => {
      await fetchEvent()
      if (event?.recordingUrl) {
        clearInterval(interval)
        setIsPollingRecording(false)
      }
    }, 10000)
    return () => clearInterval(interval)
  }
}, [event?.status, event?.recordingUrl])
```

### Hook 5: UI Render Logic

**File**: `app/live/[slug]/page.tsx:191-201`
**Function**: Render `LivePlayer`
**Change**:
```typescript
{event.status === "live" ? (
  <LivePlayer playbackUrl={event.playbackUrl} />
) : event.status === "ended" && event.recordingUrl ? (
  <LivePlayer playbackUrl={event.recordingUrl} />
) : event.status === "ended" && !event.recordingUrl ? (
  <div>Registrazione in elaborazione. Riprova tra qualche istante...</div>
) : null}
```

---

## Conclusion

Il sistema è **quasi pronto** per post-live recording:
- ✅ Schema Firestore supporta `recordingUrl`
- ✅ Auto-association recording→evento già implementata
- ✅ URL VOD costruito correttamente
- ❌ Manca endpoint pubblico per slug
- ❌ Manca UI switch live→VOD
- ❌ Manca polling quando recording non pronto

**Effort stimato**: 1-2 ore (modifica 2 endpoint + UI logic + polling)

**Nota**: L'endpoint `/api/live-events/[slug]` esiste già, serve solo aggiungere `recordingUrl` e `recordingId` nella response.

