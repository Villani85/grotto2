# Mappa Sistema - Brain Hacking Academy (grotto2)

**Versione**: 1.0  
**Data**: 2026-01-03  
**Repository**: grotto2  
**Scopo**: Documentazione completa del sistema per Knowledge Base GPT

---

## 1. Scopo del Progetto

Brain Hacking Academy è una piattaforma di apprendimento online con sistema di gamification (NeuroCredits), community (Bacheca), corsi Academy, eventi live streaming, e sistema di messaggistica. Il progetto utilizza Next.js 16 con App Router, Firebase (Auth, Firestore, Storage), e un sistema di punti/crediti chiamato "NeuroCredits" per incentivare l'engagement degli utenti.

---

## 2. Stack & Tooling

### Core Framework
- **Next.js**: 16.0.10 (App Router, Server Components, Server Actions)
- **React**: 19.2.0
- **TypeScript**: 5.x
- **Node.js**: 22.x (verificare con `node -v`)

### Package Manager
- **npm** (package-lock.json presente)
- **pnpm** (pnpm-lock.yaml presente) - TODO: verificare quale è attivo con `npm config get package-manager`

### Backend & Database
- **Firebase Auth**: 11.1.0 (autenticazione utenti)
- **Firebase Admin SDK**: 13.6.0 (server-side operations)
- **Firestore**: database NoSQL per dati utenti, post, corsi, NeuroCredits
- **Firebase Storage**: file upload (immagini, video)

### UI & Styling
- **Tailwind CSS**: 4.x (styling utility-first)
- **shadcn/ui**: componenti UI riutilizzabili (in `components/ui/`)
- **Lucide React**: 0.454.0 (icone, preferito su react-icons)
- **Radix UI**: componenti headless (@radix-ui/react-*)

### Altri Servizi
- **AWS SDK S3**: 3.958.0 (recordings IVS)
- **Amazon IVS**: 1.31.1 (live streaming)
- **Resend**: 4.0.1 (email)
- **Zod**: 4.2.1 (validazione schemi)
- **Recharts**: grafici e visualizzazioni

---

## 3. Struttura Repository

```
grotto2/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes (Server-side)
│   │   ├── admin/                # Endpoint admin-only
│   │   │   ├── neurocredits/     # Config NeuroCredits (draft/publish/adjust)
│   │   │   ├── courses/          # Gestione corsi Academy
│   │   │   ├── live-events/      # Eventi live streaming
│   │   │   └── users/            # Gestione utenti admin
│   │   ├── posts/                # API post/commenti
│   │   ├── neurocredits/         # API NeuroCredits (me, events)
│   │   ├── leaderboard/          # Classifica NeuroCredits
│   │   └── ...
│   ├── area-riservata/           # Area utente autenticato
│   │   ├── dashboard/            # Dashboard principale
│   │   ├── community/            # Community (post/commenti)
│   │   ├── bacheca/              # Bacheca pubblica
│   │   ├── neurocredits/         # Pagina NeuroCredits utente
│   │   ├── profile/              # Profilo utente
│   │   └── admin/                # Area admin (neurocredits config)
│   ├── auth/                     # Autenticazione
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/     # Reset password
│   ├── admin/                    # Admin panel (layout separato)
│   ├── academy/                  # Corsi Academy pubblici
│   ├── live/                     # Eventi live pubblici
│   └── u/[uid]/                  # Profilo pubblico utente
├── components/                   # Componenti React riutilizzabili
│   ├── ui/                       # shadcn/ui components
│   ├── posts/                    # Componenti post/commenti
│   ├── layout/                   # Header, Footer
│   └── academy/                  # Componenti Academy
├── lib/                          # Utilities e logica business
│   ├── firebase-client.ts        # Inizializzazione Firebase client-side
│   ├── firebase-admin.ts         # Firebase Admin SDK
│   ├── neurocredits.ts           # Core logica NeuroCredits (applyEvent)
│   ├── neurocredits-config.ts    # Config dinamica (draft/publish)
│   ├── neurocredits-rules.ts     # Regole hardcoded (fallback)
│   ├── auth-server.ts            # Helpers auth server-side
│   ├── repositories/             # Repository pattern per Firestore
│   └── types.ts                  # TypeScript types
├── context/                      # React Context
│   └── AuthContext.tsx           # Context autenticazione
├── hooks/                        # Custom React hooks
├── public/                       # File statici
└── docs/                        # Documentazione
```

---

## 4. Autenticazione & Firebase

### Inizializzazione Firebase Client-Side

**File**: `lib/firebase-client.ts`

- **Pattern**: Singleton lazy initialization
- **Auto-init**: Se `isValidConfig === true`, inizializza automaticamente con `setTimeout(..., 0)` (non bloccante)
- **Funzioni esportate**:
  - `getFirebaseAuth()`: ritorna `Auth | null` (sync, può essere null se non inizializzato)
  - `getFirebaseFirestore()`: ritorna `Firestore | null`
  - `initializeFirebase()`: async, idempotente (se già inizializzato, ritorna subito)
- **Config validation**: Verifica che tutte le env vars siano presenti e valide
- **Demo mode**: Se config non valida, sistema funziona in "demo mode" con utente fittizio

### AuthContext

**File**: `context/AuthContext.tsx`

- **Provider**: `AuthProvider` wrappa l'app
- **Hook**: `useAuth()` per accedere a `user`, `firebaseUser`, `login()`, `logout()`, `register()`
- **State**: 
  - `user`: User object custom (da Firestore `users/{uid}`)
  - `firebaseUser`: Firebase Auth user
  - `isLoading`: stato caricamento iniziale
- **Pattern**: 
  - Inizializza Firebase al mount
  - Listener `onAuthStateChanged` per aggiornare state
  - Fetch profilo Firestore quando auth cambia
- **Demo mode**: Se Firebase non configurato, usa `DEMO_USER`

### Pattern API con Token

**File**: `lib/auth-server.ts`

- **Funzione**: `requireAuth(request: NextRequest)` → ritorna `{ uid, email }` o 401
- **Funzione**: `requireAdmin(request: NextRequest)` → verifica `isAdmin` in Firestore
- **Pattern**: 
  ```typescript
  const auth = await requireAuth(request)
  // auth.uid, auth.email disponibili
  ```
- **Token**: Legge `Authorization: Bearer <token>` header, verifica con Firebase Admin

**File**: `lib/api-helpers.ts`

- **Funzione**: `getFirebaseIdToken()` → ritorna token client-side (per chiamate API)
- **Uso**: Frontend chiama API con `Authorization: Bearer ${token}`

---

## 5. Moduli Principali

### 5.1 Bacheca/Community

**Pagine**:
- `app/bacheca/page.tsx`: Bacheca pubblica (feed post)
- `app/area-riservata/community/page.tsx`: Community area riservata
- `app/bacheca/[postId]/page.tsx`: Dettaglio post con commenti

**Componenti**:
- `components/posts/PostComposerV2.tsx`: Composer post (nuovo design)
- `components/posts/PostCardV2.tsx`: Card post (nuovo design)
- `components/posts/CommentsThread.tsx`: Thread commenti
- `components/posts/BachecaFilters.tsx`: Filtri per tipo post
- `components/posts/BachecaMiniLeaderboard.tsx`: Mini leaderboard sidebar

**API**:
- `app/api/posts/route.ts`: GET (lista) / POST (crea)
- `app/api/posts/[postId]/route.ts`: GET/PATCH/DELETE singolo post
- `app/api/posts/[postId]/comments/route.ts`: GET/POST commenti
- `app/api/posts/[postId]/comments/[commentId]/route.ts`: DELETE commento

**Tipi Post**: `insight`, `challenge`, `question` (definiti in `lib/validations.ts`)

### 5.2 NeuroCredits

**Logica Core**: `lib/neurocredits.ts`

- **Funzione principale**: `applyEvent(payload: NeuroCreditEventPayload)`
  - Genera `eventId` deterministico per idempotency
  - Transazione Firestore atomica (tutte le letture PRIMA delle scritture)
  - Aggiorna: `users/{uid}`, `neurocredit_events/{eventId}`, `leaderboards/{periodId}`, `dailyCaps/{uid}/{date}`
  - Rispetta `dailyCap` per tipo evento
  - Usa config dinamica (con fallback a regole hardcoded)

**Regole**: `lib/neurocredits-rules.ts`

- **Eventi supportati**: `POST_CREATED`, `COMMENT_CREATED`, `COMMENT_DELETED`, `LIKE_RECEIVED`, `UNLIKE_RECEIVED`, `VIDEO_COMPLETED`, `DAILY_ACTIVE`, `ADMIN_ADJUST`
- **Hardcoded fallback**: Se config Firestore non disponibile, usa `NEUROCREDITS_RULES`

**Config Dinamica**: `lib/neurocredits-config.ts`

- **Funzione**: `getActiveNeuroCreditsConfig()` → ritorna config attiva con cache 60s
- **Fallback**: Se nessuna config attiva, usa `getDefaultConfig()`
- **Cache**: TTL 60 secondi per evitare troppe letture Firestore

**Pagine**:
- `app/neurocredits/page.tsx`: Dashboard NeuroCredits utente (stats + leaderboard)
- `app/area-riservata/admin/neurocredits/page.tsx`: Admin panel config (draft/publish)

**API**:
- `app/api/neurocredits/me/route.ts`: GET stats utente corrente
- `app/api/neurocredits/events/route.ts`: GET eventi utente
- `app/api/leaderboard/route.ts`: GET leaderboard (all-time/monthly)
- `app/api/admin/neurocredits/config/route.ts`: GET config (active + draft)
- `app/api/admin/neurocredits/config/draft/route.ts`: POST (clona active) / PUT (salva draft)
- `app/api/admin/neurocredits/config/publish/route.ts`: POST (pubblica draft)
- `app/api/admin/neurocredits/users/[uid]/adjust/route.ts`: POST (ADMIN_ADJUST)

**Leaderboard**: 
- Periodi: `all-time`, `monthly-YYYY-MM`
- Collections: `leaderboards/{periodId}/entries/{uid}`

### 5.3 Admin Panel

**Layout**: `app/admin/layout.tsx` (sidebar navigation)

**Aree Admin**:
- **NeuroCredits Config**: `app/area-riservata/admin/neurocredits/page.tsx`
  - Tabs: Rules, Levels, Objectives, Rewards, Publish
  - Draft editing: modifica bozza, salva, pubblica
  - Versioning: ogni publish crea nuova versione
- **Users**: `app/admin/users/page.tsx`
- **Courses**: `app/admin/courses/page.tsx`
- **Live Events**: `app/admin/live-events/page.tsx`
- **Newsletter**: `app/admin/newsletter/page.tsx`

**Accesso**: Tutte le route admin richiedono `requireAdmin()` (verifica `isAdmin` in Firestore)

### 5.4 Profilo Pubblico

**Pagine**:
- `app/u/[uid]/page.tsx`: Profilo pubblico utente
- `app/members/[userId]/page.tsx`: Profilo membro (TODO: verificare differenza con `/u/[uid]`)

**Dati mostrati**: Nickname, avatar, livello NeuroCredits, stats, post pubblici

### 5.5 Academy (Corsi)

**Pagine**:
- `app/academy/page.tsx`: Lista corsi pubblici
- `app/academy/[slug]/page.tsx`: Dettaglio corso
- `app/area-riservata/corsi/page.tsx`: Corsi utente
- `app/area-riservata/corsi/[courseId]/page.tsx`: Dettaglio corso utente

**API**:
- `app/api/courses/route.ts`: GET lista corsi
- `app/api/courses/[slug]/route.ts`: GET singolo corso
- `app/api/admin/courses/route.ts`: POST/PUT/DELETE (admin)
- `app/api/progress/courses/[courseId]/lessons/[lessonId]/complete/route.ts`: POST completamento lezione

**Repository**: `lib/repositories/academy/` (courses.ts, lessons.ts, modules.ts, progress.ts)

### 5.6 Live Streaming

**Pagine**:
- `app/live/page.tsx`: Lista eventi live
- `app/live/[slug]/page.tsx`: Player evento live
- `app/area-riservata/live/page.tsx`: Eventi utente

**Componenti**:
- `components/live/LivePlayer.tsx`: Player IVS
- `components/live/LiveChat.tsx`: Chat live

**API**:
- `app/api/live-events/route.ts`: GET lista eventi
- `app/api/live-events/[slug]/route.ts`: GET dettaglio evento
- `app/api/admin/live-events/route.ts`: POST/PUT/DELETE (admin)

**Servizio**: Amazon IVS (Interactive Video Service) per streaming

---

## 6. NeuroCredits: Data Model & Firestore Collections

### Collections Principali

#### `users/{uid}`
- **Campi NeuroCredits**:
  - `pointsTotal`: number (totale punti all-time)
  - `pointsMonthly`: number (punti mese corrente)
  - `streakDays`: number (giorni consecutivi attivi)
  - `lastActiveDate`: string (YYYY-MM-DD)
  - `level`: number (livello calcolato da `pointsTotal`)
- **Altri campi**: email, nickname, avatarUrl, isAdmin, subscriptionStatus, ecc.

#### `neurocredit_events/{eventId}`
- **Campi**:
  - `type`: NeuroCreditEventType
  - `targetUid`: string
  - `actorUid`: string
  - `deltaNeuroCredits`: number
  - `applied`: boolean
  - `appliedAt`: Timestamp
  - `configVersionId`: string (versione config usata)
  - `ref`: object (postId, commentId, videoId, date, reason)
- **Idempotency**: `eventId` deterministico, se esiste già → `applied: false`

#### `dailyCaps/{uid}/{date}`
- **Formato date**: `YYYY-MM-DD`
- **Campi**:
  - `POST_CREATED`: number (conteggio oggi)
  - `COMMENT_CREATED`: number
  - `LIKE_RECEIVED`: number
  - `VIDEO_COMPLETED`: number
- **Uso**: Verifica `dailyCap` per tipo evento prima di assegnare punti

#### `leaderboards/{periodId}/entries/{uid}`
- **Periodi**: `all-time`, `monthly-YYYY-MM`
- **Campi**:
  - `uid`: string
  - `points`: number
  - `rank`: number (calcolato, non persistito)
  - `updatedAt`: Timestamp

#### `neurocredits_config/meta`
- **Campi**:
  - `activeVersionId`: string (ID versione attiva)

#### `neurocredits_config_versions/{versionId}`
- **Campi**:
  - `status`: "draft" | "published"
  - `createdAt`: Timestamp
  - `createdByUid`: string
  - `notes`: string (opzionale)
  - `rules`: object (mappa eventType → {points, enabled, dailyCap})
  - `levels`: array (soglie livelli)
  - `objectives`: array (obiettivi)
  - `rewards`: array (premi)

---

## 7. Flussi End-to-End

### 7.1 Post/Comment → applyEvent → Aggiornamenti

```
1. Utente crea post → POST /api/posts
2. API route chiama applyEvent({ type: "POST_CREATED", ... })
3. applyEvent():
   a. Genera eventId deterministico
   b. Transazione Firestore:
      - Legge: eventRef, userRef, leaderboardRefs, capRef (TUTTE le letture)
      - Se eventId già esiste → return { applied: false }
      - Calcola delta (rispetta dailyCap)
      - Scrive: eventRef, userRef (update pointsTotal), leaderboardRefs, capRef
   c. Ritorna { applied: true, neuroCreditsAwarded: number }
4. API route ritorna 200 con punti assegnati
```

**File coinvolti**:
- `app/api/posts/route.ts` (POST)
- `app/api/posts/[postId]/comments/route.ts` (POST)
- `lib/neurocredits.ts` (applyEvent)

### 7.2 /neurocredits Page → API → UI

```
1. Utente naviga a /neurocredits
2. Page component (client-side):
   a. useEffect → fetch `/api/neurocredits/me` (con Authorization header)
   b. useEffect → fetch `/api/leaderboard?period=all-time&period=monthly-YYYY-MM`
3. API routes:
   - `/api/neurocredits/me`: Legge `users/{uid}` da Firestore, ritorna stats
   - `/api/leaderboard`: Legge `leaderboards/{periodId}/entries`, ordina per points, calcola rank
4. UI mostra: punti totali, mese, livello, leaderboard, grafici
```

**File coinvolti**:
- `app/neurocredits/page.tsx`
- `app/api/neurocredits/me/route.ts`
- `app/api/leaderboard/route.ts`

### 7.3 Admin Draft → Save → Publish

```
1. Admin naviga a /area-riservata/admin/neurocredits
2. Se non esiste draft:
   - Clicca "Crea Bozza" → POST /api/admin/neurocredits/config/draft
   - Clona active config (o default) → crea nuovo documento in neurocredits_config_versions
3. Admin modifica draft (rules, levels, objectives, rewards)
4. Clicca "Salva Bozza" → PUT /api/admin/neurocredits/config/draft
   - Aggiorna documento draft in Firestore
5. Clicca "Pubblica Bozza" → POST /api/admin/neurocredits/config/publish
   - Aggiorna draft.status = "published"
   - Aggiorna neurocredits_config/meta.activeVersionId = versionId
6. Prossimi eventi usano nuova config (con cache 60s)
```

**File coinvolti**:
- `app/area-riservata/admin/neurocredits/page.tsx`
- `app/api/admin/neurocredits/config/draft/route.ts`
- `app/api/admin/neurocredits/config/publish/route.ts`
- `lib/neurocredits-config.ts`

### 7.4 Password Reset Flow

```
1. Utente clicca "Password dimenticata?" in /auth/login
2. Naviga a /auth/forgot-password
3. Page component:
   a. useEffect → pre-inizializza Firebase (initializeFirebase())
   b. Utente inserisce email e clicca "Invia"
4. handleSubmit():
   a. Retry logic: getAuthWithRetry() (max 3 tentativi, 500ms delay)
   b. Se auth disponibile → sendPasswordResetEmail(auth, email)
   c. Se successo → mostra "Email Inviata!"
   d. Se errore → mostra messaggio (user-not-found, invalid-email, too-many-requests)
5. Firebase invia email con link reset
```

**File coinvolti**:
- `app/auth/forgot-password/page.tsx`
- `lib/firebase-client.ts` (initializeFirebase, getFirebaseAuth)

**Fix applicato**: Race condition risolta con pre-inizializzazione + retry logic

---

## 8. Convenzioni Operative per lo Sviluppo

### 8.1 Regola "Snapshot su Git Prima dei Fix"

**OBBLIGATORIO**: Prima di qualsiasi fix o refactor, creare snapshot su branch WIP.

**Comandi standard**:
```bash
git status
git branch --show-current
git checkout -b wip/<descrizione-breve>-<YYYYMMDD-HHMM>
git add -A
git commit -m "wip: snapshot before <task>"
git push -u origin wip/<descrizione-breve>-<YYYYMMDD-HHMM>
```

**Branch naming**:
- `wip/` prefix per work-in-progress
- `fix/` prefix per bug fix
- `feat/` prefix per nuove feature
- `docs/` prefix per documentazione

### 8.2 Commit Message

**Formato**: `<tipo>: <descrizione breve>`

**Tipi**:
- `fix:` - Bug fix
- `feat:` - Nuova feature
- `refactor:` - Refactoring codice
- `chore:` - Task di manutenzione
- `docs:` - Documentazione
- `test:` - Test
- `style:` - Formattazione

**Esempi**:
- `fix: robust password reset (firebase init + retry)`
- `feat: admin neurocredits manage levels objectives rewards`
- `docs: add GPT knowledge system map`

### 8.3 Checklist Pre-Commit

Prima di committare, verificare:

- [ ] `npm run build` PASS (obbligatorio)
- [ ] Linter: nessun errore (`read_lints` tool)
- [ ] Test manuali: funzionalità modificata testata
- [ ] Git status: solo file necessari staged
- [ ] Nessun segreto committato (API keys, token, .env)

### 8.4 Workflow Sviluppo

1. **Creare branch WIP** (snapshot se necessario)
2. **Implementare fix/feature** (modifiche minime, testabili)
3. **Test locale**: `npm run dev` + test manuali
4. **Build**: `npm run build` (DEVE PASSARE)
5. **Commit**: messaggio descrittivo
6. **Push**: `git push -u origin <branch>`
7. **PR** (opzionale): se branch diverso da main

### 8.5 Debugging

**Console Logging**:
- Prefisso `[Modulo]` per identificare origine (es. `[ForgotPassword]`, `[Firebase]`, `[NeuroCredits]`)
- Solo in development: `if (process.env.NODE_ENV === "development")`

**Firestore Rules**:
- File: `firestore.rules`
- Deploy: `firebase deploy --only firestore:rules`

**Firestore Indexes**:
- File: `firestore.indexes.json`
- Deploy: `firebase deploy --only firestore:indexes`

---

## 9. Troubleshooting

### 9.1 Firestore Transaction "all reads before writes"

**Errore**: `Firestore transactions require all reads to be executed before all writes.`

**Causa**: In `applyEvent()`, letture Firestore dopo scritture.

**Fix applicato**: Ristrutturato `applyEvent()` in `lib/neurocredits.ts`:
- Fase 1: Tutte le letture in parallelo (Promise.all)
- Fase 2: Calcoli in memoria
- Fase 3: Tutte le scritture

**File**: `lib/neurocredits.ts` (righe ~50-200)

### 9.2 Lucide React Icone Mancanti

**Errore**: `Export Publish doesn't exist in target module`

**Causa**: Import icona inesistente da `lucide-react`.

**Fix**: Sostituire con icona esistente (es. `Publish` → `Send`).

**Verifica**: `rg -n "from \"lucide-react\""` e controllare che tutte le icone esistano.

### 9.3 Race Condition Firebase Init (forgot-password)

**Errore**: "Servizio non disponibile" quando utente clicca subito dopo load pagina.

**Causa**: `getFirebaseAuth()` ritorna `null` perché Firebase non ancora inizializzato.

**Fix applicato**: 
- `useEffect` pre-inizializza Firebase al mount
- Retry logic in `handleSubmit` (max 3 tentativi, 500ms delay)
- State `isFirebaseReady` per disabilitare bottone

**File**: `app/auth/forgot-password/page.tsx`

### 9.4 Authorization Header Mancante

**Errore**: `[Auth Server] No Authorization header found`

**Causa**: Chiamate API senza `Authorization: Bearer <token>` header.

**Fix**: Aggiungere `getFirebaseIdToken()` e includere header:
```typescript
const token = await getFirebaseIdToken()
const headers = token ? { Authorization: `Bearer ${token}` } : {}
fetch(url, { headers })
```

**File esempio**: `app/neurocredits/page.tsx` (fetchLeaderboard)

### 9.5 Build Errors TypeScript

**Errore**: Errori TypeScript non bloccano build (config: `ignoreBuildErrors: true`).

**Verifica**: `next.config.ts` o `next.config.mjs` per `typescript.ignoreBuildErrors`.

**Fix**: Disattivare in produzione, fixare errori TypeScript.

---

## 10. TODO / Zone da Verificare

### 10.1 Package Manager

**TODO**: Verificare quale package manager è attivo:
```bash
npm config get package-manager
# Oppure verificare quale lockfile è più recente
```

**Nota**: Sia `package-lock.json` che `pnpm-lock.yaml` presenti nel repo.

### 10.2 Route Duplicate

**TODO**: Verificare differenza tra:
- `app/u/[uid]/page.tsx` (profilo pubblico)
- `app/members/[userId]/page.tsx` (profilo membro)

**Comando**: `rg -n "members|/u/" app` per vedere dove vengono usati.

### 10.3 NeuroCredits Config Cache

**TODO**: Verificare se cache 60s è sufficiente o se serve invalidazione manuale:
- File: `lib/neurocredits-config.ts`
- Funzione: `clearNeuroCreditsConfigCache()` (esiste ma non usata)

### 10.4 Firestore Rules Completeness

**TODO**: Verificare che tutte le collections abbiano regole appropriate:
```bash
cat firestore.rules
# Verificare: users, posts, comments, neurocredit_events, leaderboards, dailyCaps, neurocredits_config
```

### 10.5 Environment Variables

**TODO**: Documentare tutte le env vars necessarie:
- `NEXT_PUBLIC_FIREBASE_*` (API_KEY, AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, APP_ID)
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (per IVS recordings)
- `AWS_S3_RECORDINGS_BUCKET`, `AWS_REGION`
- Altre? Verificare con `rg -n "process.env" lib app`

**Comando**: `rg -n "process\.env\." lib app | head -20`

### 10.6 Demo Mode

**TODO**: Verificare quando Demo Mode è attivo e se è documentato:
- File: `lib/env.ts` (isDemoMode)
- File: `context/AuthContext.tsx` (DEMO_USER)

### 10.7 GitHub Actions / CI/CD

**TODO**: Verificare se esiste `.github/workflows/`:
```bash
ls -la .github/workflows/ 2>/dev/null || echo "No workflows found"
```

### 10.8 Test Coverage

**TODO**: Verificare se esistono test:
```bash
find . -name "*.test.ts" -o -name "*.test.tsx" -o -name "*.spec.ts" | head -10
```

---

## Riferimenti File Chiave

### Core Business Logic
- `lib/neurocredits.ts` - Logica NeuroCredits (applyEvent)
- `lib/neurocredits-config.ts` - Config dinamica
- `lib/neurocredits-rules.ts` - Regole hardcoded fallback
- `lib/firebase-client.ts` - Inizializzazione Firebase
- `lib/firebase-admin.ts` - Firebase Admin SDK
- `lib/auth-server.ts` - Helpers auth server-side

### Context & State
- `context/AuthContext.tsx` - Context autenticazione

### API Routes Principali
- `app/api/posts/route.ts` - Post CRUD
- `app/api/neurocredits/me/route.ts` - Stats utente
- `app/api/leaderboard/route.ts` - Leaderboard
- `app/api/admin/neurocredits/config/route.ts` - Config admin

### Pages Principali
- `app/bacheca/page.tsx` - Bacheca pubblica
- `app/neurocredits/page.tsx` - Dashboard NeuroCredits
- `app/area-riservata/admin/neurocredits/page.tsx` - Admin config
- `app/auth/forgot-password/page.tsx` - Reset password

---

**Documento creato il**: 2026-01-03  
**Ultimo aggiornamento**: 2026-01-03  
**Versione**: 1.0
