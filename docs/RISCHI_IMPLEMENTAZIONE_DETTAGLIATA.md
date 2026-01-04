# Analisi Dettagliata Rischi Implementazione: Gestione Dinamica Livelli

## 📋 Prefazione

Questo documento analizza i **5 rischi critici** identificati nell'implementazione della gestione dinamica dei livelli e obiettivi. Per ogni rischio, vengono forniti:

1. **Analisi dello stato attuale** del codebase
2. **Controlli specifici** da eseguire
3. **Modifiche suggerite** con esempi di codice
4. **Checklist di verifica**

---

## 🔴 RISCHIO 1: Complessità dell'Asincronicità (Async/Await)

### ⚠️ Problema Identificato

Rendere `calculateLevel()`, `getLevelName()`, `getCreditsForNextLevel()`, `getProgressToNextLevel()` **async** richiede di aggiornare **tutta la catena di chiamate**. Un `await` dimenticato causa bug subdoli (Promise invece del valore reale).

### 📊 Analisi Stato Attuale

#### Punti di Utilizzo Identificati (6 file):

1. **`lib/profile-stats.ts`** - `computeLevel()` (sincrono)
   - Usato da: `getDerivedStats()` (già async ✅)
   - Chiama: `calculateLevel()`, `getCreditsForNextLevel()`, `getProgressToNextLevel()`, `getLevelName()`
   - **Impatto**: Deve diventare `async computeLevel()`

2. **`app/api/neurocredits/me/route.ts`** - API Route (già async ✅)
   - Usa: `calculateLevel()`, `getProgressToNextLevel()`, `getLevelName()`
   - **Impatto**: Aggiungere `await` alle chiamate

3. **`app/area-riservata/dashboard/page.tsx`** - Client Component ("use client")
   - **PROBLEMA CRITICO**: Ha funzione locale `calculateLevel()` con logica diversa
   - Non usa le funzioni centralizzate
   - **Impatto**: Fix bug + rimuovere funzione locale + gestire async

4. **`app/neurocredits/page.tsx`** - Client Component ("use client")
   - Importa funzioni ma non le usa direttamente
   - Usa API `/api/neurocredits/me` che già calcola i livelli
   - **Impatto**: Minimo (API già gestisce async)

5. **`app/area-riservata/profile/page.tsx`** - Client Component
   - Usa: `getDerivedStats()` via API `/api/profile/me` (indiretto)
   - **Impatto**: Verificare che API gestisca async

6. **`app/u/[uid]/page.tsx`** - Client Component
   - Usa: `getDerivedStats()` via API `/api/profile/${uid}` (indiretto)
   - **Impatto**: Verificare che API gestisca async

### 🔍 Controlli Richiesti

#### Checklist Completa:

- [ ] **Mappatura completa chiamate**: Cercare tutte le occorrenze di `calculateLevel`, `getLevelName`, `getCreditsForNextLevel`, `getProgressToNextLevel`
- [ ] **Verifica catena async**: Per ogni chiamata, risalire la catena e verificare che ogni funzione sia `async` e usi `await`
- [ ] **Componenti React Client**: Verificare che i Client Components gestiscano async tramite `useEffect` + state, non chiamate dirette
- [ ] **TypeScript**: Verificare che TypeScript segnali errori se Promise non viene awaitata (configurare `no-floating-promises`)

### 📝 Modifiche Suggerite

#### 1. Modificare `lib/neurocredits-levels.ts`

```typescript
// PRIMA (sincrono)
export function calculateLevel(neuroCredits: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (neuroCredits >= LEVELS[i].creditsRequired) {
      return LEVELS[i].level
    }
  }
  return 1
}

// DOPO (async con adapter)
export async function calculateLevel(neuroCredits: number): Promise<number> {
  const levels = await getLevelsConfig() // Adapter con fallback
  for (let i = levels.length - 1; i >= 0; i--) {
    if (neuroCredits >= levels[i].minPoints) {
      return levels[i].level
    }
  }
  return 1
}

// Adapter con fallback
async function getLevelsConfig(): Promise<LevelConfig[]> {
  try {
    const config = await getLevelsFromFirestore()
    if (config && config.length > 0) return config
  } catch (error) {
    console.warn("[Levels] Firestore read failed, using defaults:", error)
  }
  return DEFAULT_LEVELS // Fallback a costanti
}
```

#### 2. Modificare `lib/profile-stats.ts`

```typescript
// PRIMA (sincrono)
export function computeLevel(neuroCreditsTotal: number): LevelInfo {
  const levelId = calculateLevel(neuroCreditsTotal) // ❌ Manca await
  // ...
}

// DOPO (async)
export async function computeLevel(neuroCreditsTotal: number): Promise<LevelInfo> {
  const levelId = await calculateLevel(neuroCreditsTotal) // ✅ Con await
  const nextLevelPoints = await getCreditsForNextLevel(neuroCreditsTotal)
  const progress = await getProgressToNextLevel(neuroCreditsTotal)
  // ... resto invariato
}

// Aggiornare getDerivedStats (già async, aggiungere await)
export async function getDerivedStats(uid: string): Promise<ProfileStats | null> {
  // ...
  const level = await computeLevel(neuroCreditsTotal) // ✅ Aggiungere await
  // ...
}
```

#### 3. Modificare `app/api/neurocredits/me/route.ts`

```typescript
// PRIMA
const currentLevel = calculateLevel(neuroCreditsTotal) // ❌ Manca await
const levelProgress = getProgressToNextLevel(neuroCreditsTotal) // ❌ Manca await

// DOPO
const currentLevel = await calculateLevel(neuroCreditsTotal) // ✅
const levelProgress = await getProgressToNextLevel(neuroCreditsTotal) // ✅
const levelName = await getLevelName(currentLevel) // ✅
```

#### 4. Fix Critico: `app/area-riservata/dashboard/page.tsx`

```typescript
// PRIMA (BUG: logica diversa)
const calculateLevel = (points: number) => {
  return Math.floor(points / 1000) + 1 // ❌ Sbagliato!
}

// DOPO (rimuovere funzione locale, usare API)
"use client"
import { useState, useEffect } from "react"

export default function DashboardPage() {
  const { user } = useAuth()
  const [levelInfo, setLevelInfo] = useState<{ level: number; name: string } | null>(null)
  const [isLoadingLevel, setIsLoadingLevel] = useState(true)

  useEffect(() => {
    if (user?.uid) {
      fetchLevelInfo()
    }
  }, [user?.uid])

  const fetchLevelInfo = async () => {
    try {
      setIsLoadingLevel(true)
      const token = await getFirebaseIdToken()
      if (!token) return

      const response = await fetch("/api/neurocredits/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setLevelInfo({
          level: data.level.current,
          name: data.level.name,
        })
      }
    } catch (error) {
      console.error("Error fetching level:", error)
    } finally {
      setIsLoadingLevel(false)
    }
  }

  // Usare levelInfo.level invece di calculateLevel(user.pointsTotal)
  // Mostrare skeleton durante isLoadingLevel
}
```

#### 5. Verifica API Routes Indirette

Verificare che `/api/profile/me` e `/api/profile/[uid]` usino `getDerivedStats()` con `await`:

```typescript
// app/api/profile/me/route.ts (se esiste)
export async function GET(request: NextRequest) {
  // ...
  const derivedStats = await getDerivedStats(user.uid) // ✅ Deve essere await
  return NextResponse.json({ derivedStats })
}
```

### ✅ Checklist Verifica Finale

- [ ] Tutte le funzioni in `lib/neurocredits-levels.ts` sono `async`
- [ ] `computeLevel()` in `lib/profile-stats.ts` è `async` e usa `await` per tutte le chiamate
- [ ] Tutte le API Routes usano `await` per le funzioni async
- [ ] Dashboard fixato: rimossa funzione locale, usa API
- [ ] TypeScript configurato con `no-floating-promises: error` (in `tsconfig.json`)
- [ ] Test manuale: verificare che i livelli vengano mostrati correttamente in tutte le pagine

---

## 🔴 RISCHIO 2: Gestione della Cache

### ⚠️ Problema Identificato

Cache serve dati "stale" se admin aggiorna livelli. TTL di 5 minuti può essere frustrante per admin che vuole vedere subito i cambiamenti.

### 📊 Analisi Stato Attuale

#### Stato Cache nel Progetto:

- ✅ **Next.js 16**: Supporta `unstable_cache` (disponibile)
- ❌ **Nessuna cache implementata** per configurazioni NeuroCredits
- ✅ **Pattern esistente**: Alcuni file usano `cache: "no-store"` in fetch (es. `app/academy/page.tsx`)

#### Pannello Admin:

- ✅ Pannello admin esiste: `app/area-riservata/admin/neurocredits/page.tsx`
- ⚠️ Da verificare: Come viene salvata la configurazione (API route da identificare)

### 🔍 Controlli Richiesti

#### Checklist Completa:

- [ ] **Identificare API di salvataggio**: Trovare route che salva configurazione livelli dal pannello admin
- [ ] **Implementare cache con tag**: Usare `unstable_cache` con tag per invalidazione
- [ ] **Implementare invalidazione attiva**: Chiamare `revalidateTag()` dopo salvataggio admin
- [ ] **Test cache**: Verificare che cache funzioni (dati vecchi dopo modifica, dati nuovi dopo invalidazione)

### 📝 Modifiche Suggerite

#### 1. Creare Adapter con Cache: `lib/neurocredits-levels-adapter.ts` (NUOVO)

```typescript
import { unstable_cache } from 'next/cache'

interface LevelConfig {
  level: number
  minPoints: number
  name: string
  color?: string
  icon?: string
}

const DEFAULT_LEVELS: LevelConfig[] = [
  { level: 1, minPoints: 0, name: "Principiante" },
  { level: 2, minPoints: 100, name: "Apprendista" },
  // ... (da lib/neurocredits-levels.ts)
]

/**
 * Get levels from Firestore (no cache)
 */
async function getLevelsFromFirestore(): Promise<LevelConfig[] | null> {
  try {
    const { getAdminApp } = await import('./firebase-admin')
    const app = await getAdminApp()
    if (!app) return null

    const { getFirestore } = await import('firebase-admin/firestore')
    const db = getFirestore(app)

    const snapshot = await db
      .collection('gamification_levels')
      .orderBy('level', 'asc')
      .get()

    if (snapshot.empty) return null

    return snapshot.docs.map(doc => ({
      level: doc.data().levelId,
      minPoints: doc.data().minPoints,
      name: doc.data().name,
      color: doc.data().color,
      icon: doc.data().icon,
    }))
  } catch (error) {
    console.error('[Levels Adapter] Error reading from Firestore:', error)
    return null
  }
}

/**
 * Get levels config with cache (TTL 5 minuti, tag per invalidazione)
 */
export async function getLevelsConfig(): Promise<LevelConfig[]> {
  // Cache con tag per invalidazione
  const getCachedLevels = unstable_cache(
    async () => {
      const firestoreLevels = await getLevelsFromFirestore()
      return firestoreLevels || DEFAULT_LEVELS
    },
    ['gamification-levels'], // Cache key
    {
      tags: ['gamification-levels'], // Tag per revalidateTag()
      revalidate: 300, // 5 minuti TTL
    }
  )

  return getCachedLevels()
}
```

#### 2. API Route Salvataggio: Invalidazione Cache

```typescript
// app/api/admin/neurocredits/config/draft/route.ts (o simile)
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  await requireAdmin(request)
  
  // ... salva configurazione in Firestore ...

  // ✅ INVALIDARE CACHE DOPO SALVATAGGIO
  revalidateTag('gamification-levels')
  
  return NextResponse.json({ success: true })
}
```

#### 3. API Route Publish: Invalidazione Cache

```typescript
// app/api/admin/neurocredits/config/publish/route.ts
import { revalidateTag } from 'next/cache'

export async function POST(request: NextRequest) {
  await requireAdmin(request)
  
  // ... pubblica configurazione ...

  // ✅ INVALIDARE CACHE DOPO PUBBLICAZIONE
  revalidateTag('gamification-levels')
  
  return NextResponse.json({ success: true })
}
```

### ✅ Checklist Verifica Finale

- [ ] Cache implementata con `unstable_cache` e tag `gamification-levels`
- [ ] Invalidazione cache dopo salvataggio draft (API route)
- [ ] Invalidazione cache dopo pubblicazione (API route)
- [ ] Test manuale: Modificare livelli → Cache mostra dati vecchi → Invalidare → Cache mostra dati nuovi
- [ ] Fallback a DEFAULT_LEVELS se Firestore fallisce o è vuoto

---

## 🔴 RISCHIO 3: Race Conditions nell'Engine Asincrono

### ⚠️ Problema Identificato

Due eventi simultanei per lo stesso utente potrebbero creare race condition se l'engine asincrono verifica obiettivi senza transazioni.

### 📊 Analisi Stato Attuale

#### Pattern Transazioni Esistenti:

✅ **Buona pratica**: `lib/neurocredits.ts` usa già transazioni Firestore correttamente:
- `applyEvent()` usa `db.runTransaction()` per operazioni atomiche
- `updateStreak()` usa `db.runTransaction()` per aggiornamenti streak

✅ **Esempio positivo**: `lib/repositories/live-events.ts` usa transazioni per operazioni complesse

#### Engine Obiettivi (Da Implementare):

- ❌ **Non ancora implementato**: Engine asincrono per obiettivi
- ⚠️ **Rischio**: Se implementato senza transazioni, race conditions possibili

### 🔍 Controlli Richiesti

#### Checklist Completa:

- [ ] **Verificare Cloud Functions**: Se si usano Firestore Triggers, verificare che usino transazioni
- [ ] **Verificare API Routes Async**: Se si usa API route per verifiche asincrone, verificare transazioni
- [ ] **Pattern Lettura-Scrittura**: Tutte le operazioni di lettura e scrittura devono essere atomiche

### 📝 Modifiche Suggerite

#### 1. Cloud Function per Verifica Obiettivi (Consigliato)

```typescript
// functions/src/neurocredits/checkAchievements.ts
import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'

export const onNeuroCreditEventCreated = functions.firestore
  .document('neurocredit_events/{eventId}')
  .onCreate(async (snap, context) => {
    const event = snap.data()
    const targetUid = event.targetUid

    const db = admin.firestore()

    // ✅ USARE TRANSAZIONE per evitare race conditions
    await db.runTransaction(async (transaction) => {
      // 1. Leggere stato attuale utente (atomico)
      const userRef = db.collection('users').doc(targetUid)
      const userDoc = await transaction.get(userRef)
      const userData = userDoc.data()

      if (!userData) return

      const neuroCreditsTotal = userData.neuroCredits_total || 0

      // 2. Verificare se utente ha raggiunto nuovo livello
      const levelsSnapshot = await transaction.get(
        db.collection('gamification_levels').orderBy('minPoints', 'desc')
      )
      const levels = levelsSnapshot.docs.map(doc => doc.data())

      let newLevel: number | null = null
      for (const level of levels) {
        if (neuroCreditsTotal >= level.minPoints) {
          newLevel = level.levelId
          break
        }
      }

      // 3. Verificare obiettivi completati (leggere achievements utente in transazione)
      const achievementsRef = db.collection('gamification_achievements')
      const userAchievementsRef = userRef.collection('achievements')

      const achievementsSnapshot = await transaction.get(achievementsRef)
      const userAchievementsSnapshot = await transaction.get(userAchievementsRef)

      const completedAchievementIds = new Set(
        userAchievementsSnapshot.docs.map(doc => doc.id)
      )

      for (const achievementDoc of achievementsSnapshot.docs) {
        const achievement = achievementDoc.data()
        const achievementId = achievementDoc.id

        // Skip se già completato
        if (completedAchievementIds.has(achievementId)) continue

        // Verificare condizioni (esempio: neuroCreditsReached)
        if (achievement.triggerType === 'neuroCreditsReached') {
          if (neuroCreditsTotal >= achievement.threshold) {
            // ✅ SCRIVERE in transazione (atomico)
            transaction.set(
              userAchievementsRef.doc(achievementId),
              {
                completedAt: admin.firestore.FieldValue.serverTimestamp(),
                rewardGranted: true,
              },
              { merge: true }
            )

            // Log per notifiche (fuori transazione)
            console.log(`[Achievements] User ${targetUid} completed: ${achievementId}`)
          }
        }
      }

      // 4. Aggiornare livello utente se cambiato (atomico)
      if (newLevel && newLevel !== userData.level_current) {
        transaction.update(userRef, {
          level_current: newLevel,
          level_updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }
    })
  })
```

#### 2. Alternativa: API Route con Transazione (Se non si usano Cloud Functions)

```typescript
// app/api/internal/check-achievements/route.ts (INTERNO, non pubblico)
import { requireAdmin } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  // Solo chiamabile internamente (non esporre pubblicamente)
  await requireAdmin(request) // O meglio: verifica header interno

  const { userId, eventType } = await request.json()
  const db = getFirestore(app)

  // ✅ USARE TRANSAZIONE
  await db.runTransaction(async (transaction) => {
    // ... stesso pattern della Cloud Function ...
  })

  return NextResponse.json({ success: true })
}

// Chiamare dopo applyEvent() (non blocca, fire-and-forget)
fetch('/api/internal/check-achievements', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: JSON.stringify({ userId: payload.targetUid, eventType: payload.type }),
}).catch(error => console.error('Error checking achievements:', error))
```

### ✅ Checklist Verifica Finale

- [ ] Tutte le operazioni di lettura/scrittura obiettivi usano `db.runTransaction()`
- [ ] Nessuna operazione di scrittura obiettivi è fuori da transazione
- [ ] Test race condition: Simulare due eventi simultanei → Verificare che non ci siano duplicati
- [ ] Logging per debugging: Log ogni operazione in transazione

---

## 🔴 RISCHIO 4: User Experience (UX) durante il Caricamento

### ⚠️ Problema Identificato

Pagine che prima mostravano livelli istantaneamente (dati statici) ora dovranno caricarli async. Rischi: "pop-in", dati incompleti, mancanza di notifiche per obiettivi sbloccati.

### 📊 Analisi Stato Attuale

#### Pattern Loading States Esistenti:

✅ **Componenti disponibili**:
- `components/ui/skeleton.tsx` - Skeleton loader
- `components/ui/spinner.tsx` - Spinner
- `components/posts/PostListSkeleton.tsx` - Skeleton per liste

✅ **Pattern esistenti**:
- `app/neurocredits/page.tsx`: Usa `isLoading` state + mostra skeleton/spinner
- `app/u/[uid]/page.tsx`: Mostra spinner durante caricamento profilo
- `app/bacheca/page.tsx`: Usa `isLoading` state

#### Pattern Notifiche Esistenti:

✅ **Sistema toast disponibile**:
- `components/ui/toast.tsx` - Componente toast
- `components/ui/toaster.tsx` - Provider toast
- `hooks/use-toast.ts` - Hook `useToast()`
- `components/ui/sonner.tsx` - Alternativa Sonner

✅ **Uso attuale**:
- Usato in alcuni componenti (es. `components/posts/PostComposer.tsx`)

### 🔍 Controlli Richiesti

#### Checklist Completa:

- [ ] **6 punti di utilizzo**: Verificare che ogni componente abbia loading state
- [ ] **Skeleton loaders**: Implementare skeleton per livelli/obiettivi
- [ ] **Notifiche obiettivi**: Sistema per notificare obiettivi sbloccati in tempo reale
- [ ] **Real-time updates**: Listener Firestore o WebSockets per notifiche

### 📝 Modifiche Suggerite

#### 1. Creare Skeleton per Level Info: `components/ui/level-skeleton.tsx` (NUOVO)

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function LevelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
    </div>
  )
}
```

#### 2. Aggiornare `app/area-riservata/dashboard/page.tsx`

```typescript
export default function DashboardPage() {
  const { user } = useAuth()
  const [levelInfo, setLevelInfo] = useState<{ level: number; name: string; progress: number } | null>(null)
  const [isLoadingLevel, setIsLoadingLevel] = useState(true)

  // ... fetchLevelInfo ...

  return (
    <div>
      {/* Level Card */}
      {isLoadingLevel ? (
        <LevelSkeleton /> // ✅ Skeleton durante caricamento
      ) : levelInfo ? (
        <div>
          <Badge>Livello {levelInfo.level}</Badge>
          <span>{levelInfo.name}</span>
          <Progress value={levelInfo.progress} />
        </div>
      ) : (
        <div>Errore nel caricamento</div>
      )}
    </div>
  )
}
```

#### 3. Sistema Notifiche Obiettivi: Listener Firestore (Client)

```typescript
// hooks/use-achievement-notifications.ts (NUOVO)
"use client"

import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { getFirestoreClient } from '@/lib/firebase-client'

export function useAchievementNotifications() {
  const { user } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    if (!user?.uid) return

    const db = getFirestoreClient()
    if (!db) return

    // ✅ LISTENER Firestore per nuovi achievement completati
    const achievementsRef = db
      .collection('users')
      .doc(user.uid)
      .collection('achievements')
      .where('completedAt', '>', new Date(Date.now() - 60000)) // Ultimo minuto
      .orderBy('completedAt', 'desc')
      .limit(5)

    const unsubscribe = achievementsRef.onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const achievementData = change.doc.data()

            // ✅ MOSTRARE TOAST NOTIFICA
            toast({
              title: "🎉 Obiettivo Sbloccato!",
              description: achievementData.title || "Hai completato un obiettivo",
              duration: 5000,
            })
          }
        })
      },
      (error) => {
        console.error('[Achievements] Error listening:', error)
      }
    )

    return () => unsubscribe()
  }, [user?.uid, toast])
}

// Usare in layout o pagina principale
// app/layout.tsx o app/area-riservata/layout.tsx
export default function Layout({ children }) {
  useAchievementNotifications() // ✅ Hook globale
  return <>{children}</>
}
```

#### 4. Alternativa: Polling API (Se Firestore listener non disponibile)

```typescript
// hooks/use-achievement-notifications-polling.ts
"use client"

import { useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/hooks/use-toast'

export function useAchievementNotificationsPolling() {
  const { user } = useAuth()
  const { toast } = useToast()
  const lastCheckedRef = useRef<Date>(new Date())

  useEffect(() => {
    if (!user?.uid) return

    const interval = setInterval(async () => {
      try {
        const token = await getFirebaseIdToken()
        if (!token) return

        const response = await fetch(`/api/achievements/recent?since=${lastCheckedRef.current.toISOString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (response.ok) {
          const data = await response.json()
          data.achievements.forEach((achievement: any) => {
            toast({
              title: "🎉 Obiettivo Sbloccato!",
              description: achievement.title,
              duration: 5000,
            })
          })

          if (data.achievements.length > 0) {
            lastCheckedRef.current = new Date()
          }
        }
      } catch (error) {
        console.error('[Achievements] Error polling:', error)
      }
    }, 10000) // Poll ogni 10 secondi

    return () => clearInterval(interval)
  }, [user?.uid, toast])
}
```

#### 5. API Route per Recent Achievements (Se si usa polling)

```typescript
// app/api/achievements/recent/route.ts
export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  const since = request.nextUrl.searchParams.get('since')

  const db = getFirestore(app)
  const achievementsRef = db
    .collection('users')
    .doc(user.uid)
    .collection('achievements')
    .where('completedAt', '>', since ? new Date(since) : new Date(Date.now() - 60000))
    .orderBy('completedAt', 'desc')
    .limit(10)

  const snapshot = await achievementsRef.get()
  const achievements = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }))

  return NextResponse.json({ achievements })
}
```

### ✅ Checklist Verifica Finale

- [ ] Tutti i 6 punti di utilizzo hanno loading states (skeleton o spinner)
- [ ] Skeleton component creato e utilizzato per level info
- [ ] Sistema notifiche implementato (Firestore listener o polling)
- [ ] Toast notifications funzionanti per obiettivi sbloccati
- [ ] Test UX: Verificare che non ci siano "pop-in" degli elementi
- [ ] Test notifiche: Sbloccare obiettivo → Verificare che toast appaia

---

## 🔴 RISCHIO 5: Migrazione Dati Utenti Esistenti

### ⚠️ Problema Identificato

Utenti esistenti potrebbero avere livelli calcolati con la vecchia logica statica. Quando si passa a livelli dinamici, potrebbero rimanere "bloccati" al vecchio livello se non si ricalcola.

### 📊 Analisi Stato Attuale

#### Stato Migrazione:

- ❌ **Nessuno script di migrazione** esistente
- ✅ **Dati utenti**: `users/{uid}` contiene `neuroCredits_total` (campo necessario per ricalcolo)
- ⚠️ **Campo livello**: Da verificare se esiste `level_current` nel documento utente

### 🔍 Controlli Richiesti

#### Checklist Completa:

- [ ] **Verificare schema utente**: Esiste campo `level_current` in `users/{uid}`?
- [ ] **Script di backfilling**: Creare script per ricalcolare livelli di tutti gli utenti
- [ ] **Test migrazione**: Testare script su utente di test prima di eseguire su tutti
- [ ] **Rollback plan**: Piano di rollback se migrazione fallisce

### 📝 Modifiche Suggerite

#### 1. Script di Migrazione: `scripts/migrate-user-levels.ts` (NUOVO)

```typescript
/**
 * Script di migrazione: Ricalcola livelli per tutti gli utenti esistenti
 * 
 * Uso:
 *   npx tsx scripts/migrate-user-levels.ts
 * 
 * ATTENZIONE: Eseguire solo una volta dopo la migrazione a livelli dinamici
 */

import { getAdminApp } from '../lib/firebase-admin'
import { calculateLevel } from '../lib/neurocredits-levels'

async function migrateUserLevels() {
  console.log('[Migration] Starting user levels migration...')

  const app = await getAdminApp()
  if (!app) {
    throw new Error('Firebase Admin not initialized')
  }

  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore(app)

  try {
    // 1. Leggere tutti gli utenti
    const usersSnapshot = await db.collection('users').get()
    console.log(`[Migration] Found ${usersSnapshot.size} users`)

    let successCount = 0
    let errorCount = 0
    const batchSize = 500 // Firestore batch limit

    // 2. Processare in batch
    for (let i = 0; i < usersSnapshot.docs.length; i += batchSize) {
      const batch = db.batch()
      const batchDocs = usersSnapshot.docs.slice(i, i + batchSize)

      for (const userDoc of batchDocs) {
        try {
          const userData = userDoc.data()
          const neuroCreditsTotal = userData.neuroCredits_total || 0

          // ✅ RICALCOLARE LIVELLO con nuova funzione async
          const newLevel = await calculateLevel(neuroCreditsTotal)

          // Verificare se livello è cambiato
          const currentLevel = userData.level_current || 0
          if (newLevel !== currentLevel) {
            console.log(
              `[Migration] User ${userDoc.id}: Level ${currentLevel} → ${newLevel} (${neuroCreditsTotal} credits)`
            )

            // ✅ AGGIORNARE in batch
            batch.update(userDoc.ref, {
              level_current: newLevel,
              level_migratedAt: new Date(),
            })
          }
        } catch (error) {
          console.error(`[Migration] Error processing user ${userDoc.id}:`, error)
          errorCount++
        }
      }

      // ✅ COMMIT BATCH
      await batch.commit()
      successCount += batchDocs.length
      console.log(`[Migration] Processed ${successCount}/${usersSnapshot.size} users`)
    }

    console.log(`[Migration] ✅ Completed!`)
    console.log(`[Migration] Success: ${successCount}, Errors: ${errorCount}`)
  } catch (error) {
    console.error('[Migration] ❌ Fatal error:', error)
    process.exit(1)
  }
}

// Eseguire se chiamato direttamente
if (require.main === module) {
  migrateUserLevels()
    .then(() => {
      console.log('[Migration] Script completed successfully')
      process.exit(0)
    })
    .catch((error) => {
      console.error('[Migration] Script failed:', error)
      process.exit(1)
    })
}

export { migrateUserLevels }
```

#### 2. Script di Verifica: `scripts/verify-levels-migration.ts` (NUOVO)

```typescript
/**
 * Script di verifica: Verifica che tutti gli utenti abbiano livelli corretti
 * 
 * Uso:
 *   npx tsx scripts/verify-levels-migration.ts
 */

import { getAdminApp } from '../lib/firebase-admin'
import { calculateLevel } from '../lib/neurocredits-levels'

async function verifyLevelsMigration() {
  console.log('[Verify] Starting levels verification...')

  const app = await getAdminApp()
  if (!app) {
    throw new Error('Firebase Admin not initialized')
  }

  const { getFirestore } = await import('firebase-admin/firestore')
  const db = getFirestore(app)

  try {
    const usersSnapshot = await db.collection('users').get()
    console.log(`[Verify] Checking ${usersSnapshot.size} users...`)

    let correctCount = 0
    let incorrectCount = 0
    const incorrectUsers: Array<{ uid: string; current: number; expected: number; credits: number }> = []

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const neuroCreditsTotal = userData.neuroCredits_total || 0
      const currentLevel = userData.level_current || 0

      // Ricalcolare livello atteso
      const expectedLevel = await calculateLevel(neuroCreditsTotal)

      if (currentLevel === expectedLevel) {
        correctCount++
      } else {
        incorrectCount++
        incorrectUsers.push({
          uid: userDoc.id,
          current: currentLevel,
          expected: expectedLevel,
          credits: neuroCreditsTotal,
        })
      }
    }

    console.log(`[Verify] ✅ Correct: ${correctCount}`)
    console.log(`[Verify] ❌ Incorrect: ${incorrectCount}`)

    if (incorrectUsers.length > 0) {
      console.log('\n[Verify] Incorrect users:')
      incorrectUsers.slice(0, 10).forEach((user) => {
        console.log(
          `  - ${user.uid}: Level ${user.current} (expected ${user.expected}) - ${user.credits} credits`
        )
      })
      if (incorrectUsers.length > 10) {
        console.log(`  ... and ${incorrectUsers.length - 10} more`)
      }
    }

    return { correctCount, incorrectCount, incorrectUsers }
  } catch (error) {
    console.error('[Verify] ❌ Fatal error:', error)
    throw error
  }
}

if (require.main === module) {
  verifyLevelsMigration()
    .then((result) => {
      if (result.incorrectCount > 0) {
        console.log('\n[Verify] ⚠️  Some users have incorrect levels. Run migration script?')
        process.exit(1)
      } else {
        console.log('\n[Verify] ✅ All users have correct levels!')
        process.exit(0)
      }
    })
    .catch((error) => {
      console.error('[Verify] Script failed:', error)
      process.exit(1)
    })
}

export { verifyLevelsMigration }
```

#### 3. Aggiungere Campo Livello a Schema Utente (Se non esiste)

```typescript
// Se il campo level_current non esiste nel documento utente,
// aggiungerlo durante la migrazione (lo script sopra lo fa)

// Schema suggerito:
interface User {
  // ... campi esistenti ...
  level_current?: number // Livello attuale (calcolato da neuroCredits_total)
  level_updatedAt?: Date // Data ultimo aggiornamento livello
  level_migratedAt?: Date // Data migrazione (solo per tracking)
}
```

### ✅ Checklist Verifica Finale

- [ ] Script di migrazione creato e testato su utente di test
- [ ] Script di verifica creato per controllare risultati
- [ ] Test dry-run: Eseguire verifica prima della migrazione
- [ ] Backup database: Backup prima della migrazione (se possibile)
- [ ] Eseguire migrazione: Eseguire script su produzione
- [ ] Verificare risultati: Eseguire script di verifica dopo migrazione
- [ ] Monitoraggio: Monitorare errori durante migrazione

---

## 📋 Checklist Finale Completa

### Pre-Implementazione

- [ ] Fix bug dashboard (rimuovere funzione locale `calculateLevel`)
- [ ] Rimuovere duplicazione `LEVELS` da `profile-stats.ts`
- [ ] Creare regole Firestore per nuove collection (`gamification_levels`, `gamification_achievements`)
- [ ] Configurare TypeScript: `no-floating-promises: error`

### Implementazione

- [ ] **Rischio 1 (Async)**: Tutte le funzioni async aggiornate, await aggiunti
- [ ] **Rischio 2 (Cache)**: Cache implementata con tag, invalidazione dopo salvataggio
- [ ] **Rischio 3 (Race Conditions)**: Engine asincrono usa transazioni Firestore
- [ ] **Rischio 4 (UX)**: Loading states, skeleton, notifiche implementate
- [ ] **Rischio 5 (Migrazione)**: Script di migrazione creato e testato

### Post-Implementazione

- [ ] Test manuale completo su tutti i 6 punti di utilizzo
- [ ] Test cache (modifica livelli → verifica invalidazione)
- [ ] Test race conditions (eventi simultanei)
- [ ] Test UX (loading states, notifiche)
- [ ] Eseguire migrazione utenti esistenti
- [ ] Verificare migrazione con script di verifica
- [ ] Monitoraggio errori in produzione

---

## 📝 Note Finali

### Ordine di Implementazione Consigliato

1. **Fase 0 (Pre-requisiti)**: Fix bug, rimozione duplicazioni, regole Firestore
2. **Fase 1 (Adapter + Cache)**: Implementare adapter con cache e invalidazione
3. **Fase 2 (Async Migration)**: Rendere funzioni async, aggiornare tutti i punti di utilizzo
4. **Fase 3 (UX)**: Implementare loading states e notifiche
5. **Fase 4 (Engine)**: Implementare engine asincrono obiettivi (con transazioni)
6. **Fase 5 (Migrazione)**: Eseguire script di migrazione utenti esistenti

### Testing Strategy

- **Unit Tests**: Testare funzioni async individualmente
- **Integration Tests**: Testare cache, invalidazione, transazioni
- **E2E Tests**: Testare flusso completo (modifica livelli → verifica UI)
- **Manual Tests**: Test UX, notifiche, race conditions

---

**Documento creato**: Analisi completa dei rischi con controlli specifici e modifiche suggerite.
