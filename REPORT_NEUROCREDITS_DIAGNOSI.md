# 🔍 DIAGNOSI NEUROCREDITS - Perché Non Funzionano

**Data:** 2025-01-27  
**Test Eseguito:** Browser automation + analisi codice

---

## ✅ COSA FUNZIONA

1. **Pagina `/neurocredits` si carica correttamente**
   - Le API `/api/neurocredits/me` e `/api/leaderboard` vengono chiamate
   - Le statistiche vengono mostrate (anche se a 0)
   - La UI è funzionante

2. **Creazione post funziona**
   - Il post viene creato correttamente in Firestore
   - Il post appare nella bacheca

3. **Sistema NeuroCredits è implementato correttamente**
   - Il codice per assegnare NeuroCredits è presente
   - Le regole sono definite correttamente
   - Il sistema di eventi idempotenti è implementato

---

## ❌ PROBLEMA PRINCIPALE

**I NeuroCredits NON vengono assegnati quando si crea un post.**

### Cause Possibili

#### 1. **Firebase Admin non inizializzato** (PIÙ PROBABILE)
- Se `getAdminApp()` ritorna `null`, `applyEvent()` ritorna `applied: false`
- Questo succede se:
  - `isDemoMode === true`
  - Le variabili d'ambiente Firebase Admin non sono configurate:
    - `FIREBASE_ADMIN_PROJECT_ID`
    - `FIREBASE_ADMIN_CLIENT_EMAIL`
    - `FIREBASE_ADMIN_PRIVATE_KEY`

**Codice rilevante:**
```typescript
// lib/firebase-admin.ts
if (isDemoMode) {
  return null
}

if (!firebaseAdminConfig.projectId || !firebaseAdminConfig.clientEmail || !firebaseAdminConfig.privateKey) {
  console.warn("[Firebase Admin] Missing configuration - running in demo mode")
  return null
}
```

```typescript
// lib/neurocredits.ts
const app = await getAdminApp()
if (!app) {
  console.warn("[NeuroCredits] Firebase Admin not initialized")
  return { applied: false, eventId: generateEventId(payload), neuroCreditsAwarded: 0 }
}
```

#### 2. **Modalità Demo Attiva**
- Se `NEXT_PUBLIC_DEMO_MODE === "true"` o se mancano le variabili Firebase Client
- In modalità demo, `applyEvent()` logga l'evento ma non salva realmente i NeuroCredits

**Codice rilevante:**
```typescript
// lib/neurocredits.ts
if (isDemoMode) {
  console.log("[NeuroCredits] Demo mode - event logged:", payload)
  return { applied: true, eventId: generateEventId(payload), neuroCreditsAwarded: payload.deltaNeuroCredits }
}
```

#### 3. **Errore nella Transazione Firestore**
- Se c'è un errore nella transazione, viene catturato e ritorna `applied: false`
- Gli errori vengono loggati ma potrebbero non essere visibili

---

## 🔧 COME VERIFICARE

### 1. Controllare i Log del Server
Quando crei un post, dovresti vedere nei log del terminale:
```
[API Posts] ✅ Post created: { postId, authorId }
[API Posts] 🎯 Applying POST_CREATED event: { ... }
[NeuroCredits] 🎯 Applying event: { ... }
[NeuroCredits] ✅ Event created: post:...
[NeuroCredits] 📊 Updated totals: { ... }
[API Posts] 🎯 NeuroCredit event result: { applied: true, ... }
[API Posts] 📊 Updated NeuroCredits: { total: 2, monthCurrent: 2 }
```

**Se vedi:**
- `[NeuroCredits] Firebase Admin not initialized` → Firebase Admin non configurato
- `[NeuroCredits] Demo mode - event logged` → Modalità demo attiva
- `[NeuroCredits] Error applying event:` → Errore nella transazione

### 2. Verificare Variabili d'Ambiente
Controlla se nel file `.env.local` (o `.env`) ci sono:
```env
# Firebase Client (necessarie per auth)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Firebase Admin (necessarie per NeuroCredits)
FIREBASE_ADMIN_PROJECT_ID=...
FIREBASE_ADMIN_CLIENT_EMAIL=...
FIREBASE_ADMIN_PRIVATE_KEY=...

# Modalità Demo (se presente, disabilita NeuroCredits reali)
NEXT_PUBLIC_DEMO_MODE=false
```

### 3. Test Diretto
Crea un post e controlla:
1. Console browser: dovresti vedere `[NeuroCredits] Stats loaded:` dopo il refresh
2. Terminale server: dovresti vedere i log `[NeuroCredits]` e `[API Posts]`
3. Firestore: verifica se esiste `neurocredit_events/{eventId}` e se `users/{uid}.neuroCredits_total` è aggiornato

---

## 🛠️ SOLUZIONI

### Soluzione 1: Configurare Firebase Admin
1. Ottieni le credenziali Firebase Admin dal progetto Firebase
2. Aggiungi le variabili d'ambiente nel file `.env.local`:
   ```env
   FIREBASE_ADMIN_PROJECT_ID=il-tuo-project-id
   FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@xxxxx.iam.gserviceaccount.com
   FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```
3. Riavvia il server Next.js

### Soluzione 2: Disabilitare Modalità Demo
Se `NEXT_PUBLIC_DEMO_MODE=true`, impostalo a `false` o rimuovilo:
```env
NEXT_PUBLIC_DEMO_MODE=false
```

### Soluzione 3: Verificare Log Server
Controlla il terminale dove gira `npm run dev` per vedere gli errori specifici quando crei un post.

---

## 📊 STATO ATTUALE

- ✅ **UI funzionante**: La pagina NeuroCredits si carica e mostra le statistiche
- ✅ **API funzionanti**: Le chiamate API vengono eseguite correttamente
- ✅ **Post creation funziona**: I post vengono creati in Firestore
- ❌ **NeuroCredits non assegnati**: Gli eventi non vengono salvati/elaborati

**Conclusione:** Il problema è probabilmente che Firebase Admin non è inizializzato o è in modalità demo, quindi `applyEvent()` ritorna `applied: false` e i NeuroCredits non vengono salvati.

---

## 🎯 PROSSIMI PASSI

1. **Verificare log server** quando crei un post per vedere l'errore esatto
2. **Configurare Firebase Admin** se mancano le variabili d'ambiente
3. **Disabilitare modalità demo** se attiva
4. **Testare di nuovo** creando un post e verificando che i NeuroCredits aumentino

---

**Versione:** 1.0  
**Data:** 2025-01-27
