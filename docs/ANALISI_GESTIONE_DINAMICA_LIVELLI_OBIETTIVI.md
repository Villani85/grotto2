# Analisi: Gestione Dinamica Livelli e Obiettivi

## 📋 Verifica Analisi Utente

### ✅ Conferme

L'analisi fornita è **corretta e ben strutturata**. La strategia proposta (Hybrid Mode → Engine Asincrono → Migrazione Graduale) è **solida e minimizza i rischi**.

### ⚠️ Impatti Aggiuntivi Identificati

#### 1. **BUG CRITICO: Duplicazione Logica Livelli nel Dashboard**

**File**: `app/area-riservata/dashboard/page.tsx` (linee 37-39)

```typescript
// ❌ PROBLEMA: Logica diversa da lib/neurocredits-levels.ts
const calculateLevel = (points: number) => {
  return Math.floor(points / 1000) + 1  // Sbagliato! Non usa la logica corretta
}
```

**Impatto**: 
- Il dashboard mostra livelli **diversi** da quelli calcolati dal sistema reale
- Usa una formula lineare (1000 punti/livello) invece della logica con soglie (0, 100, 250, 500, ...)
- **RISCHIO**: Confusione utente, dati inconsistenti

**Fix Richiesto**:
- Rimuovere la funzione locale
- Importare `calculateLevel` da `@/lib/neurocredits-levels`

---

#### 2. **DUPLICAZIONE: Array LEVELS Hardcoded**

**File**: `lib/profile-stats.ts` (linee 33-49)

```typescript
// ❌ DUPLICAZIONE: Array LEVELS copiato da lib/neurocredits-levels.ts
const LEVELS = [
  { level: 1, creditsRequired: 0 },
  { level: 2, creditsRequired: 100 },
  // ... (stesso array di lib/neurocredits-levels.ts)
]
```

**Impatto**:
- Se i livelli cambiano, bisogna aggiornare **2 file**
- Rischio di inconsistenza tra file
- **RISCHIO**: Bug se un file viene aggiornato e l'altro no

**Fix Richiesto**:
- Rimuovere l'array duplicato
- Importare le funzioni da `lib/neurocredits-levels.ts`
- Quando si migra a DB, questo problema si risolve automaticamente

---

#### 3. **API Admin NeuroCredits Esistente**

**File**: `app/area-riservata/admin/neurocredits/page.tsx`

**Situazione Attuale**:
- ✅ Pannello admin NeuroCredits **già esiste**
- ✅ Gestisce: Rules, Levels, Objectives, Rewards
- ⚠️ Usa ancora configurazione **statica** (draft/active in Firestore `admin_settings/neurocredits_config`)
- ⚠️ Non gestisce ancora livelli dinamici da collection separata

**Impatto sulla Strategia**:
- La **Fase 1 (Hybrid Mode)** può essere integrata nel pannello esistente
- Non serve creare nuova UI, ma modificare quella esistente
- Il pannello già gestisce "draft" vs "active", quindi la migrazione è più semplice

---

#### 4. **Punti di Utilizzo Funzioni Livelli**

**File che usano `calculateLevel()`, `getLevelName()`, ecc.**:

1. ✅ `lib/profile-stats.ts` - `computeLevel()` (usato da API profile)
2. ✅ `app/api/neurocredits/me/route.ts` - API stats personali
3. ⚠️ `app/area-riservata/dashboard/page.tsx` - **USA LOGICA DIVERSA** (bug)
4. ✅ `app/neurocredits/page.tsx` - Importa ma potrebbe non usare direttamente
5. ✅ `app/area-riservata/profile/page.tsx` - Usa `getDerivedStats()` (indiretto)
6. ✅ `app/u/[uid]/page.tsx` - Usa `getDerivedStats()` (indiretto)

**Impatto sulla Migrazione**:
- Tutti questi file dovranno gestire `async` quando `calculateLevel()` diventa asincrona
- Il dashboard dovrà essere fixato **PRIMA** della migrazione

---

#### 5. **Regole Firestore Mancanti**

**File**: `firestore.rules`

**Collezioni da Aggiungere**:
```javascript
// gamification_levels (configurazione livelli)
match /gamification_levels/{levelId} {
  // Tutti possono leggere (per calcolo livelli)
  allow read: if isAuthenticated();
  
  // Solo admin può scrivere
  allow write: if isAdmin();
}

// gamification_achievements (definizioni obiettivi)
match /gamification_achievements/{achievementId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

// users/{uid}/achievements (tracciamento obiettivi utente)
match /users/{userId}/achievements/{achievementId} {
  // Utente può leggere i propri achievement
  allow read: if isOwner(userId);
  
  // Solo server (Admin SDK) può creare/aggiornare
  allow write: if false; // Bloccato, solo via API
}
```

**Impatto**:
- Deve essere implementato **PRIMA** di creare le collection
- Bloccare scritture client-side per prevenire frodi

---

#### 6. **Sistema Eventi Esistente**

**File**: `lib/neurocredits.ts` - `applyEvent()`

**Situazione Attuale**:
- ✅ Sistema eventi **idempotente** già implementato
- ✅ Usa transazioni Firestore
- ✅ Gestisce daily caps, leaderboard, streak
- ⚠️ **NON** verifica obiettivi dopo assegnazione crediti

**Impatto sulla Strategia**:
- La **Fase 2 (Engine Asincrono)** è **essenziale**
- Mettere la verifica obiettivi **dentro** la transazione di `applyEvent()` sarebbe:
  - ❌ Troppo lento (query multiple, calcoli complessi)
  - ❌ Rischio timeout transazione
  - ❌ Aumenta complessità transazione (più letture)

**Soluzione Consigliata**:
- ✅ Mantenere `applyEvent()` **veloce** (solo assegnazione crediti)
- ✅ Dopo `applyEvent()`, accodare task asincrono per verifica obiettivi
- ✅ Opzioni:
  1. **Firestore Triggers** (Cloud Functions): Trigger su `neurocredit_events/{eventId}` → verifica obiettivi
  2. **Queue System** (Task Queue / Pub/Sub): Accodare task dopo `applyEvent()`
  3. **Batch Job** (periodico): Scansiona utenti e ricalcola obiettivi (meno in tempo reale)

---

## 📊 Strategia Confermata e Integrazioni

### Fase 1: Hybrid Mode (Feature Flag) ✅

**Modifiche Richieste**:

1. **Creare Adapter con Fallback**
   ```typescript
   // lib/neurocredits-levels-adapter.ts (NUOVO)
   export async function getLevelsConfig(): Promise<LevelConfig[]> {
     try {
       // Prova a leggere da Firestore
       const config = await getLevelsFromFirestore()
       if (config && config.length > 0) {
         return config
       }
     } catch (error) {
       console.warn("[Levels] Firestore read failed, using defaults:", error)
     }
     
     // Fallback a costanti statiche
     return DEFAULT_LEVELS
   }
   ```

2. **Rendere Funzioni Asincrone**
   ```typescript
   // lib/neurocredits-levels.ts (MODIFICATO)
   export async function calculateLevel(neuroCredits: number): Promise<number> {
     const levels = await getLevelsConfig()
     // ... logica esistente
   }
   ```

3. **Cache Server-Side**
   ```typescript
   // Usare unstable_cache di Next.js o cache in-memory
   import { unstable_cache } from 'next/cache'
   
   const getCachedLevels = unstable_cache(
     async () => getLevelsConfig(),
     ['gamification-levels'],
     { revalidate: 300 } // 5 minuti
   )
   ```

4. **Fix Bug Dashboard**
   - Rimuovere `calculateLevel` locale
   - Importare da `@/lib/neurocredits-levels`
   - Gestire `async/await`

5. **Rimuovere Duplicazione**
   - `lib/profile-stats.ts`: Rimuovere array `LEVELS` hardcoded
   - Importare funzioni da `lib/neurocredits-levels.ts`

---

### Fase 2: Engine Obiettivi Asincrono ✅

**Implementazione Consigliata**: **Firestore Triggers (Cloud Functions)**

**Motivazione**:
- ✅ Non richiede infrastruttura aggiuntiva (Task Queue)
- ✅ Trigger automatico su ogni evento
- ✅ Isolato da `applyEvent()` (non rallenta)
- ✅ Gestione errori/retry automatica

**Struttura**:
```typescript
// functions/src/neurocredits/checkAchievements.ts
export const onNeuroCreditEventCreated = functions.firestore
  .document('neurocredit_events/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data()
    
    // 1. Verifica se utente ha raggiunto nuovo livello
    await checkLevelUp(event.targetUid)
    
    // 2. Verifica obiettivi completati
    await checkAchievements(event.targetUid, event.type)
    
    // 3. Aggiorna users/{uid}/achievements se necessario
  })
```

**Alternative (se Cloud Functions non disponibile)**:
- **API Route + Queue**: Dopo `applyEvent()`, chiamare `/api/internal/check-achievements` (interno, non pubblico)
- **Cron Job**: Script periodico che scansiona eventi recenti (meno real-time)

---

### Fase 3: Migrazione Graduale ✅

**Ordine Consigliato**:

1. ✅ **Fix Bug Esistenti** (dashboard, duplicazioni)
2. ✅ **Creare Collection e Regole Firestore**
3. ✅ **Implementare Adapter Hybrid Mode**
4. ✅ **Popolare DB via Admin Panel**
5. ✅ **Test con Feature Flag** (usa DB se presente, altrimenti fallback)
6. ✅ **Rendere Funzioni Async** (tutti i punti di utilizzo)
7. ✅ **Sistema Obiettivi** (iniziare con trigger semplici: "Punti Totali", "Livello Raggiunto")
8. ✅ **Obiettivi Complessi** (trigger multipli, condizioni, subscription)

---

## 🔒 Sicurezza: Regole Firestore

### Collection: `gamification_levels`

```javascript
match /gamification_levels/{levelId} {
  // Configurazione livelli (pubblico, tutti possono leggere)
  allow read: if isAuthenticated();
  
  // Solo admin può modificare
  allow write: if isAdmin();
  
  // Validazione: levelId deve essere numerico
  allow create: if isAdmin() && 
                 request.resource.data.levelId is int &&
                 request.resource.data.minPoints is int;
}
```

### Collection: `gamification_achievements`

```javascript
match /gamification_achievements/{achievementId} {
  // Definitizioni obiettivi (pubblico)
  allow read: if isAuthenticated();
  
  // Solo admin può creare/modificare
  allow write: if isAdmin();
  
  // Validazione base
  allow create: if isAdmin() && 
                 request.resource.data.title is string &&
                 request.resource.data.triggerType is string;
}
```

### Subcollection: `users/{uid}/achievements`

```javascript
match /users/{userId}/achievements/{achievementId} {
  // Utente può leggere i propri achievement
  allow read: if isOwner(userId);
  
  // Admin può leggere tutti
  allow read: if isAdmin();
  
  // ❌ SCRITTURA BLOCCATA: Solo via Admin SDK (API)
  allow write: if false;
}
```

**Nota**: Le scritture su `users/{uid}/achievements` devono essere solo via API server-side (`requireAdmin()` o sistema interno).

---

## 📈 Rischio e Mitigazione

### Rischio 1: Performance `applyEvent()`

**Problema**: Se verifica obiettivi dentro transazione → lento, timeout

**Mitigazione**: ✅ **Engine Asincrono** (Fase 2)

---

### Rischio 2: Inconsistenza Durante Migrazione

**Problema**: Utenti vedono livelli diversi se DB è vuoto/inconsistente

**Mitigazione**: 
- ✅ **Hybrid Mode** con fallback a costanti
- ✅ **Feature Flag** per test graduale
- ✅ **Validazione DB** (se config vuoto → usa defaults)

---

### Rischio 3: Cache Stale

**Problema**: Admin cambia livelli, cache non si aggiorna → utenti vedono livelli vecchi

**Mitigazione**:
- ✅ **Cache TTL breve** (5 minuti)
- ✅ **Invalidazione cache** dopo salvataggio admin
- ✅ **Versione config** (timestamp/counter) per invalidare cache

---

### Rischio 4: Bug nel Dashboard (CRITICO)

**Problema**: Dashboard mostra livelli **sbagliati** (formula lineare invece di soglie)

**Mitigazione**: 
- ⚠️ **FIX IMMEDIATO RICHIESTO** prima della migrazione
- ✅ Rimuovere funzione locale
- ✅ Usare funzioni centralizzate

---

## ✅ Conclusione

### Analisi Utente: **CONFERMATA** ✅

La strategia proposta è **solida e ben pensata**. La suddivisione in fasi (Hybrid → Async → Graduale) minimizza i rischi.

### Impatti Aggiuntivi Identificati

1. ⚠️ **BUG CRITICO**: Dashboard usa logica livelli **diversa** → **FIX IMMEDIATO**
2. ⚠️ **DUPLICAZIONE**: Array `LEVELS` in `profile-stats.ts` → Rimuovere
3. ✅ **ADVANTAGE**: Pannello admin già esiste → Integrazione più semplice
4. ⚠️ **REGOLE FIRESTORE**: Da aggiungere per nuove collection
5. ⚠️ **PUNTI DI UTILIZZO**: 6 file da aggiornare per async (incl. dashboard fix)

### Raccomandazioni

1. **FASE 0 (Pre-Migrazione)**: Fix bug dashboard e duplicazioni
2. **FASE 1**: Implementare Hybrid Mode con cache
3. **FASE 2**: Engine obiettivi asincrono (Firestore Triggers)
4. **FASE 3**: Migrazione graduale con test

### Pronto per Implementazione? **SÌ** ✅

Con i fix preliminari (dashboard, duplicazioni) e l'aggiunta delle regole Firestore, la strategia è pronta per essere implementata.
