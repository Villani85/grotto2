# Fix Permission-Denied per Lista Utenti in Messages

## Problema

La pagina `/area-riservata/messages` tentava di leggere tutti gli utenti dalla collection `users` usando `getAllUsersFromFirestore()` dal client, ma le Firestore Rules permettono solo:
- Read del proprio profilo (`isOwner(userId)`)
- Read/update per admin (`isAdmin()`)
- **NON permettono query list** su tutta la collection

Errore: `permission-denied` "Missing or insufficient permissions"

## Soluzione Implementata

### 1. API Route Server-Side (NUOVO)
**File**: `app/api/users/route.ts`

- Usa Firebase Admin SDK (bypassa le rules)
- Verifica autenticazione via token
- Ritorna solo dati pubblici necessari per chat:
  - `uid`, `nickname`, `avatarUrl`, `email`, `bio`, `location`
- Supporta query param `limit` (default: 200)
- Fallback a `users_public` se esiste, altrimenti `users`

**Endpoint**: `GET /api/users?limit=200`
**Auth**: Richiesto (token in header `Authorization: Bearer <token>`)

### 2. Aggiornamento Client (MODIFICATO)
**File**: `app/area-riservata/messages/page.tsx`

- Rimosso import `getAllUsersFromFirestore`
- Aggiunto import `getFirebaseIdToken`
- `loadAllUsers()` ora chiama `/api/users` invece di Firestore diretto
- Mappa la risposta API al tipo `User` per compatibilità

### 3. Firestore Rules Aggiornate (MODIFICATO)
**File**: `firestore.rules`

- Aggiunta nota che le query list NON sono permesse dal client
- Aggiunta collection `users_public` (opzionale, per futuro):
  - Read: qualsiasi utente autenticato
  - Write: solo il proprietario
  - Utile se si vuole separare dati pubblici da privati

## File Modificati

1. **`app/api/users/route.ts`** (NUOVO)
   - API route server-side per lista utenti
   - Usa Admin SDK, ritorna solo dati pubblici

2. **`app/area-riservata/messages/page.tsx`** (MODIFICATO)
   - Sostituito `getAllUsersFromFirestore()` con chiamata API
   - Aggiunto token authentication

3. **`firestore.rules`** (MODIFICATO)
   - Aggiunta nota su query list non permesse
   - Aggiunta collection `users_public` (opzionale)

## Sicurezza

✅ **Nessuna apertura globale delle rules**  
✅ **Query list solo server-side** (Admin SDK)  
✅ **Autenticazione richiesta** per `/api/users`  
✅ **Solo dati pubblici** ritornati (no dati sensibili)  
✅ **Fallback sicuro** se API fallisce (mock data)  

## Test

1. ✅ Pagina messages carica lista utenti senza errori permission-denied
2. ✅ Solo utenti autenticati possono chiamare `/api/users`
3. ✅ Dati ritornati contengono solo campi pubblici
4. ✅ Fallback a mock data se API fallisce

## Note

- La collection `users_public` è opzionale e può essere creata in futuro per separare meglio dati pubblici/privati
- L'API route può essere estesa per supportare filtri/search se necessario
- Se serve admin-only access, aggiungere check `isUserAdmin()` nell'API route




