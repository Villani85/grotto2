# ANALISI VALIDATION_ERROR - FASE 1

## Schema Zod (app/api/admin/live-events/route.ts:10-20)

```typescript
const createEventSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),  // REQUIRED
  slug: z.string().optional(),
  description: z.string().max(5000).optional(),
  scheduledAt: z.string().datetime().optional().nullable(),  // Se presente, deve essere ISO datetime
  playbackUrl: z.string().url().optional(),
  chatEnabled: z.boolean().optional(),
  speaker: z.string().max(200).optional(),
  speakerTitle: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  duration: z.number().int().positive().optional(),
})
```

**Campi REQUIRED**:
- `title`: string non vuota (min 1, max 200)

**Campi con Validazione Specifica**:
- `scheduledAt`: Se presente, deve essere stringa ISO datetime (es. `"2024-12-15T18:00:00.000Z"`)
- `duration`: Se presente, deve essere number intero positivo
- `playbackUrl`: Se presente, deve essere URL valido

---

## Payload UI (app/admin/live-events/new/page.tsx:42-52)

```typescript
body: JSON.stringify({
  title: formData.title,                                    // String da input
  slug: formData.slug || undefined,
  description: formData.description || undefined,
  scheduledAt: formData.scheduledAt || undefined,          // ⚠️ PROBLEMA: datetime-local format
  chatEnabled: formData.chatEnabled,                        // Boolean (ok)
  speaker: formData.speaker || undefined,
  speakerTitle: formData.speakerTitle || undefined,
  category: formData.category || undefined,
  duration: formData.duration ? parseInt(formData.duration) : undefined,
})
```

**Form Input Type**:
- `scheduledAt`: `<Input type="datetime-local" />` → ritorna formato `"YYYY-MM-DDTHH:mm"` (es. `"2024-12-15T18:00"`)

---

## MISMATCH IDENTIFICATO

### Problema 1: scheduledAt Format
- **Schema richiede**: ISO datetime string (es. `"2024-12-15T18:00:00.000Z"`)
- **UI invia**: datetime-local format (es. `"2024-12-15T18:00"`)
- **Zod `.datetime()`**: Valida formato ISO completo con timezone
- **Risultato**: `scheduledAt` fallisce validazione se presente

### Problema 2: title Vuoto
- Se `formData.title` è stringa vuota `""`, Zod fallisce con `min(1)`

### Problema 3: fieldErrors Non Ritornati
- API catch ZodError ritorna solo `error.errors[0]?.message`
- Non ritorna `fieldErrors` completo per mostrare tutti i problemi

---

## Fix Necessari

1. **API**: Ritornare `fieldErrors` completo in caso di ZodError
2. **UI**: Convertire `datetime-local` in ISO datetime prima di inviare
3. **UI**: Mostrare `fieldErrors` in modo leggibile
4. **UI**: Validazione client-side minima (title required)

