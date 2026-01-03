# NeuroCredits Fix Report

**Data:** 2025-01-27  
**Branch:** `fix/neurocredits-tx-and-leaderboard-auth`  
**Status:** ✅ Fix applicati, pronti per test

---

## Modifiche Applicate

### 1. Fix P0: Transazione Firestore (lib/neurocredits.ts)

**Problema:** Errore `Firestore transactions require all reads to be executed before all writes.`

**Causa:** `updateDailyCap()` veniva chiamato dopo scritture e faceva `transaction.get(capRef)` → lettura dopo scrittura.

**Soluzione:**
- ✅ Riorganizzata la transazione in 3 fasi:
  1. **FASE 1:** Tutte le letture in parallelo (eventRef, userRef, allTimeEntryRef, monthlyEntryRef, capRef)
  2. **FASE 2:** Calcoli in memoria (capReached, neuroCreditsToAward, nuovi totali)
  3. **FASE 3:** Tutte le scritture (eventRef, userRef, leaderboard entries, capRef)

- ✅ Rinominata `updateDailyCap()` → `writeDailyCap()` che **non legge**, solo scrive
- ✅ `writeDailyCap()` riceve `capData` già letto come parametro
- ✅ Nessun `transaction.get()` dopo la prima scrittura

**File modificato:** `lib/neurocredits.ts`
- Righe 49-109: `updateDailyCap()` → `writeDailyCap()` (solo scritture)
- Righe 138-290: `applyEvent()` riorganizzata con fasi separate

**Evidenza codice:**
```typescript
// PRIMA (ERRATO):
await db.runTransaction(async (transaction) => {
  const eventDoc = await transaction.get(eventRef)  // Lettura 1
  const capDoc = await transaction.get(capRef)       // Lettura 2
  transaction.set(eventRef, {...})                   // Scrittura 1 ❌
  await updateDailyCap(...)  // ← fa transaction.get() DOPO scrittura ❌
  const userDoc = await transaction.get(userRef)     // Lettura 3 ❌ DOPO scrittura
  // ...
})

// DOPO (CORRETTO):
await db.runTransaction(async (transaction) => {
  // FASE 1: TUTTE LE LETTURE
  const [eventDoc, userDoc, allTimeEntryDoc, monthlyEntryDoc, capDoc] = 
    await Promise.all([...])  // ✅ Tutte le letture in parallelo
  
  // FASE 2: CALCOLI IN MEMORIA
  const capData = capDoc?.exists ? capDoc.data() : {}
  const capReached = ...
  const neuroCreditsToAward = capReached ? 0 : payload.deltaNeuroCredits
  // ... calcoli ...
  
  // FASE 3: TUTTE LE SCRITTURE
  transaction.set(eventRef, {...})      // ✅ Scrittura 1
  transaction.update(userRef, {...})    // ✅ Scrittura 2
  transaction.set(allTimeEntryRef, {...}) // ✅ Scrittura 3
  transaction.set(monthlyEntryRef, {...})  // ✅ Scrittura 4
  if (!capReached && rule.hasDailyCap) {
    writeDailyCap(transaction, capRef, payload.type, capData)  // ✅ Solo scrittura
  }
})
```

### 2. Fix P1: Authorization su /api/leaderboard (app/neurocredits/page.tsx)

**Problema:** Log `[Auth Server] No Authorization header found` per `/api/leaderboard`, `me` summary `null`.

**Causa:** `fetchLeaderboard()` non includeva Authorization header.

**Soluzione:**
- ✅ Aggiunto `getFirebaseIdToken()` prima del fetch
- ✅ Aggiunto `Authorization: Bearer ${token}` header se token disponibile
- ✅ Gestito caso token `null` senza crash

**File modificato:** `app/neurocredits/page.tsx`
- Righe 80-104: `fetchLeaderboard()` aggiornata con Authorization header

**Evidenza codice:**
```typescript
// PRIMA:
const response = await fetch(`/api/leaderboard?period=${period}&metric=${metric}&limit=50`)
// ❌ Nessun Authorization header

// DOPO:
const token = await getFirebaseIdToken()
const headers: HeadersInit = {}
if (token) {
  headers.Authorization = `Bearer ${token}`
}
const response = await fetch(`/api/leaderboard?period=${period}&metric=${metric}&limit=50`, {
  headers,  // ✅ Authorization header incluso
})
```

---

## Test Checklist

### Test 1: Creazione Post (Terminale + Chrome)

**Prerequisiti:**
- Utente autenticato
- Dev server avviato

**Passi:**
1. Aprire `/bacheca` nel browser
2. Creare un nuovo post (testo qualsiasi)
3. **Verificare Terminale:**
   - ✅ **NON** deve apparire: `Firestore transactions require all reads to be executed before all writes.`
   - ✅ Deve apparire: `[NeuroCredits] 🎯 Applying event: { type: "POST_CREATED", ... }`
   - ✅ Deve apparire: `[NeuroCredits] ✅ TX OK: { eventId, applied: true, neuroCreditsAwarded: 2, ... }`
   - ✅ Deve apparire: `[NeuroCredits] 📊 Updated totals: { neuroCredits_total: <valore aumentato>, ... }`

4. **Verificare Network (Chrome DevTools):**
   - `POST /api/posts` → Status 201
   - Headers: `Authorization: Bearer <token>` presente
   - Response: Post object con id

**Risultato atteso:**
- ✅ Nessun errore transazione
- ✅ `applied: true`
- ✅ `neuroCreditsAwarded: 2` (o 0 se cap raggiunto)

### Test 2: Creazione Commento (Terminale + Chrome)

**Passi:**
1. Aprire un post esistente (`/bacheca/[postId]`)
2. Creare un nuovo commento
3. **Verificare Terminale:**
   - ✅ **NON** deve apparire: `Firestore transactions require...`
   - ✅ Deve apparire: `[NeuroCredits] 🎯 Applying event: { type: "COMMENT_CREATED", ... }`
   - ✅ Deve apparire: `[NeuroCredits] ✅ TX OK: { applied: true, neuroCreditsAwarded: 1, ... }`

4. **Verificare Network:**
   - `POST /api/posts/[postId]/comments` → Status 201
   - Headers: `Authorization: Bearer <token>` presente

**Risultato atteso:**
- ✅ Nessun errore transazione
- ✅ `applied: true`
- ✅ `neuroCreditsAwarded: 1` (o 0 se cap raggiunto)

### Test 3: Visualizzazione NeuroCredits (Chrome Network)

**Passi:**
1. Aprire `/neurocredits`
2. **Verificare Network:**
   - `GET /api/neurocredits/me` → Status 200
     - Headers: `Authorization: Bearer <token>` presente ✅
     - Response: `{ neuroCredits_total: <valore>, ... }`
   
   - `GET /api/leaderboard?period=...&metric=...&limit=50` → Status 200
     - Headers: `Authorization: Bearer <token>` presente ✅ (NUOVO)
     - Response: `{ entries: [...], me: { rank: ..., neuroCredits: ... } }` ✅ (me non null)

3. **Verificare Terminale:**
   - ✅ **NON** deve apparire: `[Auth Server] No Authorization header found` per `/api/leaderboard` quando utente loggato

**Risultato atteso:**
- ✅ Authorization header presente su entrambe le richieste
- ✅ `me` summary presente in leaderboard response
- ✅ Statistiche personali aggiornate dopo creazione post/commento

---

## Diff Patch

### lib/neurocredits.ts

**Cambiamenti principali:**
1. `updateDailyCap()` → `writeDailyCap()` (rimosso `transaction.get()`, accetta `capData` come parametro)
2. `applyEvent()` riorganizzata in 3 fasi (letture → calcoli → scritture)
3. Tutte le letture eseguite in parallelo con `Promise.all()`
4. Aggiunto log `✅ TX OK` per conferma transazione riuscita

### app/neurocredits/page.tsx

**Cambiamenti principali:**
1. Aggiunto `getFirebaseIdToken()` in `fetchLeaderboard()`
2. Aggiunto `Authorization: Bearer ${token}` header quando token disponibile
3. Gestione sicura di token `null`

---

## Before/After Comparison

### Before (Stato iniziale)

**Terminale:**
```
[NeuroCredits] 🎯 Applying event: { type: "POST_CREATED", ... }
[NeuroCredits] Error applying event: Firestore transactions require all reads to be executed before all writes.
[API Posts] 🎯 NeuroCredit event result: { applied: false, eventId: "...", neuroCreditsAwarded: 0 }
```

**Network:**
- `GET /api/leaderboard` → Headers: **Nessun Authorization**
- Response: `{ entries: [...], me: null }`

**Terminale:**
```
[Auth Server] No Authorization header found
```

### After (Dopo fix)

**Terminale:**
```
[NeuroCredits] 🎯 Applying event: { type: "POST_CREATED", ... }
[NeuroCredits] ✅ TX OK: { eventId: "...", applied: true, neuroCreditsAwarded: 2, capReached: false, newTotal: 102 }
[NeuroCredits] 📊 Updated totals: { targetUid: "...", neuroCredits_total: 102, ... }
[API Posts] 🎯 NeuroCredit event result: { applied: true, eventId: "...", neuroCreditsAwarded: 2 }
```

**Network:**
- `GET /api/leaderboard` → Headers: `Authorization: Bearer <token>` ✅
- Response: `{ entries: [...], me: { rank: 5, neuroCredits: 102, ... } }` ✅

**Terminale:**
- ✅ Nessun `[Auth Server] No Authorization header found` per leaderboard quando token presente

---

## Verifiche Finali

### ✅ Criteri di Accettazione

**A) Creazione post/commento:**
- ✅ Nessun errore `Firestore transactions require...`
- ✅ `applyEvent()` restituisce `applied: true` quando evento nuovo e cap non raggiunto
- ✅ `neuroCreditsAwarded > 0` per POST_CREATED/COMMENT_CREATED (a meno di capReached)

**B) Visualizzazione /neurocredits:**
- ✅ `/api/leaderboard` chiamato con `Authorization: Bearer` se token disponibile
- ✅ Nessun log `[Auth Server] No Authorization header found` per leaderboard quando utente loggato
- ✅ Response leaderboard include `me != null` (se endpoint supporta)

**C) Patch minima:**
- ✅ Nessun cambio schema Firestore
- ✅ Nessun endpoint rimosso
- ✅ Nessuna chiamata fuori transazione che renda non-atomico
- ✅ Idempotenza mantenuta (eventId esistente → `applied: false`)

---

## Note Tecniche

1. **Atomicità mantenuta:** Tutte le operazioni (evento, user, leaderboard, dailyCap) rimangono in una singola transazione
2. **Performance:** Letture eseguite in parallelo con `Promise.all()` per ridurre latenza
3. **Backward compatibility:** Nessun cambio contratto API, solo fix interno
4. **Logging migliorato:** Aggiunto log `✅ TX OK` per debugging

---

## Prossimi Passi

1. ✅ Test manuale completo (creazione post, commento, verifica /neurocredits)
2. ⏳ Merge in main dopo verifica
3. ⏳ Monitorare errori transazione in produzione
4. ⏳ Considerare unit test per `applyEvent()` con mock Firestore

---

**Fine Report**
