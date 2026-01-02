# NeuroCredits + Leaderboard - Documentazione Completa

## File Creati (NUOVI)

### Core System
1. **lib/neurocredits-rules.ts** - Regole e configurazione NeuroCredits
2. **lib/neurocredits-levels.ts** - Sistema livelli (calcolo livello, progresso)
3. **lib/neurocredits.ts** - Sistema eventi idempotenti e applicazione crediti

### API Routes
4. **app/api/videos/[videoId]/complete/route.ts** - POST completa video
5. **app/api/leaderboard/route.ts** - GET leaderboard ordinabile
6. **app/api/neurocredits/me/route.ts** - GET statistiche personali

### UI
7. **app/neurocredits/page.tsx** - Pagina leaderboard con tabs e stats personali

### Documentazione
8. **NEUROCREDITS_IMPLEMENTATION.md** - Questo file

## File Modificati

1. **app/api/posts/route.ts** - Aggiunto `touchDailyActive()` dopo creazione post
2. **app/api/posts/[postId]/like/route.ts** - Aggiunto `applyEvent()` per LIKE_RECEIVED/UNLIKE_RECEIVED + `touchDailyActive()`
3. **app/api/posts/[postId]/comments/route.ts** - Aggiunto `touchDailyActive()` dopo creazione commento
4. **app/area-riservata/dashboard/page.tsx** - Aggiunto link "NeuroCredits"

## Schema Firestore

### Collection: `users/{uid}`
```typescript
{
  displayName: string
  avatarUrl: string | null
  neuroCredits_total: number
  neuroCredits_monthly: { [periodId: string]: number }  // { "2025-12": 42 }
  videosCompleted_total: number
  videosCompleted_monthly: { [periodId: string]: number }  // { "2025-12": 7 }
  activeDays_total: number
  activeDays_monthly: { [periodId: string]: number }  // { "2025-12": 12 }
  lastActiveDate: string | null  // "YYYY-MM-DD"
  streak_current: number
  streak_best: number
  updatedAt: Timestamp
}
```

### Subcollection: `users/{uid}/dailyCaps/{YYYY-MM-DD}`
```typescript
{
  videoCreditsUsed: number  // Contatore video completati con crediti oggi
  dailyActiveUsed: boolean  // Se DAILY_ACTIVE è stato già applicato oggi
  updatedAt: Timestamp
}
```

### Subcollection: `users/{uid}/videoProgress/{videoId}`
```typescript
{
  completed: boolean
  completedAt: Timestamp | null
  lastWatchedAt: Timestamp | null
}
```

### Collection: `leaderboards/{periodId}/entries/{uid}`
```typescript
{
  neuroCredits: number
  videosCompleted: number
  activeDays: number
  displayName: string
  avatarUrl: string | null
  updatedAt: Timestamp
}
// periodId: "all_time" oppure "YYYY-MM"
```

### Collection: `neurocredit_events/{eventId}`
```typescript
{
  type: "LIKE_RECEIVED" | "UNLIKE_RECEIVED" | "VIDEO_COMPLETED" | "DAILY_ACTIVE"
  targetUid: string
  actorUid: string
  periodId: string
  deltaNeuroCredits: number
  deltaVideosCompleted: number
  deltaActiveDays: number
  ref: { postId?: string, videoId?: string, date?: string }
  createdAt: Timestamp
}
// eventId deterministico per idempotenza:
// - LIKE_RECEIVED: like:${postId}:${likerUid}
// - UNLIKE_RECEIVED: unlike:${postId}:${likerUid}
// - VIDEO_COMPLETED: video_completed:${videoId}:${uid}
// - DAILY_ACTIVE: daily_active:${uid}:${YYYY-MM-DD}
```

## Regole NeuroCredits

### Community (Principale)
- **LIKE_RECEIVED**: +1 NeuroCredit per like ricevuto (senza cap)
- **UNLIKE_RECEIVED**: -1 NeuroCredit per unlike ricevuto

### Video (Peso Leggero)
- **VIDEO_COMPLETED**: +1 NeuroCredit SOLO la prima volta che completi quel video
  - Cap giornaliero: max 3 video completati al giorno che danno NeuroCredits
  - Salva comunque `videosCompleted` anche oltre il cap

### Giorni Attivi (Peso Leggero)
- **DAILY_ACTIVE**: +1 NeuroCredit al primo evento del giorno (max 1/giorno)
  - Incrementa anche `activeDays` come metrica
  - Si attiva automaticamente quando l'utente compie QUALSIASI azione "seria":
    - Crea post
    - Commenta
    - Mette like
    - Completa video

## Sistema Livelli

Livelli basati su NeuroCredits totali:
- Livello 1: 0+ (Principiante)
- Livello 2: 100+ (Apprendista)
- Livello 3: 250+ (Studioso)
- Livello 4: 500+ (Esperto)
- Livello 5: 1000+ (Maestro)
- ... fino a livello 15 (Supremo)

Ogni livello ha un nome e mostra progresso verso il prossimo livello.

## Funzionalità Implementate

### ✅ Eventi Idempotenti
- Tutti gli eventi usano `eventId` deterministico
- Se evento già esiste, non viene riapplicato
- Garantisce che like/video completati non diano crediti doppi

### ✅ Daily Caps
- Video: max 3 crediti al giorno
- Daily Active: max 1 credito al giorno
- Le metriche (`videosCompleted`, `activeDays`) vengono sempre incrementate, anche oltre il cap
- Solo i NeuroCredits sono limitati dal cap

### ✅ Streak System
- Calcolato automaticamente server-side
- Se `lastActiveDate` è ieri → `streak_current += 1`
- Se `lastActiveDate` è oggi → nessun cambiamento
- Altrimenti → `streak_current = 1`
- `streak_best = max(streak_best, streak_current)`

### ✅ Leaderboard
- Periodi: `all_time` e mensile (`YYYY-MM`)
- Metriche: `neuroCredits`, `videosCompleted`, `activeDays`
- Ordinabile per qualsiasi metrica
- Include "me" summary anche se fuori dalla top 50

### ✅ Integrazione Automatica
- `touchDailyActive()` chiamato automaticamente in:
  - Creazione post
  - Creazione commento
  - Like/Unlike
  - Completamento video
- `applyEvent()` chiamato in:
  - Like ricevuto → LIKE_RECEIVED
  - Unlike ricevuto → UNLIKE_RECEIVED
  - Video completato → VIDEO_COMPLETED

## API Endpoints

### POST /api/videos/[videoId]/complete
Completa un video e assegna NeuroCredits.

**Request**: Nessun body (videoId da URL, uid da token)

**Response**:
```json
{
  "neuroCreditsTotal": 150,
  "videosCompletedTotal": 5,
  "periodStats": {
    "neuroCredits": 50,
    "videosCompleted": 2
  },
  "capsInfo": {
    "videoCreditsUsed": 2,
    "videoCreditsCap": 3
  },
  "neuroCreditsAwarded": 1
}
```

### GET /api/leaderboard
Leaderboard ordinabile per periodo e metrica.

**Query Params**:
- `period`: `all_time` | `monthly` (default: `all_time`)
- `metric`: `neuroCredits` | `videosCompleted` | `activeDays` (default: `neuroCredits`)
- `limit`: number (default: 50, max: 100)

**Response**:
```json
{
  "period": "all_time",
  "metric": "neuroCredits",
  "entries": [
    {
      "rank": 1,
      "uid": "...",
      "displayName": "User",
      "avatarUrl": "...",
      "neuroCredits": 1000,
      "videosCompleted": 50,
      "activeDays": 30
    }
  ],
  "me": {
    "rank": 5,
    "neuroCredits": 500,
    "videosCompleted": 25,
    "activeDays": 20
  }
}
```

### GET /api/neurocredits/me
Statistiche personali NeuroCredits.

**Request**: Richiede autenticazione (token in header)

**Response**:
```json
{
  "neuroCredits_total": 1000,
  "neuroCredits_month_current": 150,
  "videosCompleted_total": 50,
  "videosCompleted_month_current": 10,
  "activeDays_total": 30,
  "activeDays_month_current": 12,
  "streak_current": 5,
  "streak_best": 10,
  "level": {
    "current": 5,
    "name": "Maestro",
    "progress": {
      "current": 1000,
      "next": 2000,
      "progress": 50.0
    }
  }
}
```

## Sicurezza

✅ **Tutte le scritture server-side** con Firebase Admin SDK  
✅ **Nessun calcolo punti dal client** - tutto server-side  
✅ **Validazione token** in tutte le route di scrittura  
✅ **Idempotenza garantita** via `neurocredit_events/{eventId}`  
✅ **targetUid sempre dal DB** - mai dal client (es. autore post per like)  
✅ **Caps giornalieri** applicati server-side  

## Test Manuale

### ✅ Test 1: Like Ricevuto
- [ ] Utente A pubblica post
- [ ] Utente B mette like → Utente A riceve +1 NeuroCredit
- [ ] Like già esistente → nessun credito aggiuntivo (idempotente)
- [ ] Leaderboard aggiornato

### ✅ Test 2: Unlike
- [ ] Utente B toglie like → Utente A perde -1 NeuroCredit
- [ ] Unlike già applicato → nessun cambiamento (idempotente)

### ✅ Test 3: Video Completato
- [ ] Utente completa video → +1 NeuroCredit, +1 videosCompleted
- [ ] Stesso video completato di nuovo → nessun credito (idempotente)
- [ ] 4° video completato oggi → +1 videosCompleted ma 0 NeuroCredits (cap raggiunto)

### ✅ Test 4: Daily Active
- [ ] Primo evento del giorno → +1 NeuroCredit, +1 activeDays, streak aggiornato
- [ ] Secondo evento dello stesso giorno → nessun credito (cap), ma streak non cambia
- [ ] Evento giorno successivo → streak incrementato

### ✅ Test 5: Leaderboard
- [ ] Leaderboard ordinabile per 3 metriche
- [ ] Periodo all_time vs mensile funzionante
- [ ] "Me" summary incluso anche fuori top 50

## Note Implementative

1. **Idempotenza**: Tutti gli eventi usano `eventId` deterministico per evitare doppi accrediti
2. **Transaction**: Tutti gli aggiornamenti usano Firestore transactions per consistenza
3. **Denormalizzazione**: Leaderboard entries contengono `displayName` e `avatarUrl` per performance
4. **Caps**: Le metriche (`videosCompleted`, `activeDays`) vengono sempre incrementate, solo i NeuroCredits sono limitati
5. **Streak**: Calcolato automaticamente basandosi su `lastActiveDate` (server-side)
6. **Daily Active**: Chiamato automaticamente in tutte le azioni "serie" (idempotente, quindi sicuro)

## Prossimi Passi (Opzionali)

- [ ] Notifiche push per milestone (livello raggiunto, streak record)
- [ ] Badge/achievements basati su milestone
- [ ] Grafici progresso nel tempo
- [ ] Export dati personali
- [ ] Sfide mensili/settimanali
- [ ] Team/clan leaderboard




