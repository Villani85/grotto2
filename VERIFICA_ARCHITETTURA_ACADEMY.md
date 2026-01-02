# REPORT DI VERIFICA - Architettura Academy/Admin

## ✅ File Trovati / ❌ File Mancanti

### ✅ File Trovati
- ✅ `lib/validations-academy.ts` - Schema Zod per course/module/lesson
- ✅ `lib/types-academy.ts` - TypeScript interfaces
- ✅ `app/api/categories/route.ts` - GET /api/categories
- ✅ `app/api/admin/courses/route.ts` - GET/POST /api/admin/courses
- ✅ `app/api/admin/courses/[id]/modules/route.ts` - POST /api/admin/courses/[id]/modules
- ✅ `app/api/admin/courses/[id]/modules/[moduleId]/lessons/route.ts` - POST /api/admin/courses/[id]/modules/[moduleId]/lessons
- ✅ `app/api/admin/courses/[id]/recalculate/route.ts` - POST /api/admin/courses/[id]/recalculate
- ✅ `app/api/courses/route.ts` - GET /api/courses
- ✅ `app/api/courses/[slug]/route.ts` - GET /api/courses/[slug]
- ✅ `app/academy/page.tsx` - Catalogo pubblico
- ✅ `app/academy/[slug]/page.tsx` - Dettaglio corso pubblico
- ✅ `app/admin/courses/page.tsx` - Lista corsi admin
- ✅ `app/admin/courses/new/page.tsx` - Creazione corso legacy
- ✅ `app/admin/courses/[courseId]/edit/page.tsx` - Edit corso legacy
- ✅ `components/AdminRequired.tsx` - Componente protezione admin
- ✅ `components/DemoModeBanner.tsx` - Banner demo mode

### ❌ File Mancanti
- Nessuno (tutti i file richiesti esistono)

---

## Schema Course/Module/Lesson

### courseSchema (lib/validations-academy.ts, righe 3-20)

| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `title` | `string` | ✅ | min 1, max 200 |
| `slug` | `string` | ✅ | min 1, regex `/^[a-z0-9-]+$/` |
| `categoryId` | `string` | ✅ | min 1 |
| `level` | `enum` | ✅ | "Base" | "Intermedio" | "Avanzato" |
| `shortDescription` | `string` | ✅ | max 160 |
| `longDescription` | `string` | ✅ | max 2000 |
| `focusTags` | `string[]` | ✅ | max 5 elementi |
| `isBestSeller` | `boolean` | ✅ | |
| `isNew` | `boolean` | ✅ | |
| `ratingAvg` | `number` | ❌ | min 0, max 5, optional |
| `ratingCount` | `number` | ❌ | min 0, optional |
| `durationMinutes` | `number` | ✅ | min 0 |
| `lessonsCount` | `number` | ✅ | min 0 |
| `coverImageUrl` | `string` | ❌ | url().optional().or(z.literal("")) |
| `previewVideoUrl` | `string` | ❌ | url().optional().or(z.literal("")) |
| `published` | `boolean` | ✅ | |

**Nota**: `coverImageUrl` e `previewVideoUrl` accettano stringa vuota `""` oltre a URL valida.

### moduleSchema (lib/validations-academy.ts, righe 22-25)

| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `title` | `string` | ✅ | min 1 |
| `order` | `number` | ✅ | min 0 |

### lessonSchema (lib/validations-academy.ts, righe 27-35)

| Campo | Tipo | Obbligatorio | Note |
|-------|------|--------------|------|
| `title` | `string` | ✅ | min 1 |
| `type` | `enum` | ✅ | "video" | "testo" | "quiz" | "risorsa" |
| `durationMinutes` | `number` | ✅ | min 0 |
| `content` | `string` | ❌ | optional |
| `videoUrl` | `string` | ❌ | url().optional().or(z.literal("")) |
| `isFreePreview` | `boolean` | ✅ | |
| `order` | `number` | ✅ | min 0 |

**Nota**: `type` usa "risorsa" (non "resource" come nel type TypeScript).

---

## Struttura Firestore

### Path Verificati (app/api/courses/[slug]/route.ts, righe 20-30)

1. **Corso**: `courses/{courseId}`
   - Letto da `CoursesRepository.getBySlug(slug, true)`

2. **Moduli**: `courses/{courseId}/modules/{moduleId}`
   - Letto da `ModulesRepository.getByCourseId(course.id)`
   - Path confermato: `db.collection("courses").doc(courseId).collection("modules")` (lib/repositories/academy/modules.ts, riga 19-22)

3. **Lezioni**: `courses/{courseId}/modules/{moduleId}/lessons/{lessonId}`
   - Letto da `LessonsRepository.getByModuleId(course.id, module.id)`
   - Path confermato: `db.collection("courses").doc(courseId).collection("modules").doc(moduleId).collection("lessons")` (lib/repositories/academy/lessons.ts, riga 19-24)

---

## Endpoint Admin

### GET /api/admin/courses
- **Metodo**: GET
- **Auth**: requireAdmin (401/403)
- **Body**: nessuno
- **Response**: `{ courses: Course[] }` (riga 12: `return NextResponse.json({ courses })`)
- **Prova**: app/api/admin/courses/route.ts, riga 12

### POST /api/admin/courses
- **Metodo**: POST
- **Auth**: requireAdmin (401/403)
- **Body**: courseSchema (validato con Zod)
- **Response**: `{ id: string }` (status 201) (riga 52)
- **Prova**: app/api/admin/courses/route.ts, riga 52

### POST /api/admin/courses/[id]/modules
- **Metodo**: POST
- **Auth**: requireAdmin (401/403)
- **Body**: moduleSchema (validato con Zod)
- **Response**: `{ id: string }` (status 201) (riga 27)
- **Prova**: app/api/admin/courses/[id]/modules/route.ts, riga 27

### POST /api/admin/courses/[id]/modules/[moduleId]/lessons
- **Metodo**: POST
- **Auth**: requireAdmin (401/403)
- **Body**: lessonSchema (validato con Zod)
- **Response**: `{ id: string }` (status 201) (riga 27)
- **Prova**: app/api/admin/courses/[id]/modules/[moduleId]/lessons/route.ts, riga 27

### POST /api/admin/courses/[id]/recalculate
- **Metodo**: POST
- **Auth**: requireAdmin (401/403)
- **Body**: nessuno
- **Response**: `{ success: true, durationMinutes: number, lessonsCount: number }` (riga 28-32)
- **Prova**: app/api/admin/courses/[id]/recalculate/route.ts, riga 28-32

### PUT /api/admin/courses/[id]
- **Metodo**: PUT
- **Auth**: requireAdmin (401/403)
- **Body**: courseSchema.partial() (validato con Zod)
- **Response**: `{ success: true }` (riga 47)
- **Prova**: app/api/admin/courses/[id]/route.ts, riga 47

### DELETE /api/admin/courses/[id]
- **Metodo**: DELETE
- **Auth**: requireAdmin (401/403)
- **Body**: nessuno
- **Response**: `{ success: true }` (riga 74)
- **Prova**: app/api/admin/courses/[id]/route.ts, riga 74

### PATCH /api/admin/courses/[id]
- **Metodo**: PATCH
- **Status**: ❌ NON ESISTE
- **Nota**: app/admin/courses/page.tsx (riga 60-64) chiama PATCH per toggle published, ma l'API non lo supporta. Serve aggiungere PATCH.

---

## GET /api/admin/courses Response Shape

### Verifica (app/api/admin/courses/route.ts, riga 12)
```typescript
return NextResponse.json({ courses })
```

**Risultato**: Response è un **oggetto** `{ courses: Course[] }`, NON un array diretto.

### Problema in app/admin/courses/page.tsx (riga 32-35)
```typescript
const data = await response.json()
setCourses(Array.isArray(data) ? data : [])
```

**Problema**: Il codice assume che `data` possa essere un array, ma l'API ritorna `{ courses }`. Questo causa `courses = []` sempre.

**Fix necessario**: `setCourses(data.courses || [])`

---

## Pagina Admin Lista Corsi (app/admin/courses/page.tsx)

### 1. Route Bottone "Nuovo corso" (riga 96)
```typescript
<Button onClick={() => router.push("/admin/courses/new")}>
```
**Risultato**: Naviga a `/admin/courses/new` (pagina legacy)

### 2. Parsing Response Fetch (riga 32-35)
```typescript
const data = await response.json()
setCourses(Array.isArray(data) ? data : [])
```
**Problema**: L'API ritorna `{ courses }`, ma il codice assume array. Risultato: `courses = []` sempre.

**Fix necessario**: `setCourses(data.courses || [])`

### 3. Campo Categoria (riga 51, 153)
```typescript
course.category.toLowerCase().includes(searchQuery.toLowerCase())
<Badge variant="outline">{course.category}</Badge>
```
**Problema**: Il codice usa `course.category`, ma i corsi Academy hanno `categoryName` (lib/types-academy.ts, riga 17).

**Crash potenziale**: `course.category.toLowerCase()` su corsi Academy → `TypeError: Cannot read property 'toLowerCase' of undefined`

**Fix necessario**: `(course.categoryName || course.category || "").toLowerCase()`

### 4. Tipo Course (riga 13)
```typescript
import type { Course } from "@/lib/types"
```
**Problema**: Usa `@/lib/types` (vecchio), non `@/lib/types-academy`. I corsi Academy hanno struttura diversa.

**Fix necessario**: Cambiare import a `@/lib/types-academy` O gestire entrambi i tipi.

---

## GET /api/categories Response Shape

### Verifica (app/api/categories/route.ts, riga 8)
```typescript
return NextResponse.json({ categories })
```

**Risultato**: Response è un **oggetto** `{ categories: Category[] }`, NON un array diretto.

---

## AdminRequired e DemoModeBanner

### AdminRequired (components/AdminRequired.tsx)
- ✅ Esiste
- **Uso**: Avvolgere pagina con `<AdminRequired>{children}</AdminRequired>`
- **Comportamento**: Redirect a `/auth/login` se non autenticato, `/area-riservata/dashboard` se non admin
- **Pattern**: Usato in tutte le pagine admin (app/admin/courses/*)

### DemoModeBanner (components/DemoModeBanner.tsx)
- ✅ Esiste
- **Uso**: `<DemoModeBanner />` (self-closing)
- **Comportamento**: Mostra banner solo se `isDemoMode === true`
- **Pattern**: Usato in tutte le pagine admin (app/admin/courses/*)

---

## Conclusione

### ❌ Il Piano va Corretto

**Problemi Critici Identificati**:

1. **GET /api/admin/courses response**: Ritorna `{ courses }`, ma app/admin/courses/page.tsx assume array → fix necessario
2. **Campo categoria**: app/admin/courses/page.tsx usa `course.category`, ma Academy usa `categoryName` → crash potenziale
3. **Tipo Course**: app/admin/courses/page.tsx importa `@/lib/types` invece di `@/lib/types-academy` → incompatibilità
4. **PATCH /api/admin/courses/[id]**: Non esiste, ma app/admin/courses/page.tsx lo chiama → 404/405

**Piano Corretto**:

1. ✅ Creare `app/admin/courses/new-academy/page.tsx` (come specificato)
2. ✅ Modificare `app/admin/courses/page.tsx`:
   - Cambiare "Nuovo corso" → `/admin/courses/new-academy`
   - Fix parsing: `setCourses(data.courses || [])`
   - Fix categoria: `(course.categoryName || course.category || "")`
   - (Opzionale) Cambiare import a `@/lib/types-academy` O gestire entrambi
3. ✅ Aggiungere PATCH in `app/api/admin/courses/[id]/route.ts`:
   - Metodo PATCH
   - Body: `{ published: boolean }` (minimalista)
   - Response: `{ success: true }`
   - requireAdmin check

**Schema Confermato**: courseSchema, moduleSchema, lessonSchema sono corretti come specificato.

**Endpoint Confermati**: Tutti gli endpoint admin esistono e hanno la shape corretta, tranne PATCH che manca.

**Struttura Firestore Confermata**: Path corretti come specificato.




