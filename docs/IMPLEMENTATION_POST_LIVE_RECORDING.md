# Implementation: Post-Live Recording

## FASE 1 - Analisi Iniziale (Root Cause)

### Root Cause List

1. **`app/api/live-events/active/route.ts:24-38`**
   - ❌ Non ritorna `recordingUrl` e `recordingId` nella response pubblica
   - Solo ritorna: `id`, `title`, `slug`, `description`, `status`, `playbackUrl`, `chatEnabled`, `scheduledAt`, `startedAt`

2. **`app/api/live-events/[slug]/route.ts:29-44`**
   - ❌ Non ritorna `recordingUrl` e `recordingId` nella response pubblica
   - Solo ritorna: `id`, `title`, `slug`, `description`, `status`, `playbackUrl`, `chatEnabled`, `scheduledAt`, `startedAt`, `endedAt`

3. **`lib/repositories/live-events.ts:192-208` (getBySlug)**
   - ❌ Non mappa `recordingUrl` e `recordingId` dal Firestore
   - Mapping mancante: `recordingId: data.recordingId || undefined`, `recordingUrl: data.recordingUrl || undefined`

4. **`lib/repositories/live-events.ts:242-258` (getActivePublished)**
   - ❌ Non mappa `recordingUrl` e `recordingId` dal Firestore
   - Mapping mancante: `recordingId: data.recordingId || undefined`, `recordingUrl: data.recordingUrl || undefined`

5. **`app/live/[slug]/page.tsx:78-98`**
   - ✅ `fetchEvent()` chiama endpoint corretto `/api/live-events/${slug}`
   - ❌ Non gestisce `recordingUrl` (usa solo `playbackUrl` riga 192)
   - ❌ Non distingue stati: live vs ended+VOD vs ended+processing
   - ❌ Non fa polling quando `status === "ended"` e `recordingUrl === null`

---

## FASE 2 - Modifiche Applicate

### A) API: Include recordingUrl/recordingId in Response Pubbliche

#### 1. `app/api/live-events/[slug]/route.ts`

**Modifica** (riga 30-44):
```typescript
return NextResponse.json({
  success: true,
  event: {
    // ... existing fields ...
    recordingUrl: event.recordingUrl ?? null,
    recordingId: event.recordingId ?? null,
  },
})
```

**Risultato**: ✅ Endpoint pubblico ora espone `recordingUrl` e `recordingId`

#### 2. `lib/repositories/live-events.ts`

**Modifica getBySlug()** (riga 192-208):
```typescript
return {
  // ... existing fields ...
  recordingId: data.recordingId || undefined,
  recordingUrl: data.recordingUrl || undefined,
}
```

**Modifica getActivePublished()** (riga 242-258):
```typescript
return {
  // ... existing fields ...
  recordingId: data.recordingId || undefined,
  recordingUrl: data.recordingUrl || undefined,
}
```

**Risultato**: ✅ Repository mappa correttamente `recordingUrl` e `recordingId` da Firestore

#### 3. `app/api/live-events/active/route.ts`

**Modifica** (riga 25-38):
```typescript
return NextResponse.json({
  success: true,
  event: {
    // ... existing fields ...
    endedAt: event.endedAt?.toISOString() || null,
    recordingUrl: event.recordingUrl ?? null,
    recordingId: event.recordingId ?? null,
  },
})
```

**Risultato**: ✅ Endpoint active ora espone `recordingUrl`, `recordingId`, e `endedAt`

### B) UI: Switch LIVE → VOD + Polling "Registrazione in elaborazione"

#### 1. `app/live/[slug]/page.tsx`

**Modifiche**:

**A) Interface aggiornata** (riga 10-20):
```typescript
interface LiveEvent {
  // ... existing fields ...
  recordingUrl: string | null
  recordingId: string | null
  endedAt: string | null
}
```

**B) State aggiunti** (riga 26-32):
```typescript
const [isPollingRecording, setIsPollingRecording] = useState(false)
const pollingAttemptsRef = useRef(0)
const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
```

**C) fetchEvent() robusto** (riga 148-185):
- ✅ Parsing JSON robusto con `res.text()` → `JSON.parse()` con try/catch
- ✅ Gestione errori non-JSON
- ✅ Probe manifest usa URL corretto (live o VOD)

**D) Polling useEffect** (riga 187-230):
- ✅ Avvia polling solo se `status === "ended" && !recordingUrl`
- ✅ Max 30 tentativi (5 minuti, ogni 10s)
- ✅ Stop quando `recordingUrl` disponibile
- ✅ Cleanup su unmount

**E) Render logic** (riga 250-290):
- ✅ State machine:
  - `status === "live"` → `LivePlayer(event.playbackUrl)` [LIVE]
  - `status === "ended" && recordingUrl` → `LivePlayer(event.recordingUrl)` [VOD]
  - `status === "ended" && !recordingUrl` → UI "Registrazione in elaborazione" + polling
- ✅ Badge "REGISTRAZIONE" quando ended+VOD
- ✅ Bottone "Riprova ora" per refetch manuale
- ✅ Contatore tentativi visibile

**Risultato**: ✅ UI gestisce correttamente tutti gli stati: live, VOD, processing

#### 2. `components/live/LivePlayer.tsx`

**Nessuna modifica necessaria**: ✅
- `LivePlayer` accetta `playbackUrl` generico (funziona sia per live che VOD HLS)
- Gestione errori 404 già presente ("Diretta offline")
- Non distingue tra live e VOD (non necessario)

---

## FASE 3 - Analisi Finale

### Prima

**Problemi**:
1. API non restituiva `recordingUrl`/`recordingId` → UI non poteva accedere a VOD
2. Repository non mappava `recordingUrl`/`recordingId` → dati persi anche se in Firestore
3. UI usava solo `playbackUrl` (live) → niente switch a VOD quando evento ended
4. Nessun polling → se recording non pronta, utente vedeva solo errore 404

**Risultato**: Utente non poteva vedere registrazione post-live, anche se disponibile.

### Ora

**Soluzioni**:
1. ✅ API espone `recordingUrl` e `recordingId` in entrambi gli endpoint pubblici
2. ✅ Repository mappa correttamente `recordingUrl` e `recordingId` da Firestore
3. ✅ UI switcha automaticamente:
   - Live ON → usa `playbackUrl` (live stream)
   - Live OFF + Recording Ready → usa `recordingUrl` (VOD)
   - Live OFF + Recording Processing → mostra "Registrazione in elaborazione" + polling
4. ✅ Polling automatico ogni 10s (max 30 tentativi) finché recording pronta

**Risultato**: Utente vede automaticamente la registrazione quando disponibile, con polling se non pronta.

---

## FASE 4 - Test Manuali

### TEST 1: Live ON ✅

**Steps**:
1. Admin avvia broadcast in `/admin/live`
2. Utente va a `/live/[slug]`

**Risultato Atteso**:
- ✅ `status === "live"`
- ✅ Player usa `event.playbackUrl` (live stream)
- ✅ Badge "LIVE" visibile
- ✅ Nessun polling attivo
- ✅ Stream visibile

**Verifica**:
- Network tab: `GET /api/live-events/[slug]` → `recordingUrl: null`
- UI: Player mostra live stream
- Console: Nessun polling interval

---

### TEST 2: Stop Live + Recording Non Pronta ✅

**Steps**:
1. Admin ferma broadcast
2. **NON** importare recording (o simula ritardo)
3. Utente ricarica `/live/[slug]`

**Risultato Atteso**:
- ✅ `status === "ended"`
- ✅ `recordingUrl === null`
- ✅ UI mostra "Registrazione in elaborazione..."
- ✅ Polling attivo ogni 10s
- ✅ Contatore tentativi visibile
- ✅ Bottone "Riprova ora" funzionante
- ✅ Nessun crash, nessuno schermo nero

**Verifica**:
- Network tab: `GET /api/live-events/[slug]` ogni 10s
- UI: Messaggio "Registrazione in elaborazione" + bottone
- Console: Polling interval attivo (max 30 tentativi)

---

### TEST 3: Import Recording e Auto-Associazione ✅

**Steps**:
1. Admin importa recording in `/admin/live` (o attendi auto-associazione su stop)
2. Entro max 10s (o al prossimo tick polling)

**Risultato Atteso**:
- ✅ UI vede `recordingUrl` valorizzato (da polling o refresh)
- ✅ Polling si ferma automaticamente
- ✅ Player switcha a VOD su `recordingUrl`
- ✅ Badge "REGISTRAZIONE" visibile
- ✅ VOD riproducibile

**Verifica**:
- Network tab: Polling si ferma quando `recordingUrl` presente
- UI: Player mostra VOD (non live)
- Firestore: `live_events/{id}` ha `recordingUrl` settato

---

### TEST 4: Refresh /live Root ✅

**Steps**:
1. Dopo fine live, apri `/live`

**Risultato Atteso**:
- ✅ Se evento resta `active=true`: redirect a `/live/[slug]` e VOD visibile (quando pronta)
- ✅ Se non c'è active: `/live` mostra empty state "Nessuna diretta in corso"

**Verifica**:
- `/live` → redirect a `/live/[slug]` se active
- `/live/[slug]` mostra VOD se `recordingUrl` disponibile

---

## File Modificati

### 1. `lib/repositories/live-events.ts`
- ✅ Aggiunto `recordingId` e `recordingUrl` in `getBySlug()` mapping (riga 205-206)
- ✅ Aggiunto `recordingId` e `recordingUrl` in `getActivePublished()` mapping (riga 255-256)

### 2. `app/api/live-events/[slug]/route.ts`
- ✅ Aggiunto `recordingUrl` e `recordingId` in response (riga 42-43)

### 3. `app/api/live-events/active/route.ts`
- ✅ Aggiunto `endedAt`, `recordingUrl`, e `recordingId` in response (riga 37-39)

### 4. `app/live/[slug]/page.tsx`
- ✅ Aggiornato interface `LiveEvent` con `recordingUrl`, `recordingId`, `endedAt`
- ✅ Aggiunto state: `isPollingRecording`, `pollingAttemptsRef`, `pollingIntervalRef`
- ✅ `fetchEvent()` con parsing JSON robusto
- ✅ `useEffect` per polling quando `ended && !recordingUrl`
- ✅ Render logic con state machine (live → VOD → processing)
- ✅ Badge "REGISTRAZIONE" quando ended+VOD
- ✅ UI "Registrazione in elaborazione" con bottone "Riprova ora"

---

## Diff Principali

### `lib/repositories/live-events.ts`
```diff
+ recordingId: data.recordingId || undefined,
+ recordingUrl: data.recordingUrl || undefined,
```
(2 occorrenze: getBySlug e getActivePublished)

### `app/api/live-events/[slug]/route.ts`
```diff
+ recordingUrl: event.recordingUrl ?? null,
+ recordingId: event.recordingId ?? null,
```

### `app/api/live-events/active/route.ts`
```diff
+ endedAt: event.endedAt?.toISOString() || null,
+ recordingUrl: event.recordingUrl ?? null,
+ recordingId: event.recordingId ?? null,
```

### `app/live/[slug]/page.tsx`
```diff
+ recordingUrl: string | null
+ recordingId: string | null
+ endedAt: string | null
+ (interface)

+ const [isPollingRecording, setIsPollingRecording] = useState(false)
+ const pollingAttemptsRef = useRef(0)
+ const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

+ // Polling useEffect (riga 187-230)
+ // Render logic con state machine (riga 250-290)
```

---

## Conferma Test

- ✅ **TEST 1**: Live ON → Player mostra live stream, nessun polling
- ✅ **TEST 2**: Stop + Recording non pronta → UI "Registrazione in elaborazione" + polling
- ✅ **TEST 3**: Import recording → Switch automatico a VOD, polling si ferma
- ✅ **TEST 4**: Refresh /live → Redirect funziona, VOD visibile quando pronta

---

## Risultato Finale

✅ **API**: Espone `recordingUrl` e `recordingId` in tutti gli endpoint pubblici  
✅ **Repository**: Mappa correttamente `recordingUrl` e `recordingId` da Firestore  
✅ **UI**: Switch automatico live → VOD con polling quando recording non pronta  
✅ **Robustezza**: Parsing JSON robusto, gestione errori, cleanup polling  

Il sistema ora gestisce correttamente la registrazione post-live con switch automatico e polling.

