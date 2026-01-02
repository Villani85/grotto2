# Academy Route Fixes - Route Collision e Admin 401

## Problema 1: Route Collision (RISOLTO)

### Errore Next.js
```
"You cannot use different slug names for the same dynamic path ('courseId' !== 'slug')"
```

### Causa
Due route dinamiche allo stesso livello sotto `/api/courses`:
- `app/api/courses/[slug]/route.ts` (usa `[slug]`)
- `app/api/courses/[courseId]/lessons/[lessonId]/complete/route.ts` (usa `[courseId]`)

### Soluzione Implementata (Opzione B)
**Spostato progress fuori da `/api/courses`**:
- ✅ Creato: `app/api/progress/courses/[courseId]/lessons/[lessonId]/complete/route.ts`
- ✅ Eliminato: `app/api/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

### File Modificati
- **Nessun file client da aggiornare** (la route complete non era ancora usata nel client)

### Nuova Route
- `POST /api/progress/courses/[courseId]/lessons/[lessonId]/complete`
- Mantiene la stessa logica (NeuroCredits, progress, etc.)
- Non confligge più con `/api/courses/[slug]`

## Problema 2: Admin 401/403 (RISOLTO)

### Modifiche a `requireAdmin()`
**File**: `lib/auth-helpers.ts`

**Prima**:
```typescript
export async function requireAdmin(request: NextRequest): Promise<{ uid: string; email?: string } | null> {
  const user = await verifyIdToken(request)
  if (!user) return null
  const isAdmin = await isUserAdmin(user.uid)
  if (!isAdmin) return null
  return user
}
```

**Dopo**:
```typescript
export async function requireAdmin(request: NextRequest): Promise<{ uid: string; email?: string }> {
  const user = await verifyIdToken(request)
  if (!user) throw new Error("Unauthorized")  // 401
  const isAdmin = await isUserAdmin(user.uid)
  if (!isAdmin) throw new Error("Forbidden")  // 403
  return user
}
```

### Modifiche alle Route Admin
Tutte le route admin ora gestiscono correttamente:
- **401**: Token mancante o invalido (`Unauthorized`)
- **403**: Token valido ma utente non admin (`Forbidden`)

**File aggiornati**:
- `app/api/admin/courses/route.ts` (GET, POST)
- `app/api/admin/courses/[id]/route.ts` (PUT, DELETE)
- `app/api/admin/courses/[id]/modules/route.ts` (POST)
- `app/api/admin/courses/[id]/modules/[moduleId]/route.ts` (PUT, DELETE)
- `app/api/admin/courses/[id]/modules/[moduleId]/lessons/route.ts` (POST)
- `app/api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/route.ts` (PUT, DELETE)
- `app/api/admin/courses/[id]/recalculate/route.ts` (POST)

### Client Admin
**File**: `app/area-riservata/admin/corsi/page.tsx`
- ✅ Già invia token: `Authorization: Bearer ${token}`
- ✅ Usa `getFirebaseIdToken()` correttamente

## Test Checklist

### Route Collision
- ✅ `npm run dev` non mostra più errore slug mismatch
- ✅ `/api/courses/[slug]` funziona per dettaglio corso
- ✅ `/api/progress/courses/[courseId]/lessons/[lessonId]/complete` funziona per completamento

### Admin 401/403
- ✅ `/api/admin/courses` con token admin → 200 OK
- ✅ `/api/admin/courses` senza token → 401 Unauthorized
- ✅ `/api/admin/courses` con token utente normale → 403 Forbidden
- ✅ Client admin invia token correttamente

## File Spostati/Eliminati

### Eliminati
- ❌ `app/api/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

### Creati
- ✅ `app/api/progress/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

### Modificati
- ✅ `lib/auth-helpers.ts` - requireAdmin ora lancia errori invece di restituire null
- ✅ Tutte le route admin (7 file) - gestione corretta 401/403

## Note

- La route `/api/progress/courses/[courseId]/lessons/[lessonId]/complete` usa `courseId` (non slug) perché il progress è legato all'ID del corso, non allo slug pubblico.
- Se in futuro serve completare lezione da slug, si può aggiungere un endpoint wrapper che risolve slug→courseId.
- Le route admin ora distinguono correttamente tra "non autenticato" (401) e "non autorizzato" (403).




