# Estensione Profilo Utente - Livello e Classifica

## File Creati (NUOVI)

### Helper
1. **lib/profile-stats.ts** - Calcolo stats derivate (level, rank)
   - `computeLevel(neuroCreditsTotal)` - Calcola livello da NeuroCredits
   - `getRank(periodId, uid, metric)` - Calcola rank (COUNT aggregation o fallback top 200)
   - `getDerivedStats(uid)` - Ottiene tutte le stats derivate

### API Routes
2. **app/api/profile/me/route.ts** - GET e PUT profilo personale
   - GET: Ritorna publicProfile, privateProfile, derivedStats
   - PUT: Aggiorna profilo con validazione Zod

3. **app/api/profile/[uid]/route.ts** - GET profilo pubblico
   - Ritorna solo publicProfile + derivedStats pubbliche
   - NON legge mai users_private

### UI
4. **app/u/[uid]/page.tsx** - Pagina profilo pubblico
   - Mostra livello, NeuroCredits, rank (all-time e mensile)
   - Link "Vedi Leaderboard"
   - Solo dati pubblici

### Documentazione
5. **PROFILE_EXTENSION_FILES.md** - Questo file

## File Modificati (4)

1. **app/area-riservata/profile/page.tsx**
   - Aggiunta sezione "Progressi" con:
     - Badge livello
     - NeuroCredits totali e mese corrente
     - Rank all-time e mese corrente
     - Progress bar verso prossimo livello
     - Link a leaderboard

2. **components/posts/PostCard.tsx**
   - Link profilo aggiornato da `/members/${authorId}` a `/u/${authorId}`

3. **components/posts/CommentsList.tsx**
   - Aggiunto link profilo su nome autore e avatar
   - Link a `/u/${authorId}`

4. **app/bacheca/[postId]/page.tsx**
   - Link profilo aggiornato da `/members/${authorId}` a `/u/${authorId}`

## Schema Derived Stats

```typescript
interface ProfileStats {
  neuroCredits_total: number
  neuroCredits_month_current: number
  level: {
    levelId: number
    title: string
    minPoints: number
    nextLevelPoints: number | null
    pointsToNext: number
  }
  rank: {
    all_time: number | null
    month_current: number | null
  }
}
```

## Calcolo Rank

### Metodo Preferito (COUNT Aggregation)
1. Legge entry utente: `leaderboards/{periodId}/entries/{uid}`
2. Ottiene `userPoints = entry.neuroCredits`
3. Query: `where(neuroCredits > userPoints).count()`
4. `rank = countGreater + 1`

### Fallback (Top 200)
- Se COUNT non disponibile:
  1. Prende top 200: `orderBy(neuroCredits desc).limit(200)`
  2. Se uid presente: `rank = index + 1`
  3. Se non presente: `rank = null` (mostra "Fuori dalla top 200")

## API Endpoints

### GET /api/profile/me
**Auth**: Richiesto (token)

**Response**:
```json
{
  "publicProfile": {
    "uid": "...",
    "nickname": "...",
    "bio": "...",
    ...
  },
  "privateProfile": {
    ...
  },
  "derivedStats": {
    "neuroCredits_total": 1000,
    "neuroCredits_month_current": 150,
    "level": {
      "levelId": 5,
      "title": "Maestro",
      "minPoints": 1000,
      "nextLevelPoints": 2000,
      "pointsToNext": 1000
    },
    "rank": {
      "all_time": 5,
      "month_current": 3
    }
  }
}
```

### PUT /api/profile/me
**Auth**: Richiesto (token)

**Body**: Validato con Zod
- `nickname`, `bio`, `location`, `website`, `publicEmail`
- `interests`, `socialLinks`, `avatarUrl`

### GET /api/profile/[uid]
**Auth**: Opzionale (pubblico)

**Response**:
```json
{
  "publicProfile": {
    "uid": "...",
    "nickname": "...",
    ...
  },
  "derivedStats": {
    "neuroCredits_total": 1000,
    "neuroCredits_month_current": 150,
    "level": { ... },
    "rank": { ... }
  }
}
```

## UI Features

### /area-riservata/profile (Profilo Personale)
- ✅ Sezione "Progressi" con:
  - Badge livello (numero + nome)
  - NeuroCredits totali e mese corrente
  - Rank all-time e mese corrente
  - Progress bar verso prossimo livello
  - Link "Vedi Leaderboard"

### /u/[uid] (Profilo Pubblico)
- ✅ Header con avatar, nome, bio
- ✅ Box "NeuroCredits" con:
  - Livello (badge + nome)
  - NeuroCredits totali e mese corrente
  - Rank all-time e mese corrente
- ✅ Link "Vedi Leaderboard"
- ✅ Solo dati pubblici (bio, location, website, social, interests)

### Navigazione
- ✅ PostCard: click su nome/avatar → `/u/[authorId]`
- ✅ CommentsList: click su nome/avatar → `/u/[authorId]`
- ✅ Post detail: click su nome/avatar → `/u/[authorId]`

## Sicurezza

✅ **Nessun dato privato nel profilo pubblico**  
✅ **Rank/level/points sono ok da mostrare pubblicamente**  
✅ **Validazione Zod per aggiornamenti profilo**  
✅ **Auth richiesto per /api/profile/me**  
✅ **Pubblico accessibile per /api/profile/[uid]**  

## Test Manuale

1. ✅ Vedo il mio livello e rank in `/area-riservata/profile`
2. ✅ Click su nome utente in post → `/u/[uid]` mostra livello + punti + rank
3. ✅ Rank corretto (o fallback "Fuori dalla top 200")
4. ✅ Nessun dato privato nel profilo pubblico
5. ✅ Link "Vedi Leaderboard" funziona e evidenzia utente

## Note

- Rank calcolato server-side con COUNT aggregation (fallback top 200)
- Level calcolato usando `lib/neurocredits-levels.ts`
- Stats derivate sempre aggiornate (non cached)
- Profilo pubblico accessibile a tutti (anche non autenticati)
- Link profilo aggiornati da `/members/[userId]` a `/u/[uid]` per coerenza




