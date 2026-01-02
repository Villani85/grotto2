# ROOT CAUSE ANALYSIS - POST /api/admin/live-events 500 Error

## Problema
- **Endpoint**: `POST /api/admin/live-events`
- **Errore**: 500 Internal Server Error
- **Sintomo UI**: `SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input`
- **File UI**: `app/admin/live-events/new/page.tsx:55`

## Analisi Codice

### 1. Chiamata UI (app/admin/live-events/new/page.tsx:37-55)
```typescript
const res = await authenticatedFetch("/api/admin/live-events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ ... })
})

const data = await res.json() // ❌ CRASHA QUI se res non è JSON valido
```

**Problema**: 
- Non verifica se `res.ok` prima di chiamare `res.json()`
- Non gestisce il caso in cui la risposta non sia JSON valido
- Non gestisce body vuoto

### 2. API Route (app/api/admin/live-events/route.ts:57-126)
```typescript
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request) // ⚠️ Può throware
    let body: any
    try {
      body = await request.json() // ⚠️ Può fallire
    } catch (parseError) {
      return NextResponse.json({ ... }, { status: 400 }) // ✅ OK
    }
    
    const validated = createEventSchema.parse(body) // ⚠️ Zod può throware
    const event = await LiveEventsRepository.create(createData) // ⚠️ Può throware
    
    return NextResponse.json({ ... }, { status: 201 }) // ✅ OK
  } catch (error: any) {
    // Gestisce alcuni errori ma...
    if (error.message === "Unauthorized" || error.message === "Forbidden") {
      return NextResponse.json({ ... }, { status: 401/403 }) // ✅ OK
    }
    if (error.name === "ZodError") {
      return NextResponse.json({ ... }, { status: 400 }) // ✅ OK
    }
    console.error("[API Admin Live Events] Error creating:", error)
    return NextResponse.json({ ... }, { status: 500 }) // ✅ OK
  }
}
```

**Problema Potenziale**:
- Se `requireAdmin` lancia un errore non catchato (es. errore di rete Firebase)
- Se `LiveEventsRepository.create` lancia un errore non catchato (es. Firestore error)
- Se c'è un errore durante il parsing del body che non viene catchato
- **NEXT.JS potrebbe ritornare una risposta HTML di errore invece di JSON**

### 3. Repository (lib/repositories/live-events.ts:265-331)
```typescript
static async create(data: LiveEventCreateInput): Promise<LiveEvent> {
  if (isDemoMode) {
    throw new Error("Cannot create in demo mode") // ⚠️ Throw
  }
  const app = await getAdminApp()
  if (!app) {
    throw new Error("Firebase Admin not initialized") // ⚠️ Throw
  }
  // ... Firestore operations che possono throware
  const docRef = await db.collection("live_events").add(eventData) // ⚠️ Può throware
}
```

**Problema**:
- Gli errori vengono throwati e dovrebbero essere catchati dall'API
- Ma se l'API non gestisce correttamente, Next.js potrebbe ritornare HTML

## Root Cause Probabile

1. **Errore non catchato nell'API**: Un errore durante `LiveEventsRepository.create` o `requireAdmin` potrebbe non essere catchato correttamente, causando una risposta HTML di Next.js invece di JSON.

2. **Body vuoto su errore**: Se Next.js ritorna una pagina di errore HTML, il body potrebbe essere vuoto o non JSON, causando il crash su `res.json()`.

3. **Mancanza di validazione response**: La UI non verifica se la risposta è JSON valido prima di parsarla.

## Come Riprodurre

1. **Test 1 - Errore Firestore**:
   - Disabilita Firebase Admin (rimuovi env vars)
   - Crea evento → `LiveEventsRepository.create` throwa
   - API catcha ma potrebbe ritornare HTML invece di JSON

2. **Test 2 - Body vuoto**:
   - Simula errore che causa risposta vuota
   - UI chiama `res.json()` su body vuoto → crash

3. **Test 3 - Errore non catchato**:
   - Se c'è un errore durante l'inizializzazione di Next.js o middleware
   - La risposta potrebbe essere HTML di errore

## Fix Necessari

1. **API**: Garantire SEMPRE risposta JSON, anche su errori non previsti
2. **UI**: Parsing JSON robusto con fallback
3. **Helper**: Funzione riusabile per fetch con parsing sicuro

