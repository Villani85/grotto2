# NeuroCredits Admin Data Model & UI Map

**Data Analisi**: 2026-01-03  
**Obiettivo**: Analisi completa del sistema admin NeuroCredits per implementare funzionalità di aggiunta/modifica livelli, premi e obiettivi  
**Status**: Analisi statica completata, nessuna modifica applicata

---

## 1. Inventario File

### A) Admin Page UI
- **File**: `app/area-riservata/admin/neurocredits/page.tsx`
- **Tipo**: Client Component (`"use client"`)
- **Righe**: 613
- **Componenti UI importati**:
  - `Card`, `CardContent`, `CardHeader`, `CardTitle`, `CardDescription` da `@/components/ui/card`
  - `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` da `@/components/ui/tabs`
  - `Button` da `@/components/ui/button`
  - `Badge` da `@/components/ui/badge`
  - `Input` da `@/components/ui/input`
  - `Label` da `@/components/ui/label`
  - `Switch` da `@/components/ui/switch`
  - `SubscriptionRequired` da `@/components/SubscriptionRequired`

### B) API Routes Admin NeuroCredits
- **Directory**: `app/api/admin/neurocredits/`
- **File trovati**:
  1. `config/route.ts` - GET config (active + draft)
  2. `config/draft/route.ts` - POST (create draft) + PUT (update draft)
  3. `config/publish/route.ts` - POST (publish draft)
  4. `users/[uid]/adjust/route.ts` - POST (admin adjust credits) - **NON rilevante per questo task**

### C) Config Helpers / Cache
- **File**: `lib/neurocredits-config.ts`
  - Funzione: `getActiveNeuroCreditsConfig()` - legge config attiva con cache 60s
  - Funzione: `clearNeuroCreditsConfigCache()` - pulisce cache
  - **BUG RILEVATO**: Riga 198 usa `LEVELS` ma dovrebbe usare `DEFAULT_LEVELS` (variabile non definita)
- **File**: `lib/neurocredits-rules.ts`
  - Esporta: `NEUROCREDITS_RULES` (hardcoded rules per eventi)
  - Esporta: `NeuroCreditEventType` (type union)
- **File**: `lib/validations-neurocredits.ts`
  - Schemi Zod per validazione config, draft, levels, objectives, rewards

---

## 2. Data Model Attuale

### 2.1 Shape Config Response (GET /api/admin/neurocredits/config)

**Endpoint**: `GET /api/admin/neurocredits/config`  
**File**: `app/api/admin/neurocredits/config/route.ts:136`

```typescript
{
  active: {
    versionId: string
    status: "published"
    createdAt: string (ISO datetime)
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>
    objectives: Array<any>  // ⚠️ TIPO GENERICO
    rewards: Array<any>     // ⚠️ TIPO GENERICO
  }
  draft: {
    versionId: string
    status: "draft"
    createdAt: string (ISO datetime)
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<any>      // ⚠️ TIPO GENERICO
    objectives: Array<any>  // ⚠️ TIPO GENERICO
    rewards: Array<any>     // ⚠️ TIPO GENERICO
  } | null
}
```

**Evidenze**:
- `active` è sempre presente (fallback a default se non esiste)
- `draft` può essere `null` se non esiste bozza
- `objectives` e `rewards` sono tipizzati come `Array<any>` nella UI (righe 34-35, 44-45)
- `levels` ha tipo parziale: `Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>`

### 2.2 Rule Model (Eventi)

**Definizione**: `app/area-riservata/admin/neurocredits/page.tsx:18-23`

```typescript
interface NeuroCreditRule {
  points: number
  enabled: boolean
  dailyCap: number | null
  description?: string
}
```

**Esempio struttura**:
```typescript
rules: {
  "POST_CREATED": { points: 10, enabled: true, dailyCap: 5, description: "..." },
  "COMMENT_CREATED": { points: 5, enabled: true, dailyCap: 10, description: "..." },
  // ... altri eventi
}
```

**Stato**: ✅ **COMPLETO** - Supporta editing inline con input controllati

### 2.3 Levels Model

**Definizione Zod**: `lib/validations-neurocredits.ts:24-30`

```typescript
neuroCreditLevelSchema = z.object({
  id: z.number().int().min(1),
  name: z.string().min(1),
  minPoints: z.number().int().min(0),
  color: z.string().optional(),
  icon: z.string().optional(),
})
```

**Definizione TypeScript UI**: `app/area-riservata/admin/neurocredits/page.tsx:33`

```typescript
levels: Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>
```

**Stato**: ✅ **SCHEMA ESISTENTE** - Zod valida correttamente, ma UI è **SOLO READ-ONLY** (righe 495-502)

**Default Levels**: Definiti in `lib/neurocredits-config.ts:6-22` e duplicati in `app/api/admin/neurocredits/config/route.ts:8-24` e `app/api/admin/neurocredits/config/draft/route.ts:64-80`

```typescript
const DEFAULT_LEVELS = [
  { level: 1, creditsRequired: 0 },
  { level: 2, creditsRequired: 100 },
  // ... fino a level 15
]
```

### 2.4 Objectives Model

**Definizione Zod**: `lib/validations-neurocredits.ts:32-41`

```typescript
neuroCreditObjectiveSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  metric: z.enum(["neuroCredits", "videosCompleted", "activeDays", "streak"]),
  target: z.number().int().min(1),
  windowDays: z.number().int().min(1).max(365),
  rewardPoints: z.number().int().min(0),
  enabled: z.boolean(),
})
```

**Definizione TypeScript UI**: `app/area-riservata/admin/neurocredits/page.tsx:34`

```typescript
objectives: Array<any>  // ⚠️ TIPO GENERICO
```

**Stato**: ✅ **SCHEMA ESISTENTE** - Zod valida correttamente, ma UI è **SOLO READ-ONLY** (righe 508-536)

**Default**: Array vuoto `[]` (righe 57, 98, 131, 203)

### 2.5 Rewards Model

**Definizione Zod**: `lib/validations-neurocredits.ts:43-53`

```typescript
neuroCreditRewardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  cost: z.number().int().min(1),
  enabled: z.boolean(),
  stock: z.number().int().min(0).nullable(),
  minLevel: z.number().int().min(1).nullable(),
  expiresAt: z.string().datetime().nullable(),
})
```

**Definizione TypeScript UI**: `app/area-riservata/admin/neurocredits/page.tsx:35`

```typescript
rewards: Array<any>  // ⚠️ TIPO GENERICO
```

**Stato**: ✅ **SCHEMA ESISTENTE** - Zod valida correttamente, ma UI è **SOLO READ-ONLY** (righe 538-571)

**Default**: Array vuoto `[]` (righe 58, 99, 132, 204)

---

## 3. Validazioni Zod

### 3.1 Schema Draft Update

**File**: `lib/validations-neurocredits.ts:68-75`

```typescript
neuroCreditDraftUpdateSchema = z.object({
  rules: z.record(neuroCreditEventTypeSchema, neuroCreditRuleSchema).optional(),
  levels: z.array(neuroCreditLevelSchema).optional(),
  objectives: z.array(neuroCreditObjectiveSchema).optional(),
  rewards: z.array(neuroCreditRewardSchema).optional(),
  notes: z.string().optional(),
})
```

**Comportamento**:
- ✅ Tutti i campi sono **optional** (`.optional()`)
- ✅ `levels`, `objectives`, `rewards` sono array validati con schemi specifici
- ✅ Se invio array vuoto `[]`, passa la validazione
- ✅ Se invio array con oggetti validi, passa la validazione
- ✅ Se invio array con oggetti invalidi, fallisce con ZodError 400

**Conclusione**: ✅ **PRONTO** - Gli array vengono validati correttamente se presenti nel payload

### 3.2 Schema Config Version (Full)

**File**: `lib/validations-neurocredits.ts:55-66`

```typescript
neuroCreditConfigVersionSchema = z.object({
  versionId: z.string().min(1),
  status: z.enum(["draft", "published"]),
  createdAt: z.string().datetime(),
  createdByUid: z.string().min(1),
  notes: z.string().optional(),
  rules: z.record(neuroCreditEventTypeSchema, neuroCreditRuleSchema),  // ⚠️ NON optional
  levels: z.array(neuroCreditLevelSchema),                              // ⚠️ NON optional
  objectives: z.array(neuroCreditObjectiveSchema),                      // ⚠️ NON optional
  rewards: z.array(neuroCreditRewardSchema),                            // ⚠️ NON optional
})
```

**Nota**: Questo schema non è usato direttamente nelle API, ma definisce la struttura completa di una versione config.

---

## 4. API Contract

### 4.1 GET /api/admin/neurocredits/config

**File**: `app/api/admin/neurocredits/config/route.ts:27-147`

**Metodo**: `GET`  
**Auth**: `requireAdmin(request)` - richiede admin  
**Request**: Nessun body  
**Response**:

```typescript
{
  active: {
    versionId: string
    status: "published"
    createdAt: string
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>
    objectives: Array<any>
    rewards: Array<any>
  }
  draft: {
    versionId: string
    status: "draft"
    createdAt: string
    createdByUid: string
    notes?: string
    rules: Record<string, NeuroCreditRule>
    levels: Array<any>
    objectives: Array<any>
    rewards: Array<any>
  } | null
}
```

**Firestore**:
- Collection: `neurocredits_config`
  - Doc: `meta` → contiene `activeVersionId`
- Collection: `neurocredits_config_versions`
  - Doc: `{activeVersionId}` → versione pubblicata
  - Query: `where("status", "==", "draft")` → bozza (se esiste)

**Status Codes**:
- `200`: OK
- `401`: Unauthorized
- `403`: Forbidden (non admin)
- `500`: Internal server error

### 4.2 POST /api/admin/neurocredits/config/draft

**File**: `app/api/admin/neurocredits/config/draft/route.ts:8-133`

**Metodo**: `POST`  
**Auth**: `requireAdmin(request)`  
**Request**: Nessun body (clona active → draft)  
**Response**:

```typescript
{
  versionId: string
  status: "draft"
  createdAt: string
  createdByUid: string
  notes: string
  rules: Record<string, NeuroCreditRule>
  levels: Array<{ id: number; name: string; minPoints: number }>
  objectives: Array<any>
  rewards: Array<any>
}
```

**Comportamento**:
1. Verifica se esiste già un draft → errore 400 se esiste
2. Legge active version da Firestore (o usa default)
3. Crea nuovo documento in `neurocredits_config_versions` con `status: "draft"`
4. Copia `rules`, `levels`, `objectives`, `rewards` da active

**Firestore**:
- Collection: `neurocredits_config_versions`
  - Doc: `{auto-generated-id}` con `status: "draft"`

**Status Codes**:
- `200`: Draft creato
- `400`: Draft già esistente
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal server error

### 4.3 PUT /api/admin/neurocredits/config/draft

**File**: `app/api/admin/neurocredits/config/draft/route.ts:136-193`

**Metodo**: `PUT`  
**Auth**: `requireAdmin(request)`  
**Request Body** (validato con `neuroCreditDraftUpdateSchema`):

```typescript
{
  rules?: Record<string, NeuroCreditRule>
  levels?: Array<NeuroCreditLevel>
  objectives?: Array<NeuroCreditObjective>
  rewards?: Array<NeuroCreditReward>
  notes?: string
}
```

**Validazione**: `neuroCreditDraftUpdateSchema.parse(body)` (riga 140)

**Comportamento**:
1. Valida body con Zod
2. Trova draft esistente (query `where("status", "==", "draft")`)
3. Aggiorna solo i campi presenti nel body (merge)
4. Aggiunge `updatedAt` e `updatedByUid`

**Firestore**:
- Collection: `neurocredits_config_versions`
  - Doc: draft esistente → `update({ ...updateData })`

**Status Codes**:
- `200`: `{ success: true }`
- `400`: ZodError (validazione fallita)
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Nessun draft trovato
- `500`: Internal server error

**Evidenza Payload UI**: `app/area-riservata/admin/neurocredits/page.tsx:178-184`

```typescript
body: JSON.stringify({
  rules: draftForm.rules,
  levels: draftForm.levels,      // ✅ Incluso
  objectives: draftForm.objectives, // ✅ Incluso
  rewards: draftForm.rewards,    // ✅ Incluso
  notes: draftForm.notes,
})
```

**Conclusione**: ✅ **API PRONTA** - Accetta `levels`, `objectives`, `rewards` nel payload PUT

### 4.4 POST /api/admin/neurocredits/config/publish

**File**: `app/api/admin/neurocredits/config/publish/route.ts:7-72`

**Metodo**: `POST`  
**Auth**: `requireAdmin(request)`  
**Request**: Nessun body  
**Response**:

```typescript
{
  success: true
  versionId: string
}
```

**Comportamento**:
1. Trova draft esistente
2. Aggiorna draft: `status: "published"`, `publishedAt`, `publishedByUid`
3. Aggiorna `neurocredits_config/meta`: `activeVersionId = draftDoc.id`

**Firestore**:
- Collection: `neurocredits_config_versions`
  - Doc: draft → `update({ status: "published", ... })`
- Collection: `neurocredits_config`
  - Doc: `meta` → `set({ activeVersionId: draftDoc.id }, { merge: true })`

**Status Codes**:
- `200`: Pubblicato
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Nessun draft trovato
- `500`: Internal server error

---

## 5. UI Flow

### 5.1 Caricamento Config

**File**: `app/area-riservata/admin/neurocredits/page.tsx:70-110`

**Flusso**:
1. `useEffect` (riga 60) → chiama `loadConfig()` quando `user` è disponibile
2. `loadConfig()` (riga 70):
   - Fetch `GET /api/admin/neurocredits/config`
   - `setConfig(data)` (riga 93)
   - Se `data.draft` esiste → `setDraftForm(JSON.parse(JSON.stringify(data.draft)))` (riga 96)
   - Altrimenti → `setDraftForm(null)` (riga 98)

**State**:
- `config`: `NeuroCreditConfig | null` - dati dal server
- `draftForm`: `NeuroCreditConfig["draft"] | null` - copia locale editabile

### 5.2 Inizializzazione DraftForm

**File**: `app/area-riservata/admin/neurocredits/page.tsx:94-99, 139-142`

**Quando viene inizializzato**:
1. Dopo `loadConfig()` se `data.draft` esiste (riga 96)
2. Dopo `createDraft()` se `draftData` esiste (riga 141)

**Deep Copy**: Usa `JSON.parse(JSON.stringify())` per evitare mutazioni dirette

### 5.3 Gestione Input (Rules - ESEMPIO FUNZIONANTE)

**File**: `app/area-riservata/admin/neurocredits/page.tsx:373-468`

**Pattern**:
- Input controllati: `value={rule.points}` + `onChange={(e) => { setDraftForm({ ... }) }}`
- State update: Immutabile (spread operator)
- Condizionale: `isEditingDraft` decide se mostrare input o testo

**Esempio** (righe 415-433):
```typescript
{isEditingDraft ? (
  <Input
    type="number"
    value={rule.points}
    onChange={(e) => {
      if (draftForm) {
        setDraftForm({
          ...draftForm,
          rules: {
            ...draftForm.rules,
            [eventType]: {
              ...draftForm.rules[eventType],
              points: parseInt(e.target.value) || 0,
            },
          },
        })
      }
    }}
  />
) : (
  <p className="text-lg font-bold">{rule.points}</p>
)}
```

### 5.4 Gestione Input (Levels/Objectives/Rewards - ASSENTE)

**File**: `app/area-riservata/admin/neurocredits/page.tsx:487-571`

**Levels Tab** (righe 487-506):
- ✅ Renderizza lista: `workingConfig.levels?.map((level) => ...)`
- ❌ **NON editabile**: Solo `<span>` e `<Badge>`, nessun input
- ❌ **NON ha bottone "Aggiungi Livello"**

**Objectives Tab** (righe 508-536):
- ✅ Renderizza lista: `workingConfig.objectives?.map((obj: any) => ...)`
- ✅ Mostra messaggio se vuoto: `"Nessun obiettivo configurato"`
- ❌ **NON editabile**: Solo visualizzazione
- ❌ **NON ha bottone "Aggiungi Obiettivo"**

**Rewards Tab** (righe 538-571):
- ✅ Renderizza lista: `workingConfig.rewards?.map((reward: any) => ...)`
- ✅ Mostra messaggio se vuoto: `"Nessun premio configurato"`
- ❌ **NON editabile**: Solo visualizzazione
- ❌ **NON ha bottone "Aggiungi Premio"`

### 5.5 Salvataggio Draft

**File**: `app/area-riservata/admin/neurocredits/page.tsx:155-209`

**Flusso**:
1. `saveDraft()` (riga 155)
2. Verifica `draftForm` non null (riga 156)
3. Fetch `PUT /api/admin/neurocredits/config/draft` con body:
   ```typescript
   {
     rules: draftForm.rules,
     levels: draftForm.levels,      // ✅ Incluso
     objectives: draftForm.objectives, // ✅ Incluso
     rewards: draftForm.rewards,    // ✅ Incluso
     notes: draftForm.notes,
   }
   ```
4. Se OK → toast + `loadConfig()` per sincronizzare

**Evidenza**: Il payload include già `levels`, `objectives`, `rewards` (righe 180-182)

---

## 6. Gap Analysis

| Feature | Stato Attuale | Root Cause | File da Toccare | Nota Rischio |
|---------|---------------|------------|-----------------|--------------|
| **Aggiunta Livelli** | ❌ **ASSENTE** | UI solo read-only, nessun form per aggiungere | `app/area-riservata/admin/neurocredits/page.tsx:487-506` | Basso - API già supporta, Zod valida |
| **Modifica Livelli** | ❌ **ASSENTE** | UI solo read-only, nessun input controllato | `app/area-riservata/admin/neurocredits/page.tsx:495-502` | Basso - Stesso pattern di rules |
| **Rimozione Livelli** | ❌ **ASSENTE** | Nessun bottone delete | `app/area-riservata/admin/neurocredits/page.tsx:495-502` | Basso - Array filter |
| **Aggiunta Obiettivi** | ❌ **ASSENTE** | UI solo read-only, nessun form | `app/area-riservata/admin/neurocredits/page.tsx:508-536` | Medio - Form più complesso (metric, target, windowDays) |
| **Modifica Obiettivi** | ❌ **ASSENTE** | UI solo read-only | `app/area-riservata/admin/neurocredits/page.tsx:519-531` | Medio - Stesso pattern |
| **Rimozione Obiettivi** | ❌ **ASSENTE** | Nessun bottone delete | `app/area-riservata/admin/neurocredits/page.tsx:519-531` | Basso - Array filter |
| **Aggiunta Premi** | ❌ **ASSENTE** | UI solo read-only, nessun form | `app/area-riservata/admin/neurocredits/page.tsx:538-571` | Medio - Form complesso (cost, stock, minLevel, expiresAt) |
| **Modifica Premi** | ❌ **ASSENTE** | UI solo read-only | `app/area-riservata/admin/neurocredits/page.tsx:549-566` | Medio - Stesso pattern |
| **Rimozione Premi** | ❌ **ASSENTE** | Nessun bottone delete | `app/area-riservata/admin/neurocredits/page.tsx:549-566` | Basso - Array filter |

### 6.1 Root Cause Dettagliato

**Perché non posso aggiungere livelli/premi/obiettivi oggi?**

1. **UI Read-Only**: I tab `levels`, `objectives`, `rewards` renderizzano solo liste statiche (`.map()` senza input)
2. **Nessun Form**: Non esiste un form/modal per creare nuovi elementi
3. **Nessun State Update**: Anche se aggiungessi un form, manca la logica per aggiornare `draftForm.levels/objectives/rewards`
4. **Nessun Bottone "Aggiungi"**: Non c'è un CTA per aprire il form

**Cosa funziona già:**
- ✅ API PUT accetta `levels`, `objectives`, `rewards` nel payload
- ✅ Zod valida correttamente gli array
- ✅ `draftForm` include già questi campi
- ✅ `saveDraft()` invia già questi campi al server

**Cosa manca:**
- ❌ Form UI per creare/modificare elementi
- ❌ Funzioni `addLevel()`, `updateLevel()`, `removeLevel()` (e equivalenti per objectives/rewards)
- ❌ Input controllati per i campi di ogni elemento
- ❌ Validazione lato client (opzionale, Zod già valida lato server)

---

## 7. Piano di Modifica Minimo

### 7.1 Aggiornare TypeScript Types (UI)

**File**: `app/area-riservata/admin/neurocredits/page.tsx:33-35`

**Da**:
```typescript
levels: Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>
objectives: Array<any>  // ⚠️
rewards: Array<any>     // ⚠️
```

**A**:
```typescript
levels: Array<{ id: number; name: string; minPoints: number; color?: string; icon?: string }>
objectives: Array<{
  id: string
  title: string
  metric: "neuroCredits" | "videosCompleted" | "activeDays" | "streak"
  target: number
  windowDays: number
  rewardPoints: number
  enabled: boolean
}>
rewards: Array<{
  id: string
  title: string
  description?: string
  cost: number
  enabled: boolean
  stock: number | null
  minLevel: number | null
  expiresAt: string | null
}>
```

**Righe**: 33-35

### 7.2 Aggiungere Funzioni Helper per Array

**File**: `app/area-riservata/admin/neurocredits/page.tsx` (dopo `saveDraft`, prima di `publishDraft`)

**Funzioni da aggiungere**:
```typescript
// Levels
const addLevel = () => { ... }
const updateLevel = (index: number, level: Partial<Level>) => { ... }
const removeLevel = (index: number) => { ... }

// Objectives
const addObjective = () => { ... }
const updateObjective = (index: number, obj: Partial<Objective>) => { ... }
const removeObjective = (index: number) => { ... }

// Rewards
const addReward = () => { ... }
const updateReward = (index: number, reward: Partial<Reward>) => { ... }
const removeReward = (index: number) => { ... }
```

**Pattern**: Simile a come `rules` viene aggiornato (righe 383-394, 419-430)

### 7.3 Aggiornare Tab Levels con Input Controllati

**File**: `app/area-riservata/admin/neurocredits/page.tsx:487-506`

**Modifiche**:
- Aggiungere bottone "Aggiungi Livello" (solo se `isEditingDraft`)
- Sostituire `<span>` e `<Badge>` con input controllati quando `isEditingDraft`
- Aggiungere bottone "Rimuovi" per ogni livello (solo se `isEditingDraft`)
- Pattern: simile a `rules` tab (righe 373-468)

**Righe da modificare**: 494-502

### 7.4 Aggiornare Tab Objectives con Form

**File**: `app/area-riservata/admin/neurocredits/page.tsx:508-536`

**Modifiche**:
- Aggiungere bottone "Aggiungi Obiettivo" (solo se `isEditingDraft`)
- Creare form inline o modal per ogni obiettivo quando `isEditingDraft`
- Input per: `title`, `metric` (select), `target`, `windowDays`, `rewardPoints`, `enabled` (switch)
- Bottone "Rimuovi" per ogni obiettivo
- Pattern: più complesso di levels (più campi)

**Righe da modificare**: 514-533

### 7.5 Aggiornare Tab Rewards con Form

**File**: `app/area-riservata/admin/neurocredits/page.tsx:538-571`

**Modifiche**:
- Aggiungere bottone "Aggiungi Premio" (solo se `isEditingDraft`)
- Creare form inline o modal per ogni premio quando `isEditingDraft`
- Input per: `title`, `description`, `cost`, `enabled` (switch), `stock`, `minLevel`, `expiresAt` (date picker)
- Bottone "Rimuovi" per ogni premio
- Pattern: più complesso (date picker, nullable fields)

**Righe da modificare**: 544-567

### 7.6 Fix Bug neurocredits-config.ts

**File**: `lib/neurocredits-config.ts:198`

**Da**:
```typescript
levels: LEVELS.map((l) => ({
```

**A**:
```typescript
levels: DEFAULT_LEVELS.map((l) => ({
```

**Nota**: Variabile `LEVELS` non esiste, dovrebbe essere `DEFAULT_LEVELS`

---

## 8. File da Modificare (Riepilogo)

### Priorità P0 (Blocca funzionalità)
1. `app/area-riservata/admin/neurocredits/page.tsx`
   - Aggiornare types (righe 33-35)
   - Aggiungere funzioni helper (dopo riga 209)
   - Modificare tab Levels (righe 487-506)
   - Modificare tab Objectives (righe 508-536)
   - Modificare tab Rewards (righe 538-571)

### Priorità P1 (Bug fix)
2. `lib/neurocredits-config.ts`
   - Fix `LEVELS` → `DEFAULT_LEVELS` (riga 198)

### Priorità P2 (Nessuna modifica necessaria)
- `lib/validations-neurocredits.ts` - ✅ Già corretto
- `app/api/admin/neurocredits/config/draft/route.ts` - ✅ Già supporta arrays
- `app/api/admin/neurocredits/config/route.ts` - ✅ Già restituisce arrays

---

## 9. Conclusioni

### Stato Attuale
- ✅ **API pronte**: PUT draft accetta `levels`, `objectives`, `rewards`
- ✅ **Validazione Zod**: Schemi completi e corretti
- ✅ **Data model**: Strutture definite in Zod e TypeScript
- ❌ **UI read-only**: Nessun form per aggiungere/modificare elementi
- ❌ **Funzioni helper**: Mancano `add/update/remove` per arrays

### Gap Principale
Il gap principale è **lato UI**: i tab `levels`, `objectives`, `rewards` sono solo visualizzazione. Manca:
1. Form per creare nuovi elementi
2. Input controllati per modificare elementi esistenti
3. Bottoni per aggiungere/rimuovere elementi
4. Funzioni helper per aggiornare `draftForm` in modo immutabile

### Rischio Implementazione
**Basso-Medio**:
- Pattern già esistente per `rules` (input controllati + state immutabile)
- API e validazione già funzionanti
- Complessità maggiore per `objectives` e `rewards` (più campi, date picker)

### Prossimi Step
1. Implementare funzioni helper `add/update/remove` per ogni tipo
2. Aggiungere form UI per levels (più semplice, da usare come template)
3. Estendere form UI per objectives e rewards
4. Test completo: crea draft → aggiungi elementi → salva → pubblica → verifica persistenza

---

**Documento creato il**: 2026-01-03  
**Analista**: Cursor AI Assistant  
**Status**: ✅ Analisi completata, pronto per implementazione
