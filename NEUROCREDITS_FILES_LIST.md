# NeuroCredits - Elenco File Creati/Modificati

## File Creati (8 nuovi)

### Core System
1. **lib/neurocredits-rules.ts** - Regole e configurazione NeuroCredits
2. **lib/neurocredits-levels.ts** - Sistema livelli (calcolo livello, progresso, nomi)
3. **lib/neurocredits.ts** - Sistema eventi idempotenti, applicazione crediti, streak, caps

### API Routes
4. **app/api/videos/[videoId]/complete/route.ts** - POST completa video
5. **app/api/leaderboard/route.ts** - GET leaderboard ordinabile
6. **app/api/neurocredits/me/route.ts** - GET statistiche personali

### UI
7. **app/neurocredits/page.tsx** - Pagina leaderboard con tabs periodo/metrica e stats personali

### Documentazione
8. **NEUROCREDITS_IMPLEMENTATION.md** - Documentazione completa
9. **NEUROCREDITS_FILES_LIST.md** - Questo file

## File Modificati (4)

1. **app/api/posts/route.ts** - Aggiunto `touchDailyActive()` dopo creazione post
2. **app/api/posts/[postId]/like/route.ts** - Aggiunto `applyEvent()` per LIKE_RECEIVED/UNLIKE_RECEIVED + `touchDailyActive()`
3. **app/api/posts/[postId]/comments/route.ts** - Aggiunto `touchDailyActive()` dopo creazione commento
4. **app/area-riservata/dashboard/page.tsx** - Aggiunto link "NeuroCredits"

## Schema Firestore Completo

### users/{uid}
- `neuroCredits_total`, `neuroCredits_monthly`
- `videosCompleted_total`, `videosCompleted_monthly`
- `activeDays_total`, `activeDays_monthly`
- `lastActiveDate`, `streak_current`, `streak_best`

### users/{uid}/dailyCaps/{YYYY-MM-DD}
- `videoCreditsUsed`, `dailyActiveUsed`

### users/{uid}/videoProgress/{videoId}
- `completed`, `completedAt`, `lastWatchedAt`

### leaderboards/{periodId}/entries/{uid}
- `neuroCredits`, `videosCompleted`, `activeDays`
- `displayName`, `avatarUrl`

### neurocredit_events/{eventId}
- Eventi idempotenti con `eventId` deterministico

## Endpoint API

- `POST /api/videos/[videoId]/complete` - Completa video
- `GET /api/leaderboard?period=...&metric=...&limit=...` - Leaderboard
- `GET /api/neurocredits/me` - Statistiche personali

## Caratteristiche

✅ Eventi idempotenti via `eventId` deterministico  
✅ Daily caps per video (3/giorno) e daily active (1/giorno)  
✅ Streak automatico server-side  
✅ Leaderboard ordinabile per 3 metriche e 2 periodi  
✅ Sistema livelli con progresso  
✅ Integrazione automatica in tutte le azioni "serie"  
✅ Tutto server-side, nessun calcolo client  

## Test Manuale

1. ✅ Like ricevuto accredita +1 una sola volta
2. ✅ Unlike sottrae 1 una sola volta
3. ✅ Video completato incrementa videosCompleted e +1 NeuroCredit (entro cap)
4. ✅ Primo evento del giorno crea DAILY_ACTIVE: activeDays +1, streak aggiornato
5. ✅ Leaderboard ordinabile per 3 metriche e periodo mensile/all_time




