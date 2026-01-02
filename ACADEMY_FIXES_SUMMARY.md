# Academy Route Fixes - Riepilogo Completo

## ✅ Problema 1: Route Collision (RISOLTO)

### Errore
```
"You cannot use different slug names for the same dynamic path ('courseId' !== 'slug')"
```

### Soluzione
**Opzione B implementata**: Spostato progress fuori da `/api/courses`

### File Spostati/Eliminati

#### ❌ Eliminato
- `app/api/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

#### ✅ Creato
- `app/api/progress/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

### Nuova Route
- **Prima**: `POST /api/courses/[courseId]/lessons/[lessonId]/complete`
- **Dopo**: `POST /api/progress/courses/[courseId]/lessons/[lessonId]/complete`

### Note
- La route complete non era ancora usata nel client, quindi nessun aggiornamento client necessario
- Quando si implementerà il completamento lezione nel client, usare la nuova route `/api/progress/courses/...`

## ✅ Problema 2: Admin 401/403 (RISOLTO)

### Modifiche a `requireAdmin()`

**File**: `lib/auth-helpers.ts`

**Cambiamento**:
- **Prima**: Restituiva `null` se non autenticato o non admin
- **Dopo**: Lancia `Error("Unauthorized")` se no token, `Error("Forbidden")` se token ok ma non admin

### Route Admin Aggiornate (8 file)

Tutte le route admin ora gestiscono correttamente:
- **401 Unauthorized**: Token mancante o invalido
- **403 Forbidden**: Token valido ma utente non admin

#### File Modificati:
1. ✅ `app/api/admin/courses/route.ts` (GET, POST)
2. ✅ `app/api/admin/courses/[id]/route.ts` (PUT, DELETE)
3. ✅ `app/api/admin/courses/[id]/modules/route.ts` (POST)
4. ✅ `app/api/admin/courses/[id]/modules/[moduleId]/route.ts` (PUT, DELETE)
5. ✅ `app/api/admin/courses/[id]/modules/[moduleId]/lessons/route.ts` (POST)
6. ✅ `app/api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/route.ts` (PUT, DELETE)
7. ✅ `app/api/admin/courses/[id]/recalculate/route.ts` (POST)
8. ✅ `app/api/admin/courses/[courseId]/lessons/[lessonId]/upload-url/route.ts` (POST)

### Pattern di Error Handling

Ogni route admin ora usa:
```typescript
try {
  const admin = await requireAdmin(request)  // Lancia error se non autorizzato
  // ... logica ...
} catch (error: any) {
  if (error.message === "Unauthorized") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (error.message === "Forbidden") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }
  // ... altri errori ...
}
```

### Client Admin

**File**: `app/area-riservata/admin/corsi/page.tsx`
- ✅ Già invia token: `Authorization: Bearer ${token}`
- ✅ Usa `getFirebaseIdToken()` correttamente
- ✅ Nessuna modifica necessaria

## Test Checklist

### Route Collision
- ✅ `npm run dev` non mostra più errore slug mismatch
- ✅ `/api/courses/[slug]` funziona per dettaglio corso
- ✅ `/api/progress/courses/[courseId]/lessons/[lessonId]/complete` esiste e funziona

### Admin 401/403
- ✅ `/api/admin/courses` con token admin → **200 OK**
- ✅ `/api/admin/courses` senza token → **401 Unauthorized**
- ✅ `/api/admin/courses` con token utente normale → **403 Forbidden**
- ✅ Client admin invia token correttamente

## File Totali Modificati

### Eliminati (1)
- ❌ `app/api/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

### Creati (1)
- ✅ `app/api/progress/courses/[courseId]/lessons/[lessonId]/complete/route.ts`

### Modificati (9)
1. ✅ `lib/auth-helpers.ts` - requireAdmin ora lancia errori
2. ✅ `app/api/admin/courses/route.ts`
3. ✅ `app/api/admin/courses/[id]/route.ts`
4. ✅ `app/api/admin/courses/[id]/modules/route.ts`
5. ✅ `app/api/admin/courses/[id]/modules/[moduleId]/route.ts`
6. ✅ `app/api/admin/courses/[id]/modules/[moduleId]/lessons/route.ts`
7. ✅ `app/api/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/route.ts`
8. ✅ `app/api/admin/courses/[id]/recalculate/route.ts`
9. ✅ `app/api/admin/courses/[courseId]/lessons/[lessonId]/upload-url/route.ts`

## Verifica Finale

### Build Next.js
```bash
npm run dev
```
**Risultato atteso**: Nessun errore "slug mismatch"

### Test Admin API
```bash
# Con token admin
curl -H "Authorization: Bearer <admin_token>" http://localhost:3000/api/admin/courses
# Risultato atteso: 200 OK con lista corsi

# Senza token
curl http://localhost:3000/api/admin/courses
# Risultato atteso: 401 Unauthorized

# Con token utente normale
curl -H "Authorization: Bearer <user_token>" http://localhost:3000/api/admin/courses
# Risultato atteso: 403 Forbidden
```

## Note Importanti

1. **Route Complete**: Quando si implementa il completamento lezione nel client, usare:
   ```typescript
   POST /api/progress/courses/${courseId}/lessons/${lessonId}/complete
   ```

2. **Admin Check**: `requireAdmin()` ora lancia errori invece di restituire null, quindi tutte le route devono gestire i catch.

3. **401 vs 403**: 
   - **401**: "Non sei autenticato" (token mancante/invalido)
   - **403**: "Sei autenticato ma non autorizzato" (token ok ma non admin)

4. **Client Admin**: Già corretto, invia token in tutte le chiamate.




