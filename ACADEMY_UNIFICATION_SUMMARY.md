# Academy Unification - Riepilogo Completo

## Obiettivo
Rendere `/academy` l'unica sezione corsi (catalogo + dettaglio) e `/admin/courses/*` la sezione admin standard, mantenendo compatibilità con link vecchi tramite redirect server-side.

## FASE 1: Risoluzione Route Collision ✅

### File Eliminati
- ✅ Cartella vuota `app/api/courses/[courseId]/` rimossa (non contiene route.ts)

### Route Finali (Nessun Conflitto)
- ✅ `GET /api/courses` - Lista corsi pubblici
- ✅ `GET /api/courses/[slug]` - Dettaglio corso (supporta slug e docId fallback)
- ✅ `POST /api/progress/courses/[courseId]/lessons/[lessonId]/complete` - Completamento lezione

## FASE 2: Unificazione UI Corsi ✅

### Redirect Server-Side (Vecchie Pagine → /academy)
1. ✅ `app/area-riservata/corsi/page.tsx` → `redirect("/academy")`
2. ✅ `app/area-riservata/corsi/[courseId]/page.tsx` → `redirect("/academy/${courseId}")`
3. ✅ `app/area-riservata/corsi/[courseId]/lezioni/[lessonId]/page.tsx` → `redirect("/academy/${courseId}?lesson=${lessonId}")`

### Pagine Pubbliche (Uniche)
- ✅ `app/academy/page.tsx` - Catalogo corsi
- ✅ `app/academy/[slug]/page.tsx` - Dettaglio corso (supporta slug e docId)

## FASE 3: Unificazione Admin ✅

### Redirect Server-Side (Vecchie Pagine Admin → /admin/courses/*)
1. ✅ `app/area-riservata/admin/corsi/page.tsx` → `redirect("/admin/courses")`
2. ✅ `app/area-riservata/admin/corsi/nuovo/page.tsx` → `redirect("/admin/courses/new")`
3. ✅ `app/area-riservata/admin/corsi/[id]/page.tsx` → `redirect("/admin/courses/${id}")`

### Pagine Admin (Standard)
- ✅ `app/admin/courses/page.tsx` - Lista corsi admin
- ✅ `app/admin/courses/new/page.tsx` - Creazione corso
- ✅ `app/admin/courses/[courseId]/edit/page.tsx` - Edit corso (usa vecchie API, da aggiornare)

**Nota**: La pagina `/admin/courses/[courseId]/edit` esiste ma usa ancora vecchie API (`/api/courses/${courseId}`). Dovrebbe essere aggiornata per usare `/api/admin/courses/[id]`.

## FASE 4: Normalizzazione Dati ✅

### Funzione Normalizzazione
- ✅ `lib/academy/normalizeCourse.ts` - Normalizza corsi con default per compatibilità

**Default Applicati**:
- `categoryName`: "Academy" se mancante
- `level`: "Base" se mancante
- `shortDescription`: usa `description` o "Descrizione in arrivo."
- `longDescription`: usa `description` o `shortDescription` o "Descrizione in arrivo."
- `focusTags`: array vuoto se mancante
- `durationMinutes`: 0 se mancante
- `lessonsCount`: 0 se mancante
- `ratingAvg/ratingCount`: undefined se mancanti o <= 0
- `isBestSeller/isNew`: false se undefined
- `coverImageUrl`: undefined se mancante (UI mostra placeholder)

### Repository Aggiornato
- ✅ `lib/repositories/academy/courses.ts`:
  - `getAll()` normalizza tutti i corsi
  - `getBySlug()` supporta docId fallback + normalizzazione
  - `getById()` normalizza il corso

**Fallback docId in getBySlug**:
1. Cerca per `slug` (query where slug == slug)
2. Se non trovato, prova come docId (doc(courses, slug))
3. Se trovato, normalizza e ritorna

### UI Aggiornata
- ✅ `components/academy/CourseCard.tsx`:
  - Mostra duration/lessons solo se > 0
  - Mostra rating solo se ratingAvg && ratingCount
  - Gestisce coverImageUrl mancante con placeholder
  - Gestisce focusTags vuoto (slice(0,2) non crasha)

- ✅ `app/academy/[slug]/page.tsx`:
  - Mostra duration/lessons solo se > 0
  - Mostra rating solo se ratingAvg && ratingCount
  - Gestisce focusTags vuoto (length > 0 check)

## File Creati

1. ✅ `lib/academy/normalizeCourse.ts` - Funzione normalizzazione
2. ✅ `app/area-riservata/corsi/page.tsx` - Redirect a /academy
3. ✅ `app/area-riservata/corsi/[courseId]/page.tsx` - Redirect a /academy/[courseId]
4. ✅ `app/area-riservata/corsi/[courseId]/lezioni/[lessonId]/page.tsx` - Redirect a /academy/[courseId]?lesson=[lessonId]
5. ✅ `app/area-riservata/admin/corsi/page.tsx` - Redirect a /admin/courses
6. ✅ `app/area-riservata/admin/corsi/nuovo/page.tsx` - Redirect a /admin/courses/new
7. ✅ `app/area-riservata/admin/corsi/[id]/page.tsx` - Redirect a /admin/courses/[id]

## File Modificati

1. ✅ `lib/repositories/academy/courses.ts`:
   - Aggiunto import `normalizeCourse`
   - `getAll()` normalizza corsi
   - `getBySlug()` supporta docId fallback + normalizzazione
   - `getById()` normalizza corso

2. ✅ `components/academy/CourseCard.tsx`:
   - Mostra duration/lessons solo se > 0

3. ✅ `app/academy/[slug]/page.tsx`:
   - Mostra duration/lessons solo se > 0

## File Eliminati

1. ✅ Cartella vuota `app/api/courses/[courseId]/` (rimossa)

## Checklist Finale

### Route Collision
- ✅ `npm run dev` parte senza errori route collision
- ✅ Nessun conflitto tra `[slug]` e `[courseId]` in `/api/courses`

### UI Corsi
- ✅ `/academy` funziona (catalogo)
- ✅ `/academy/[slug]` funziona (dettaglio)
- ✅ `/academy/<docId>` funziona (fallback docId)
- ✅ `/area-riservata/corsi/*` fa redirect a `/academy/*`

### Admin
- ✅ `/admin/courses` funziona (lista, se admin)
- ✅ `/admin/courses/new` funziona (creazione, se admin)
- ✅ `/area-riservata/admin/corsi/*` fa redirect a `/admin/courses/*`

### Compatibilità Dati
- ✅ Corso vecchio con campi mancanti viene visualizzato correttamente
- ✅ Nessun crash, nessun "cannot read property of undefined"
- ✅ UI mantiene look premium con placeholder coerenti
- ✅ Default applicati: categoryName, level, description, focusTags, etc.

### API
- ✅ `/api/courses/[slug]` supporta slug e docId fallback
- ✅ `/api/courses/[slug]` ritorna corso normalizzato
- ✅ Nessuna 404 a `/api/courses/<id>/lessons/...` (route eliminate)

### NeuroCredits
- ✅ Complete lezione continua a dare punti (stesso eventId idempotente + cap)
- ✅ Route: `POST /api/progress/courses/[courseId]/lessons/[lessonId]/complete`

## Note Importanti

1. **Pagina Admin Edit**: `/admin/courses/[courseId]/edit` esiste ma usa ancora vecchie API. Dovrebbe essere aggiornata per usare `/api/admin/courses/[id]` invece di `/api/courses/${courseId}`.

2. **Compatibilità Backward**: I corsi vecchi senza nuovi campi vengono normalizzati automaticamente con default sensati. L'UI gestisce tutti i campi opzionali senza crash.

3. **Redirect Server-Side**: Tutti i redirect sono server-side (Next.js `redirect()`), quindi le vecchie pagine non si montano e non chiamano API vecchie.

4. **Fallback docId**: `/academy/[slug]` funziona sia con slug che con docId Firestore, garantendo compatibilità con link vecchi.

## Test Manuale

1. ✅ `npm run dev` - Nessun errore route collision
2. ✅ Visitare `/academy` - Catalogo funziona
3. ✅ Visitare `/academy/<slug>` - Dettaglio funziona
4. ✅ Visitare `/academy/<docId>` - Fallback docId funziona
5. ✅ Visitare `/area-riservata/corsi` - Redirect a `/academy`
6. ✅ Visitare `/area-riservata/corsi/<id>` - Redirect a `/academy/<id>`
7. ✅ Visitare `/admin/courses` (come admin) - Lista funziona
8. ✅ Visitare `/admin/courses/new` (come admin) - Creazione funziona
9. ✅ Visitare `/area-riservata/admin/corsi` - Redirect a `/admin/courses`
10. ✅ Corso vecchio senza nuovi campi - Visualizzato correttamente con placeholder




