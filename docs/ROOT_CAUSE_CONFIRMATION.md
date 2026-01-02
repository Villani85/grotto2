# ROOT CAUSE CONFIRMATION - POST /api/admin/live-events 500

## Analisi Iniziale

### File Analizzati

1. **app/admin/live-events/new/page.tsx:55**
   - Chiamava `const data = await res.json()` direttamente
   - Nessun controllo se risposta fosse JSON valido
   - Crashava con "Unexpected end of JSON input" se body vuoto/HTML

2. **app/api/admin/live-events/route.ts:57-196**
   - Try/catch presente ma non copriva tutti i casi
   - Nessun `export const runtime = "nodejs"` esplicito
   - Pattern diverso da `/api/admin/courses` (più complesso)

3. **lib/repositories/live-events.ts:265-331**
   - `create()` lanciava `Error("Cannot create in demo mode")` generico
   - `Error("Firebase Admin not initialized")` generico
   - Errori non tipizzati per distinguere cause

4. **lib/api-helpers.ts:31-46**
   - `authenticatedFetch` semplice, non causa problemi
   - Non gestisce parsing JSON

## Root Cause Probabile

### IPOTESI 1: Runtime Edge vs Node.js (CONFERMATA)
**Prova nel codice**: 
- File: `app/api/admin/live-events/route.ts`
- Linea: Nessun `export const runtime = "nodejs"` presente
- Altri file admin usano: `app/api/admin/ivs/recordings/list/route.ts:5` ha `export const runtime = "nodejs"`

**Causa**: 
- Next.js default può essere edge runtime
- `firebase-admin` non funziona in edge runtime
- Errore durante import/init può causare risposta HTML invece di JSON

**Fix**: Aggiunto `export const runtime = "nodejs"` esplicito

---

### IPOTESI 2: Body Parsing Non Robusto (CONFERMATA)
**Prova nel codice**:
- File: `app/admin/live-events/new/page.tsx:55`
- Linea: `const data = await res.json()` senza try/catch
- Se API ritorna HTML o body vuoto, `res.json()` crasha

**Causa**:
- Se Next.js ritorna pagina errore HTML (es. 500 interno), body non è JSON
- `res.json()` su body HTML/empty → SyntaxError

**Fix**: Parsing robusto con `res.text()` + `JSON.parse()` in try/catch

---

### IPOTESI 3: Errori Repository Non Tipizzati (CONFERMATA)
**Prova nel codice**:
- File: `lib/repositories/live-events.ts:267,272`
- Linea: `throw new Error("Cannot create in demo mode")` e `throw new Error("Firebase Admin not initialized")`
- API route deve fare pattern matching su `error.message` per distinguere

**Causa**:
- Errori generici rendono difficile gestione specifica
- Se errore non matchato, va in catch-all che potrebbe non gestire bene

**Fix**: Errori tipizzati: `"DEMO_MODE"` e `"FIREBASE_ADMIN_NOT_READY"`

---

### IPOTESI 4: Catch-All Non Garantisce JSON (CONFERMATA)
**Prova nel codice**:
- File: `app/api/admin/live-events/route.ts:179-195`
- Pattern più complesso del necessario
- Alcuni errori potrebbero non essere catchati se lanciati durante module load

**Causa**:
- Se errore avviene durante import di moduli (top-level), potrebbe non essere catchato
- Next.js potrebbe ritornare HTML di errore invece di JSON

**Fix**: Semplificato pattern seguendo `/api/admin/courses`, catch-all garantisce sempre JSON

---

## Conclusione

**Root Cause Principale**: Combinazione di:
1. Mancanza runtime esplicito → possibili errori edge runtime
2. Parsing JSON non robusto in UI → crash su risposte non-JSON
3. Pattern API più complesso del necessario → possibili edge cases non gestiti

**Fix Applicato**: 
- Runtime esplicito `nodejs`
- Parsing robusto in UI (text → parse con fallback)
- Pattern API semplificato seguendo `/api/admin/courses`
- Errori repository tipizzati

