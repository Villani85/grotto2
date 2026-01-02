# Live System Technical Map

## Executive Summary

Il sistema attuale supporta broadcast live tramite AWS IVS per admin (`/admin/live`), con player pubblico su `/live` che legge da `NEXT_PUBLIC_IVS_PLAYBACK_URL`. Le registrazioni IVS vengono salvate automaticamente su S3 e possono essere importate come lezioni. Il sistema di interazione (bacheca/comments) è già presente e può essere riutilizzato per chat live. **Gap principale**: manca un sistema di "eventi live" pubblicabili (CRUD admin + watch page dedicata) e integrazione chat IVS o alternativa.

---

## Current Live/Broadcast Flow

### Admin Broadcast Flow (Step-by-Step)

1. **Admin accede a `/admin/live`** → `app/admin/live/page.tsx`
2. **Autenticazione**: `useAuth()` verifica `user.isAdmin === true` (via `AdminRequired`)
3. **Caricamento Config**: `GET /api/admin/ivs/config` → legge `IVS_INGEST_ENDPOINT` e `IVS_STREAM_KEY` (env server-side)
4. **Caricamento SDK**: `loadBroadcastSdk()` → import npm `amazon-ivs-web-broadcast` (fallback CDN in dev)
5. **Inizializzazione Client**: `IVSBroadcastClient.create()` con preset `STANDARD_LANDSCAPE` (fallback `BASIC_LANDSCAPE`)
6. **Camera/Mic**: `getUserMedia()` → `client.addVideoInputDevice(stream)` + `client.addAudioInputDevice(stream)`
7. **Screen Share** (opzionale): `getDisplayMedia()` → `client.exchangeVideoDeviceContent()` (fallback remove/add)
8. **Start Broadcast**: `client.startBroadcast()` → invia a `ingestEndpoint` con `streamKey`
9. **Metadata Firestore**: `POST /api/admin/ivs/recordings` (action: "start") → crea doc in `ivs_recordings` con status "live"
10. **Stop Broadcast**: `client.stopBroadcast()` → `POST /api/admin/ivs/recordings` (action: "stop") → aggiorna doc a status "completed"

### Public Player Flow

1. **Utente accede a `/live`** → `app/live/page.tsx`
2. **Carica SDK Player**: `<Script src="https://player.live-video.net/1.4.1/amazon-ivs-player.min.js" />`
3. **Inizializza Player**: `window.IVSPlayer.create()` → `player.load(NEXT_PUBLIC_IVS_PLAYBACK_URL)`
4. **Riproduzione**: video element con controlli nativi

### Recordings Flow (S3 → Firestore)

1. **IVS auto-records** → salva su S3 bucket (`AWS_S3_RECORDINGS_BUCKET`) con prefix `ivs/v1/{channelId}/`
2. **Admin lista recordings**: `GET /api/admin/ivs/recordings/list` → `ListObjectsV2Command` su S3, filtra `events/recording-ended.json`
3. **Verifica S3**: `GET /api/admin/ivs/recordings/verify` → `HeadBucketCommand` + `ListObjectsV2Command` per diagnostica
4. **Import recording**: `POST /api/admin/ivs/recordings` (action: "import") → salva metadati in `ivs_recordings` (collection Firestore)

---

## API Routes Map

| Route | File | Methods | Auth | Env | Notes |
|-------|------|---------|------|-----|-------|
| `GET /api/admin/ivs/config` | `app/api/admin/ivs/config/route.ts` | GET | `requireAdmin` | `IVS_INGEST_ENDPOINT`, `IVS_STREAM_KEY` | Restituisce ingest endpoint e stream key (protetto) |
| `POST /api/admin/ivs/recordings` | `app/api/admin/ivs/recordings/route.ts` | POST | `requireAdmin` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_RECORDINGS_BUCKET`, `AWS_REGION` | Salva metadati start/stop/import. Action: "start" \| "stop" \| "import" |
| `GET /api/admin/ivs/recordings/list` | `app/api/admin/ivs/recordings/list/route.ts` | GET | `requireAdmin` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_RECORDINGS_BUCKET`, `AWS_REGION`, `AWS_S3_RECORDINGS_PREFIX` | Lista recordings da S3 (paginated, max 100) |
| `GET /api/admin/ivs/recordings/verify` | `app/api/admin/ivs/recordings/verify/route.ts` | GET | `requireAdmin` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_RECORDINGS_BUCKET`, `AWS_REGION` | Diagnostica S3 (HeadBucket + ListObjects) |
| `GET /api/posts` | `app/api/posts/route.ts` | GET, POST | `requireAuth` (POST) | - | Lista post bacheca (paginated). POST crea post + NeuroCredits |
| `GET /api/posts/[postId]/comments` | `app/api/posts/[postId]/comments/route.ts` | GET, POST | `requireAuth` (POST) | - | Commenti su post (subcollection `posts/{postId}/comments`) |
| `POST /api/posts/[postId]/like` | `app/api/posts/[postId]/like/route.ts` | POST | `requireAuth` | - | Like/unlike post (subcollection `posts/{postId}/likes/{uid}`) |
| `GET /api/comments` | `app/api/comments/route.ts` | GET, POST | - | - | **NOT FOUND** - Mock implementation, non usato in produzione |
| `GET /api/leaderboard` | `app/api/leaderboard/route.ts` | GET | `verifyIdToken` (opzionale) | - | Leaderboard NeuroCredits (all_time/monthly, metric: neuroCredits/videosCompleted/activeDays) |
| `GET /api/neurocredits/events` | `app/api/neurocredits/events/route.ts` | GET | `requireAuth` | - | Debug: ultimi eventi NeuroCredits utente |
| `GET /api/neurocredits/me` | `app/api/neurocredits/me/route.ts` | GET | `requireAuth` | - | Statistiche NeuroCredits utente corrente |

---

## UI Pages Map

| Page | File | Client/Server | Data Sources (fetch) | Notes |
|------|------|---------------|---------------------|-------|
| `/admin/live` | `app/admin/live/page.tsx` | Client | `GET /api/admin/ivs/config`, `GET /api/admin/ivs/recordings/list`, `GET /api/admin/ivs/recordings/verify`, `POST /api/admin/ivs/recordings` | Broadcast studio IVS. Usa `AdminRequired`, `DemoModeBanner`. SDK: `amazon-ivs-web-broadcast` (npm) |
| `/live` | `app/live/page.tsx` | Client | - | Player pubblico. Legge `NEXT_PUBLIC_IVS_PLAYBACK_URL` (env client-side). SDK: CDN `player.live-video.net` |
| `/area-riservata/live` | `app/area-riservata/live/page.tsx` | Client | - | **NOT FOUND** - Mock UI con eventi hardcoded, non collegato a Firestore/API |
| `/bacheca` | `app/bacheca/page.tsx` | Client | `GET /api/posts` | Bacheca community. Usa `SubscriptionRequired`. Componenti: `PostComposerMagnetic`, `PostCard`, `BachecaSidebar` |
| `/bacheca/[postId]` | `app/bacheca/[postId]/page.tsx` | Client | `GET /api/posts/[postId]`, `GET /api/posts/[postId]/comments` | Dettaglio post con commenti |
| `/neurocredits` | `app/neurocredits/page.tsx` | Client | `GET /api/neurocredits/me`, `GET /api/leaderboard` | Dashboard NeuroCredits utente + leaderboard |

---

## Auth & Roles

### Admin Check Flow

1. **Client-side**: `context/AuthContext.tsx` → `fetchUserProfile()` legge da Firestore `users/{uid}` → campo `isAdmin: boolean`
2. **Server-side**: `lib/auth-helpers.ts` → `requireAdmin(request)`:
   - `verifyIdToken(request)` → verifica Firebase ID token da header `Authorization: Bearer <token>`
   - `isUserAdmin(uid)` → legge da Firestore `users/{uid}.isAdmin` (Admin SDK)
3. **Component Guard**: `components/AdminRequired.tsx` → wrapper che reindirizza se `!user.isAdmin`

### Token Flow

- **Client → API**: `lib/api-helpers.ts` → `getFirebaseIdToken()` → `firebase/auth.getIdToken()` → header `Authorization: Bearer <token>`
- **API → Firestore**: `lib/auth-helpers.ts` → `requireAdmin()` → Firebase Admin SDK verifica token → lettura `users/{uid}.isAdmin`

### Auto-Admin

- Primo utente registrato → `isAdmin: true` automatico
- Email in `ADMIN_EMAILS` array (`context/AuthContext.tsx:340-344`) → `isAdmin: true` automatico

---

## Firestore Data Map

### Collections Identificate

| Collection | Path | Fields Principali | Where Used |
|------------|------|-------------------|------------|
| `users` | `users/{uid}` | `email`, `nickname`, `avatarUrl`, `pointsTotal`, `subscriptionStatus`, `isAdmin`, `neuroCredits_total`, `neuroCredits_monthly`, `videosCompleted_total`, `videosCompleted_monthly`, `activeDays_total`, `activeDays_monthly` | Auth, Admin check, Leaderboard, NeuroCredits |
| `posts` | `posts/{postId}` | `authorId`, `authorName`, `authorAvatarUrl`, `text`, `createdAt`, `likesCount`, `commentsCount` | Bacheca (`/api/posts`) |
| `posts/{postId}/likes` | `posts/{postId}/likes/{likerUid}` | `createdAt` | Like system (`/api/posts/[postId]/like`) |
| `posts/{postId}/comments` | `posts/{postId}/comments/{commentId}` | `authorId`, `authorName`, `authorAvatarUrl`, `text`, `createdAt` | Commenti (`/api/posts/[postId]/comments`) |
| `ivs_recordings` | `ivs_recordings/{recordingId}` | `streamKey`, `startedBy`, `startedAt`, `stoppedBy`, `stoppedAt`, `status` ("live" \| "completed"), `title`, `s3EndedKey`, `s3Prefix`, `importedBy`, `endedAt` | Recordings metadata (`/api/admin/ivs/recordings`) |
| `neurocredit_events` | `neurocredit_events/{eventId}` | `type`, `targetUid`, `actorUid`, `periodId`, `deltaNeuroCredits`, `deltaVideosCompleted`, `deltaActiveDays`, `ref`, `createdAt` | NeuroCredits tracking (`/api/neurocredits/events`) |
| `leaderboards` | `leaderboards/{periodId}/entries/{uid}` | `displayName`, `avatarUrl`, `neuroCredits`, `videosCompleted`, `activeDays` | Leaderboard (`/api/leaderboard`) |

### Repository Pattern

- **Location**: `lib/repositories/**/*.ts`
- **Pattern**: Classi statiche con metodi `getAll()`, `create()`, `update()`, `delete()`
- **Collections mappate**: `academy/courses.ts`, `academy/categories.ts`, `academy/lessons.ts`, `academy/modules.ts`, `academy/progress.ts`, `posts.ts`, `points.ts`, `users.ts`, `admin-settings.ts`, `newsletter.ts`, `messages.ts`

### NeuroCredits System

- **Events**: `lib/neurocredits.ts` → `applyEvent()` → crea doc in `neurocredit_events` + aggiorna `users/{uid}` (incrementa `neuroCredits_total`, `neuroCredits_monthly[periodId]`)
- **Types**: `POST_CREATED` (+2), `COMMENT_CREATED` (+1), `VIDEO_COMPLETED` (+5), `DAILY_ACTIVE` (+1), ecc.
- **Idempotency**: `eventId` basato su `type + targetUid + periodId + ref` per evitare duplicati
- **Leaderboard**: Aggiornato via `lib/neurocredits.ts` → `updateLeaderboard()` → scrive in `leaderboards/{periodId}/entries/{uid}`

---

## IVS & Recordings Map

### Environment Variables

| Variable | Type | Where Used | Notes |
|----------|------|------------|-------|
| `IVS_INGEST_ENDPOINT` | Server | `app/api/admin/ivs/config/route.ts` | RTMPS endpoint (es. `rtmps://xxx.ivs.amazonaws.com/app/`) |
| `IVS_STREAM_KEY` | Server | `app/api/admin/ivs/config/route.ts` | Stream key (protetto, admin only) |
| `NEXT_PUBLIC_IVS_PLAYBACK_URL` | Client | `app/live/page.tsx` | HLS playback URL (es. `https://xxx.playback.live-video.net/xxx.m3u8`) |
| `AWS_ACCESS_KEY_ID` | Server | `app/api/admin/ivs/recordings/**/*.ts` | Credenziali S3 per recordings |
| `AWS_SECRET_ACCESS_KEY` | Server | `app/api/admin/ivs/recordings/**/*.ts` | Credenziali S3 per recordings |
| `AWS_REGION` | Server | `app/api/admin/ivs/recordings/**/*.ts` | Default: `eu-central-1` |
| `AWS_S3_RECORDINGS_BUCKET` | Server | `app/api/admin/ivs/recordings/**/*.ts` | Default: `v0-membership-recordings-tuonome2` |
| `AWS_S3_RECORDINGS_PREFIX` | Server | `app/api/admin/ivs/recordings/list/route.ts` | Default: `ivs/v1/` |

### IVS Assumptions

- **Single Channel**: Un solo canale IVS attivo (un solo `IVS_INGEST_ENDPOINT` + `IVS_STREAM_KEY`)
- **Single Playback URL**: Un solo `NEXT_PUBLIC_IVS_PLAYBACK_URL` per player pubblico
- **Auto-Recording**: IVS configurato per salvare automaticamente su S3 (non gestito nel codice)
- **S3 Path Structure**: `ivs/v1/{channelId}/events/recording-ended.json` + `ivs/v1/{channelId}/media/hls/master.m3u8`

### SDK Loading

- **Broadcast SDK**: `lib/ivs/loadBroadcastSdk.ts` → `import("amazon-ivs-web-broadcast")` (npm) → fallback CDN in dev
- **Player SDK**: CDN `https://player.live-video.net/1.4.1/amazon-ivs-player.min.js` (pubblico)

---

## Existing Interaction Systems

### Bacheca (Posts + Comments)

- **Location**: `/bacheca`, `/api/posts`, `/api/posts/[postId]/comments`
- **Firestore**: `posts/{postId}`, `posts/{postId}/comments/{commentId}`, `posts/{postId}/likes/{uid}`
- **Features**: Create post, comment, like, pagination, real-time updates (client-side Firestore listeners)
- **Auth**: `requireAuth` per POST, lettura pubblica (autenticati)
- **NeuroCredits**: `POST_CREATED` (+2), `COMMENT_CREATED` (+1)

### Riusabilità per Live Chat

- **Pattern riusabile**: Subcollection pattern (`posts/{postId}/comments`) → può diventare `live_events/{eventId}/chat/{messageId}`
- **Real-time**: Client-side Firestore listeners già usati in bacheca → riusabile per chat live
- **Rate limiting**: `lib/validations.ts` → `checkRateLimit()` già implementato per comments
- **Moderation**: Admin può eliminare commenti → riusabile per moderazione chat

### IVS Chat Integration (Not Implemented)

- **IVS Chat SDK**: Non trovato nel codice
- **Alternative**: Usare Firestore real-time per chat durante live (subcollection `live_events/{eventId}/chat`)

---

## Gaps to Implement Live Events Publishing + Watch Page + Interaction

### P0 - Critical (Must Have)

1. **Live Events CRUD API**
   - **File da creare**: `app/api/admin/live-events/route.ts` (GET lista, POST crea)
   - **File da creare**: `app/api/admin/live-events/[id]/route.ts` (GET, PATCH, DELETE)
   - **Firestore**: Collection `live_events/{eventId}` con campi: `title`, `description`, `scheduledAt`, `startedAt`, `endedAt`, `status` ("scheduled" \| "live" \| "completed" \| "cancelled"), `playbackUrl`, `streamKey`, `createdBy`, `published` (boolean)
   - **Auth**: `requireAdmin` per tutte le operazioni
   - **Hook point**: Integrare con `POST /api/admin/ivs/recordings` (action: "start") per aggiornare `live_events/{id}.status = "live"`

2. **Admin Live Events Management Page**
   - **File da creare**: `app/admin/live-events/page.tsx` (lista eventi)
   - **File da creare**: `app/admin/live-events/new/page.tsx` (crea evento)
   - **File da creare**: `app/admin/live-events/[id]/page.tsx` (edit evento)
   - **Data sources**: `GET /api/admin/live-events`, `POST /api/admin/live-events`, `PATCH /api/admin/live-events/[id]`
   - **Features**: CRUD eventi, scheduling, publish/unpublish, link a `/admin/live` per broadcast

3. **Public Watch Page**
   - **File da creare**: `app/live/[eventId]/page.tsx` (o modificare `/live` per supportare eventId)
   - **Data sources**: `GET /api/live-events/[eventId]` (pubblico, solo eventi `published: true`)
   - **Features**: Player IVS con `playbackUrl` da evento, info evento (title, description, scheduledAt), chat live (opzionale)

### P1 - Important (Should Have)

4. **Live Events Public API**
   - **File da creare**: `app/api/live-events/route.ts` (GET lista pubblici, filtro `published: true`, `status: "live"` o `scheduled`)
   - **File da creare**: `app/api/live-events/[id]/route.ts` (GET dettaglio pubblico)
   - **Auth**: Nessuna (pubblico) o `verifyIdToken` opzionale per subscriber-only events

5. **Live Chat Integration**
   - **File da creare**: `app/api/live-events/[eventId]/chat/route.ts` (GET lista, POST messaggio)
   - **Firestore**: Subcollection `live_events/{eventId}/chat/{messageId}` con campi: `authorId`, `authorName`, `authorAvatarUrl`, `text`, `createdAt`
   - **Real-time**: Client-side Firestore listeners (riusare pattern bacheca)
   - **Rate limiting**: Riusare `checkRateLimit()` da `lib/validations.ts`
   - **Moderation**: Admin può eliminare messaggi (riusare pattern comments)

6. **Auto-Status Updates**
   - **Hook point**: `app/api/admin/ivs/recordings/route.ts` (action: "start") → aggiorna `live_events/{id}.status = "live"` se `streamKey` match
   - **Hook point**: `app/api/admin/ivs/recordings/route.ts` (action: "stop") → aggiorna `live_events/{id}.status = "completed"`, `endedAt = now()`
   - **File da modificare**: `app/api/admin/ivs/recordings/route.ts` → aggiungere logica per match `streamKey` con `live_events` document

### P2 - Nice to Have (Future)

7. **Notifications/Reminders**
   - **File da creare**: `app/api/cron/live-events-reminders/route.ts` (cron job per notifiche pre-evento)
   - **Integration**: Newsletter system (`lib/repositories/newsletter.ts`) o push notifications

8. **Analytics/Viewer Count**
   - **Firestore**: Campo `live_events/{id}.viewerCount` (aggiornato via real-time listeners)
   - **File da creare**: `app/api/live-events/[eventId]/viewer-count/route.ts` (increment/decrement)

9. **Recording Association**
   - **Hook point**: `app/api/admin/ivs/recordings/route.ts` (action: "import") → opzione per associare recording a `live_events/{id}`
   - **Firestore**: Campo `live_events/{id}.recordingId` (reference a `ivs_recordings/{id}`)

10. **IVS Chat SDK Integration** (se disponibile)
    - **Research**: Verificare se IVS offre chat SDK nativo
    - **Alternative**: Mantenere Firestore chat se IVS chat non disponibile o troppo costoso

---

## Questions to Confirm

1. **Multi-channel support**: Il sistema deve supportare più canali IVS simultanei (eventi live paralleli) o un solo canale attivo alla volta?
2. **Event scheduling**: Gli eventi devono essere schedulabili con date/ora future, o solo "live now"?
3. **Subscriber-only events**: Alcuni eventi devono essere visibili solo a utenti con subscription attiva?
4. **Chat moderation**: Serve moderazione chat in tempo reale (admin può eliminare messaggi durante live) o solo post-live?
5. **Recording playback**: Le registrazioni devono essere riproducibili direttamente dalla watch page o solo come lezioni Academy?
6. **IVS Chat vs Firestore Chat**: Preferisci chat IVS nativa (se disponibile) o chat Firestore real-time (già implementato per bacheca)?
7. **Viewer count privacy**: Il conteggio spettatori deve essere pubblico o solo admin?
8. **Event notifications**: Serve sistema di notifiche (email/push) per eventi in arrivo o solo promemoria manuali?

---

## File References

### API Routes
- `app/api/admin/ivs/config/route.ts`
- `app/api/admin/ivs/recordings/route.ts`
- `app/api/admin/ivs/recordings/list/route.ts`
- `app/api/admin/ivs/recordings/verify/route.ts`
- `app/api/posts/route.ts`
- `app/api/posts/[postId]/comments/route.ts`
- `app/api/posts/[postId]/like/route.ts`
- `app/api/leaderboard/route.ts`
- `app/api/neurocredits/events/route.ts`

### UI Pages
- `app/admin/live/page.tsx`
- `app/live/page.tsx`
- `app/area-riservata/live/page.tsx` (mock, non usato)
- `app/bacheca/page.tsx`
- `app/bacheca/[postId]/page.tsx`
- `app/neurocredits/page.tsx`

### Auth & Helpers
- `lib/auth-helpers.ts` (server-side: `requireAdmin`, `verifyIdToken`, `isUserAdmin`)
- `lib/auth-server.ts` (server-side: `requireAuth`, `verifyIdToken`)
- `lib/api-helpers.ts` (client-side: `getFirebaseIdToken`, `authenticatedFetch`)
- `context/AuthContext.tsx` (client-side: `useAuth`, `fetchUserProfile`)
- `components/AdminRequired.tsx` (client-side guard)

### Repositories
- `lib/repositories/posts.ts`
- `lib/repositories/users.ts`
- `lib/repositories/points.ts`
- `lib/neurocredits.ts` (event system)

### IVS SDK
- `lib/ivs/loadBroadcastSdk.ts` (broadcast SDK loader)

### Firestore Rules
- `firestore.rules` (security rules per collections)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: AI Code Assistant (Cursor)


