# FIX COMPLETO - Validation Error con fieldErrors

## Riepilogo Modifiche

### Problema Identificato

1. **scheduledAt Format Mismatch**:
   - Schema Zod richiede: ISO datetime string (`"2024-12-15T18:00:00.000Z"`)
   - UI inviava: datetime-local format (`"2024-12-15T18:00"`)
   - Risultato: Validazione falliva se `scheduledAt` presente

2. **fieldErrors Non Mostrati in UI**:
   - API ritornava `fieldErrors` ma UI non li mostrava
   - Utente vedeva solo messaggio generico "Validation error"

3. **Mancanza Logging**:
   - Nessun log per vedere payload inviato
   - Difficile debug senza vedere Zod issues

---

## Modifiche Applicate

### 1. API Route (`app/api/admin/live-events/route.ts`)

**Aggiunto Logging**:
```typescript
// Log body in dev for debugging
if (process.env.NODE_ENV === "development") {
  console.log("[LiveEvents] POST body:", JSON.stringify(body, null, 2))
}

// Log Zod issues in dev
if (process.env.NODE_ENV === "development") {
  console.log("[LiveEvents] Zod issues:", JSON.stringify(zodError.issues, null, 2))
}
```

**fieldErrors Già Presente** (confermato):
- API già ritorna `fieldErrors: zodError.errors || zodError.issues`
- Nessuna modifica necessaria

---

### 2. UI Client (`app/admin/live-events/new/page.tsx`)

**A) State per fieldErrors**:
```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
```

**B) Client-side Validation**:
```typescript
// Title required check prima della POST
if (!formData.title || formData.title.trim() === "") {
  setFieldErrors({ title: "Il titolo è obbligatorio" })
  setIsSubmitting(false)
  return
}
```

**C) Conversione scheduledAt a ISO**:
```typescript
// Convert datetime-local to ISO datetime string
let scheduledAtISO: string | undefined = undefined
if (formData.scheduledAt) {
  const date = new Date(formData.scheduledAt)
  if (!isNaN(date.getTime())) {
    scheduledAtISO = date.toISOString()
  }
}
```

**D) Estrazione e Visualizzazione fieldErrors**:
```typescript
// Extract field errors if present
if (data?.fieldErrors && Array.isArray(data.fieldErrors)) {
  const errors: Record<string, string> = {}
  data.fieldErrors.forEach((err: any) => {
    const path = err.path?.join(".") || "unknown"
    errors[path] = err.message || "Errore di validazione"
  })
  setFieldErrors(errors)
}
```

**E) UI Mostra Errori per Campo**:
```typescript
// Campo title
<Input
  className={fieldErrors.title ? "border-destructive" : ""}
/>
{fieldErrors.title && (
  <p className="text-sm text-destructive mt-1">{fieldErrors.title}</p>
)}

// Campo scheduledAt
<Input
  className={fieldErrors.scheduledAt ? "border-destructive" : ""}
/>
{fieldErrors.scheduledAt && (
  <p className="text-sm text-destructive mt-1">{fieldErrors.scheduledAt}</p>
)}

// Altri campi
{Object.entries(fieldErrors)
  .filter(([field]) => field !== "title" && field !== "scheduledAt")
  .map(([field, message]) => (
    <p key={field} className="text-sm text-destructive">
      <strong>{field}:</strong> {message}
    </p>
  ))}
```

**F) Validazione duration**:
```typescript
duration: formData.duration && !isNaN(parseInt(formData.duration))
  ? parseInt(formData.duration)
  : undefined,
```

---

## Diff File Modificati

### app/api/admin/live-events/route.ts

```diff
+ // Log body in dev for debugging
+ if (process.env.NODE_ENV === "development") {
+   console.log("[LiveEvents] POST body:", JSON.stringify(body, null, 2))
+ }

  // Validate with Zod
  let validated: any
  try {
    validated = createEventSchema.parse(body)
  } catch (zodError: any) {
    if (zodError.name === "ZodError") {
+     // Log Zod issues in dev
+     if (process.env.NODE_ENV === "development") {
+       console.log("[LiveEvents] Zod issues:", JSON.stringify(zodError.issues, null, 2))
+     }
      return NextResponse.json(
        {
          success: false,
          error: zodError.errors?.[0]?.message || "Validation error",
          errorCode: "VALIDATION_ERROR",
          fieldErrors: zodError.errors || zodError.issues,
        },
        { status: 400 }
      )
    }
```

### app/admin/live-events/new/page.tsx

```diff
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
+ const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
+   setFieldErrors({})

+   // Client-side validation: title required
+   if (!formData.title || formData.title.trim() === "") {
+     setFieldErrors({ title: "Il titolo è obbligatorio" })
+     setIsSubmitting(false)
+     return
+   }

    try {
+     // Convert datetime-local to ISO datetime string
+     let scheduledAtISO: string | undefined = undefined
+     if (formData.scheduledAt) {
+       const date = new Date(formData.scheduledAt)
+       if (!isNaN(date.getTime())) {
+         scheduledAtISO = date.toISOString()
+       }
+     }

+     const payload = {
+       title: formData.title.trim(),
+       slug: formData.slug?.trim() || undefined,
+       description: formData.description?.trim() || undefined,
+       scheduledAt: scheduledAtISO || undefined,
+       chatEnabled: formData.chatEnabled,
+       speaker: formData.speaker?.trim() || undefined,
+       speakerTitle: formData.speakerTitle?.trim() || undefined,
+       category: formData.category?.trim() || undefined,
+       duration: formData.duration && !isNaN(parseInt(formData.duration))
+         ? parseInt(formData.duration)
+         : undefined,
+     }

      const res = await authenticatedFetch("/api/admin/live-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
-       body: JSON.stringify({
-         title: formData.title,
-         slug: formData.slug || undefined,
-         description: formData.description || undefined,
-         scheduledAt: formData.scheduledAt || undefined,
-         chatEnabled: formData.chatEnabled,
-         speaker: formData.speaker || undefined,
-         speakerTitle: formData.speakerTitle || undefined,
-         category: formData.category || undefined,
+       body: JSON.stringify(payload),
      })

      // ... parsing robusto ...

      // Handle errors
      if (!res.ok || !data.success) {
        const errorMessage =
          data?.error || data?.message || res.statusText || `HTTP ${res.status}`
        setError(errorMessage)

+       // Extract field errors if present
+       if (data?.fieldErrors && Array.isArray(data.fieldErrors)) {
+         const errors: Record<string, string> = {}
+         data.fieldErrors.forEach((err: any) => {
+           const path = err.path?.join(".") || "unknown"
+           errors[path] = err.message || "Errore di validazione"
+         })
+         setFieldErrors(errors)
+       }

        return
      }

      // ... success ...

+   // Campo title con errori
+   <Input
+     className={fieldErrors.title ? "border-destructive" : ""}
+   />
+   {fieldErrors.title && (
+     <p className="text-sm text-destructive mt-1">{fieldErrors.title}</p>
+   )}

+   // Campo scheduledAt con errori
+   <Input
+     className={fieldErrors.scheduledAt ? "border-destructive" : ""}
+   />
+   {fieldErrors.scheduledAt && (
+     <p className="text-sm text-destructive mt-1">{fieldErrors.scheduledAt}</p>
+   )}

+   // Altri fieldErrors
+   {Object.keys(fieldErrors).length > 0 && (
+     <div className="space-y-1">
+       {Object.entries(fieldErrors)
+         .filter(([field]) => field !== "title" && field !== "scheduledAt")
+         .map(([field, message]) => (
+           <p key={field} className="text-sm text-destructive">
+             <strong>{field}:</strong> {message}
+           </p>
+         ))}
+     </div>
+   )}
```

---

## Schema Zod - Campi Richiesti

```typescript
const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),  // REQUIRED
  slug: z.string().optional(),
  description: z.string().max(5000).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),  // ISO format se presente
  playbackUrl: z.string().url().optional(),
  chatEnabled: z.boolean().optional(),
  speaker: z.string().max(200).optional(),
  speakerTitle: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  duration: z.number().int().positive().optional(),  // Intero positivo se presente
})
```

**Campi REQUIRED**: Solo `title`

**Campi con Validazione Specifica**:
- `scheduledAt`: ISO datetime string (es. `"2024-12-15T18:00:00.000Z"`)
- `duration`: Number intero positivo
- `playbackUrl`: URL valido

---

## Checklist Finale

- [x] API ritorna sempre `fieldErrors` in caso di ZodError
- [x] API logga body e Zod issues in dev mode
- [x] UI converte `datetime-local` in ISO datetime
- [x] UI mostra `fieldErrors` per ogni campo
- [x] UI validazione client-side per title
- [x] UI gestisce tutti i tipi di errore senza crash
- [x] Test manuali documentati

---

## Risultato

✅ **API**: Sempre ritorna JSON con `fieldErrors` dettagliati  
✅ **UI**: Mostra errori per campo in modo leggibile  
✅ **Conversione**: `datetime-local` → ISO datetime automatica  
✅ **Debugging**: Logging completo in dev mode  
✅ **UX**: Validazione client-side per feedback immediato

Il sistema ora fornisce feedback dettagliato su ogni campo che fallisce la validazione.

