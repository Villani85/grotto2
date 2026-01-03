# NeuroCredits Debug Report (Baseline)

**Data:** 2025-01-27  
**Ruolo:** Lead Engineer + Diagnostician  
**Obiettivo:** Mappare e diagnosticare problemi NeuroCredits senza applicare fix

---

## 1. Ambiente

- **OS:** Windows 10.0.26200 (win32)
- **Node:** v22.11.0
- **npm:** 10.9.0
- **Next.js:** 16.0.10 (Turbopack)
- **Lockfiles rilevati:** 
  - `package-lock.json` (npm)
  - `pnpm-lock.yaml` (pnpm)
  - ⚠️ **WARNING:** Lockfile multipli rilevati - possibile conflitto
- **Warning iniziali:** 
  - Next.js rileva lockfile multipli e seleziona `C:\Users\servi\package-lock.json` come root (potenzialmente errato)

---

## 2. Riproduzione bug (Before)

### 2.1 Creazione post

**Pagina usata:** `/bacheca` o `/area-riservata/community`

**Request:**
```
POST /api/posts
Headers: Authorization: Bearer <token>
Body: { "text": "Test post" }
```

**Response:**
- Status: 201 Created
- Body: Post object con id, authorId, text, etc.

**Log server subito dopo:**
```
[API Posts] ✅ Post created: { postId: "...", authorId: "..." }
[API Posts] 🎯 Applying POST_CREATED event: { postId, targetUid, periodId, deltaNeuroCredits: 2 }
[NeuroCredits] 🎯 Applying event: { eventId, type: "POST_CREATED", ... }
```

**Risultato atteso vs osservato:**
- **Atteso:** NeuroCredits aumentano di +2 (o +0 se cap raggiunto)
- **Osservato:** NeuroCredits NON si aggiornano in `/neurocredits`
- **Errore terminale:** `Firestore transactions require all reads to be executed before all writes.`

### 2.2 Creazione commento

**Pagina usata:** `/bacheca/[postId]`

**Request:**
```
POST /api/posts/[postId]/comments
Headers: Authorization: Bearer <token>
Body: { "text": "Test comment" }
```

**Response:**
- Status: 201 Created
- Body: Comment object

**Log server subito dopo:**
```
[API Comments] ✅ Comment created: { commentId, postId, authorId }
[API Comments] 🎯 NeuroCredit event result: { applied: true/false, eventId, neuroCreditsAwarded }
```

**Risultato atteso vs osservato:**
- **Atteso:** NeuroCredits aumentano di +1 (o +0 se cap raggiunto)
- **Osservato:** NeuroCredits NON si aggiornano
- **Errore terminale:** Stesso errore transazione Firestore

### 2.3 Apertura /neurocredits

**Requests osservate:**
1. `GET /api/leaderboard?period=all_time&metric=neuroCredits&limit=50`
   - **Authorization presente?** ❌ NO
   - **Status:** 200 OK (ma `me` è `null` se non autenticato)
   
2. `GET /api/neurocredits/me`
   - **Authorization presente?** ✅ SÌ (Bearer token)
   - **Status:** 200 OK o 401 Unauthorized

**Log server:**
```
[Auth Server] No Authorization header found  // Per /api/leaderboard
[API NeuroCredits Me] Error: Unauthorized    // Se token mancante/invalido
```

**Dati UI:**
- Statistiche personali (`myStats`) possono essere `null` se auth fallisce
- Leaderboard carica ma `me` summary è `null` se auth mancante

---

## 3. Mappa End-to-End (Flow)

### 3.1 Flusso Creazione Post/Commento

```
UI (PostComposerMagnetic/CommentComposer)
  ↓
POST /api/posts o POST /api/posts/[postId]/comments
  ↓ (requireAuth → verifica token)
  ↓ (crea post/commento in Firestore)
  ↓
applyEvent({ type: "POST_CREATED" | "COMMENT_CREATED", ... })
  ↓
lib/neurocredits.ts::applyEvent()
  ↓
db.runTransaction(async (transaction) => {
  // ❌ PROBLEMA QUI:
  // 1. Letture: eventRef.get(), capRef.get(), userRef.get(), leaderboard.get()
  // 2. Scritture: transaction.set(eventRef), transaction.update(userRef), ...
  // 3. ❌ VIOLAZIONE: updateDailyCap() viene chiamato DOPO scritture
  //    e fa altre letture (capDoc.get()) → ERRORE
})
  ↓
touchDailyActive(uid) // Chiamato dopo applyEvent, non in transazione
  ↓
Firestore docs aggiornati:
  - neurocredit_events/{eventId}
  - users/{uid} (neuroCredits_total, neuroCredits_monthly)
  - leaderboards/{period}/entries/{uid}
  - users/{uid}/dailyCaps/{YYYY-MM-DD}
```

### 3.2 Flusso Visualizzazione NeuroCredits

```
UI (/neurocredits/page.tsx - Client Component)
  ↓
useEffect → fetchMyStats() + fetchLeaderboard()
  ↓
fetchMyStats():
  getFirebaseIdToken() → token
  GET /api/neurocredits/me
    Headers: Authorization: Bearer <token>
    ↓
    requireAuth(request) → verifica token
    ↓
    Firestore: users/{uid}.get()
    ↓
    Response: { neuroCredits_total, neuroCredits_month_current, ... }
  ↓
fetchLeaderboard():
  GET /api/leaderboard?period=...&metric=...&limit=50
    Headers: ❌ NESSUN Authorization header
    ↓
    verifyIdToken(request) → null (no header)
    ↓
    Firestore: leaderboards/{period}/entries (senza "me" summary)
    ↓
    Response: { entries: [...], me: null }
```

### 3.3 Documenti Firestore Coinvolti

**Collezioni principali:**
- `neurocredit_events/{eventId}` - Eventi applicati (idempotency)
- `users/{uid}` - Dati utente (neuroCredits_total, neuroCredits_monthly, etc.)
- `users/{uid}/dailyCaps/{YYYY-MM-DD}` - Cap giornalieri (postCreditsUsed, commentCreditsUsed, etc.)
- `leaderboards/{periodId}/entries/{uid}` - Leaderboard entries

---

## 4. Evidenze in codice (con riferimenti)

### 4.1 Root Cause #1: Transazione Firestore (read-after-write)

**File:** `lib/neurocredits.ts`  
**Funzione:** `applyEvent()` → `updateDailyCap()`  
**Righe:** 138-290 (transazione), 49-109 (updateDailyCap)

**Snippet problematico:**
```typescript
// lib/neurocredits.ts:138-200
await db.runTransaction(async (transaction) => {
  // ✅ LETTURE (OK)
  const eventDoc = await transaction.get(eventRef)        // Linea 141
  const capDoc = await transaction.get(capRef)            // Linea 155
  const userDoc = await transaction.get(userRef)         // Linea 205
  const allTimeEntryDoc = await transaction.get(allTimeEntryRef)  // Linea 257
  const monthlyEntryDoc = await transaction.get(monthlyEntryRef)   // Linea 258

  // ✅ SCRITTURE (OK fin qui)
  transaction.set(eventRef, { ... })                     // Linea 184
  transaction.update(userRef, { ... })                   // Linea 231
  transaction.set(allTimeEntryRef, { ... }, { merge: true })  // Linea 264
  transaction.set(monthlyEntryRef, { ... }, { merge: true })  // Linea 278

  // ❌ VIOLAZIONE: Chiamata a updateDailyCap DOPO scritture
  if (!capReached && rule.hasDailyCap) {
    await updateDailyCap(transaction, db, payload.targetUid, payload.type, today)  // Linea 200
  }
})

// lib/neurocredits.ts:49-109 (updateDailyCap)
async function updateDailyCap(transaction, db, uid, eventType, today) {
  const capRef = db.collection("users").doc(uid).collection("dailyCaps").doc(today)
  
  if (eventType === "POST_CREATED") {
    // ❌ ERRORE: Altra lettura DOPO che sono state fatte scritture nella transazione
    const capDoc = await transaction.get(capRef)  // Linea 65
    const currentValue = capDoc.exists ? (capDoc.data()?.postCreditsUsed || 0) : 0
    transaction.set(capRef, { postCreditsUsed: currentValue + 1, ... }, { merge: true })
  }
  // Stesso problema per COMMENT_CREATED (linea 77), VIDEO_COMPLETED (linea 89)
}
```

**Perché è rilevante:**
- Firestore richiede che **tutte le letture** siano eseguite **prima** di **qualsiasi scrittura** in una transazione
- `updateDailyCap()` viene chiamato alla linea 200, **dopo** che sono già state fatte scritture (linee 184, 231, 264, 278)
- `updateDailyCap()` fa altre letture (`transaction.get(capRef)`) che violano questa regola
- **Risultato:** Errore `Firestore transactions require all reads to be executed before all writes.`

### 4.2 Root Cause #2: Mancanza Authorization su /api/leaderboard

**File:** `app/neurocredits/page.tsx`  
**Funzione:** `fetchLeaderboard()`  
**Righe:** 80-104

**Snippet problematico:**
```typescript
// app/neurocredits/page.tsx:80-104
const fetchLeaderboard = async () => {
  try {
    setIsLoading(true)
    // ❌ PROBLEMA: Nessun Authorization header
    const response = await fetch(`/api/leaderboard?period=${period}&metric=${metric}&limit=50`)
    // ...
  }
}
```

**File:** `app/api/leaderboard/route.ts`  
**Funzione:** `GET()`  
**Righe:** 15-131

**Snippet:**
```typescript
// app/api/leaderboard/route.ts:30
const user = await verifyIdToken(request)  // Opzionale, ritorna null se no header

// Linea 27: lib/auth-server.ts
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  console.warn("[Auth Server] No Authorization header found")  // ⚠️ Questo log appare
  return null
}
```

**Perché è rilevante:**
- `/api/leaderboard` usa `verifyIdToken()` che è **opzionale** (non lancia errore se manca token)
- La pagina `/neurocredits` chiama `/api/leaderboard` **senza** Authorization header
- Questo causa il log `[Auth Server] No Authorization header found`
- Il campo `me` nel response è `null`, quindi l'utente non vede la propria posizione nella leaderboard

**Nota:** `/api/neurocredits/me` invece usa `requireAuth()` che **richiede** auth, quindi funziona correttamente quando viene chiamato con token (linea 114-116 di `app/neurocredits/page.tsx`).

---

## 5. Diagnosi (probabile root cause)

### Root Cause #1: Transazione Firestore (read-after-write)

**Evidenza:**
- Errore terminale: `Firestore transactions require all reads to be executed before all writes.`
- Stack trace punta a `lib/neurocredits.ts:200` (chiamata a `updateDailyCap`)
- `updateDailyCap()` fa `transaction.get(capRef)` dopo che sono già state fatte scritture

**Dove accade:**
- `lib/neurocredits.ts:138-290` - Funzione `applyEvent()`
- `lib/neurocredits.ts:49-109` - Funzione `updateDailyCap()`
- Chiamato da:
  - `app/api/posts/route.ts:125` (POST_CREATED)
  - `app/api/posts/[postId]/comments/route.ts:153` (COMMENT_CREATED)
  - Altri endpoint che chiamano `applyEvent()`

**Impatto:**
- ❌ Transazione fallisce → evento non applicato
- ❌ NeuroCredits non vengono aggiornati
- ❌ Leaderboard non viene aggiornato
- ❌ Daily caps non vengono aggiornati

### Root Cause #2: Mancanza Authorization su /api/leaderboard

**Evidenza:**
- Log server: `[Auth Server] No Authorization header found`
- `/api/leaderboard` viene chiamato senza Authorization header da `app/neurocredits/page.tsx:83`
- `verifyIdToken()` ritorna `null` → `me` summary è `null`

**Dove accade:**
- `app/neurocredits/page.tsx:80-104` - `fetchLeaderboard()` non include token
- `app/api/leaderboard/route.ts:30` - `verifyIdToken()` è opzionale

**Impatto:**
- ⚠️ Leaderboard carica ma senza "me" summary
- ⚠️ Utente non vede la propria posizione se non è nella top 50
- ✅ Non blocca il funzionamento, ma UX degradata

---

## 6. Punti di intervento (priorità)

### P0 (Blocca tutto) - Transazione Firestore

**File:** `lib/neurocredits.ts`  
**Funzione:** `applyEvent()` (righe 138-290) e `updateDailyCap()` (righe 49-109)

**Cosa cambiare:**
- Spostare tutte le letture di `updateDailyCap()` **prima** delle scritture nella transazione
- Oppure: calcolare `capReached` e `currentValue` **prima** di iniziare le scritture
- Oppure: rimuovere `updateDailyCap()` dalla transazione e chiamarlo **dopo** la transazione (con rischio di race condition)

**Rischio regressioni:**
- ⚠️ **ALTO:** Modifica alla logica di transazione può introdurre race conditions
- ⚠️ Se `updateDailyCap()` viene chiamato dopo la transazione, c'è rischio di doppio conteggio se due eventi arrivano simultaneamente
- ✅ **SICURO:** Spostare letture prima delle scritture mantiene atomicità

**Test di verifica:**
1. Creare post → verificare che transazione non fallisca
2. Creare commento → verificare che transazione non fallisca
3. Verificare log: nessun errore `Firestore transactions require...`
4. Verificare Firestore: `neurocredit_events`, `users/{uid}`, `dailyCaps` aggiornati correttamente
5. Verificare `/neurocredits`: NeuroCredits aumentati

### P1 (Funzionalità degradata) - Authorization su /api/leaderboard

**File:** `app/neurocredits/page.tsx`  
**Funzione:** `fetchLeaderboard()` (righe 80-104)

**Cosa cambiare:**
- Aggiungere Authorization header a `fetch('/api/leaderboard')` usando `getFirebaseIdToken()` (come già fatto per `fetchMyStats()`)

**Rischio regressioni:**
- ✅ **BASSO:** Solo aggiunta di header, nessuna modifica logica
- ✅ `/api/leaderboard` già supporta auth opzionale, quindi funziona anche senza token (per utenti non autenticati)

**Test di verifica:**
1. Aprire `/neurocredits` → verificare che `me` summary non sia `null`
2. Verificare log: nessun `[Auth Server] No Authorization header found` per `/api/leaderboard`
3. Verificare UI: posizione utente visibile anche se non in top 50

### P2 (Ottimizzazione) - Logging e error handling

**File:** `lib/neurocredits.ts`, `app/api/posts/route.ts`, `app/api/posts/[postId]/comments/route.ts`

**Cosa cambiare:**
- Aggiungere try-catch più specifici per errori transazione
- Loggare errori transazione con più dettagli (eventId, targetUid, error message)
- Considerare retry logic per errori transazione (con backoff)

**Rischio regressioni:**
- ✅ **MOLTO BASSO:** Solo logging, nessuna modifica logica

---

## 7. Piano di fix proposto (SENZA applicarlo)

### Step 1: Fix Transazione Firestore (P0)

**Approccio consigliato:** Spostare tutte le letture prima delle scritture

**Modifiche:**
1. In `lib/neurocredits.ts::applyEvent()`:
   - Spostare la chiamata a `updateDailyCap()` **prima** di `transaction.set(eventRef, ...)`
   - Oppure: calcolare `capReached` e `currentValue` all'inizio della transazione (prima di qualsiasi scrittura)
   - Chiamare `updateDailyCap()` solo per aggiornare il valore, non per leggerlo

2. In `lib/neurocredits.ts::updateDailyCap()`:
   - Rimuovere `transaction.get(capRef)` se il valore è già stato letto
   - Accettare `currentValue` come parametro invece di leggerlo

**Pseudocodice:**
```typescript
await db.runTransaction(async (transaction) => {
  // FASE 1: TUTTE LE LETTURE
  const eventDoc = await transaction.get(eventRef)
  const capDoc = await transaction.get(capRef)  // Per cap check
  const userDoc = await transaction.get(userRef)
  const allTimeEntryDoc = await transaction.get(allTimeEntryRef)
  const monthlyEntryDoc = await transaction.get(monthlyEntryRef)
  
  // Calcola currentValue per dailyCap QUI (prima di scritture)
  const currentCapValue = capDoc.exists ? (capDoc.data()?.postCreditsUsed || 0) : 0
  
  // FASE 2: TUTTE LE SCRITTURE
  transaction.set(eventRef, { ... })
  transaction.update(userRef, { ... })
  transaction.set(allTimeEntryRef, { ... }, { merge: true })
  transaction.set(monthlyEntryRef, { ... }, { merge: true })
  
  // Aggiorna dailyCap usando currentValue già letto (solo scrittura)
  if (!capReached && rule.hasDailyCap) {
    transaction.set(capRef, { postCreditsUsed: currentCapValue + 1, ... }, { merge: true })
  }
})
```

### Step 2: Fix Authorization su /api/leaderboard (P1)

**Modifiche:**
1. In `app/neurocredits/page.tsx::fetchLeaderboard()`:
   - Aggiungere `getFirebaseIdToken()` prima del fetch
   - Includere `Authorization: Bearer ${token}` nell'header (se token disponibile)

**Codice:**
```typescript
const fetchLeaderboard = async () => {
  try {
    setIsLoading(true)
    const token = await getFirebaseIdToken()
    const headers: HeadersInit = {}
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
    const response = await fetch(`/api/leaderboard?period=${period}&metric=${metric}&limit=50`, {
      headers
    })
    // ... resto del codice
  }
}
```

### Step 3: Test suite manuale

**Checklist:**
1. ✅ Creare post → verificare log: nessun errore transazione
2. ✅ Creare commento → verificare log: nessun errore transazione
3. ✅ Verificare `/neurocredits`: NeuroCredits aumentati
4. ✅ Verificare `/neurocredits`: `me` summary presente
5. ✅ Verificare Firestore: documenti aggiornati correttamente

### Step 4: Hardening

**Azioni:**
- Aggiungere unit test per `applyEvent()` con mock Firestore
- Aggiungere integration test per endpoint POST
- Monitorare errori transazione in produzione
- Considerare retry logic per errori transazione (con exponential backoff)

---

## 8. Checklist test (Terminale + Chrome)

### Terminale

**Comandi:**
```bash
# 1. Avviare dev server
npm run dev

# 2. Monitorare log in tempo reale
# Cercare:
# - "[NeuroCredits] 🎯 Applying event:"
# - "[NeuroCredits] ✅ Event created:"
# - "Firestore transactions require all reads..."
# - "[Auth Server] No Authorization header found"
```

**Output atteso (DOPO fix):**
- ✅ Nessun errore `Firestore transactions require...`
- ✅ Log `[NeuroCredits] ✅ Event created:` presente
- ✅ Log `[NeuroCredits] 📊 Updated totals:` presente
- ⚠️ Log `[Auth Server] No Authorization header found` solo per `/api/leaderboard` se utente non autenticato (OK)

### Chrome (Network Tab)

**Passi:**
1. Aprire `/bacheca` o `/area-riservata/community`
2. Creare un nuovo post
3. **Verificare Network:**
   - `POST /api/posts` → Status 201
   - Headers: `Authorization: Bearer <token>` presente
4. Aprire `/neurocredits`
5. **Verificare Network:**
   - `GET /api/neurocredits/me` → Status 200
   - Headers: `Authorization: Bearer <token>` presente
   - Response: `{ neuroCredits_total: <valore aumentato>, ... }`
   - `GET /api/leaderboard?period=...&metric=...&limit=50` → Status 200
   - Headers: `Authorization: Bearer <token>` presente (DOPO fix)
   - Response: `{ entries: [...], me: { rank: ..., neuroCredits: ... } }` (DOPO fix)

**Expectations:**
- ✅ NeuroCredits aumentati dopo creazione post/commento
- ✅ `me` summary presente in leaderboard response
- ✅ Nessun errore 401/500 nelle richieste

---

## 9. File analizzati

1. `lib/neurocredits.ts` - Core logic NeuroCredits (applyEvent, updateDailyCap)
2. `app/api/posts/route.ts` - Endpoint creazione post
3. `app/api/posts/[postId]/comments/route.ts` - Endpoint creazione commento
4. `app/api/neurocredits/me/route.ts` - Endpoint statistiche personali
5. `app/api/leaderboard/route.ts` - Endpoint leaderboard
6. `app/neurocredits/page.tsx` - Pagina UI NeuroCredits
7. `lib/auth-server.ts` - Verifica autenticazione server-side
8. `lib/neurocredits-rules.ts` - Regole e configurazione NeuroCredits

---

## 10. Azioni consigliate (solo titoli)

1. **Fix transazione Firestore:** Spostare letture dailyCap prima delle scritture in `applyEvent()`
2. **Fix Authorization leaderboard:** Aggiungere token a `fetchLeaderboard()` in `/neurocredits`
3. **Aggiungere logging dettagliato:** Per diagnosticare futuri problemi con transazioni

---

**Fine Report**
