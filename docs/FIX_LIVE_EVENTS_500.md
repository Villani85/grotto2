# FIX COMPLETO - POST /api/admin/live-events 500 Error

## FASE 3 - Spiegazione Root Cause e Fix

### Cosa Era Rotto

1. **API Route**: 
   - Gestiva alcuni errori ma non tutti i casi edge
   - Se un errore non previsto si verificava (es. Firestore connection error), Next.js poteva ritornare una pagina HTML di errore invece di JSON
   - Il parsing del body non era robusto (solo `request.json()` senza gestione body vuoto)

2. **UI Client**:
   - Chiamava `res.json()` direttamente senza verificare se la risposta fosse JSON valido
   - Non gestiva il caso di body vuoto o risposta HTML
   - Crashava con `SyntaxError: Unexpected end of JSON input` se la risposta non era JSON

### Perché Ora Non Può Più Crashare

#### API (app/api/admin/live-events/route.ts)

✅ **Sempre JSON**: Ogni possibile percorso di esecuzione ritorna `NextResponse.json()`
- Parse body con try/catch e gestione body vuoto
- Validazione schema con errori strutturati
- Repository errors catchati e ritornati come JSON
- Catch-all finale che garantisce sempre JSON anche su errori non previsti

✅ **Errori Strutturati**: Ogni errore ritorna:
```json
{
  "success": false,
  "error": "Human readable message",
  "errorCode": "ERROR_CODE",
  "details": "Stack trace (solo in dev)"
}
```

#### UI (app/admin/live-events/new/page.tsx)

✅ **Parsing Robusto**: Usa `fetchJson` helper che:
- Legge sempre il body come testo prima di parsare JSON
- Gestisce errori di parsing senza crashare
- Ritorna sempre un oggetto strutturato con `success/error`
- Logga errori in console per debugging

✅ **Gestione Errori**: 
- Non chiama mai `res.json()` direttamente
- Controlla sempre `result.success` prima di procedere
- Mostra messaggi di errore leggibili all'utente
- Non crasha mai, anche con risposte non-JSON

#### Helper Riusabile (lib/fetch-json.ts)

✅ **Funzione Centralizzata**: 
- `fetchJson()` può essere usata in tutte le pagine admin
- Gestisce autenticazione automaticamente
- Parsing JSON robusto con fallback
- Ritorna sempre un oggetto coerente

## FASE 4 - Test Manuali

### Setup Pre-Test

1. Avvia il server: `npm run dev`
2. Accedi come admin: `/auth/login` (deve essere admin)
3. Vai a: `/admin/live-events/new`

---

### TEST 1: Creazione Evento OK ✅

**Obiettivo**: Verificare che la creazione funzioni correttamente

**Steps**:
1. Compila il form:
   - Titolo: "Test Evento Live"
   - Descrizione: "Evento di test"
   - Data/Ora: Seleziona una data futura
   - Chat: Abilitata
2. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ Status 201
- ✅ Risposta JSON: `{ success: true, event: { id: "...", ... } }`
- ✅ Redirect a `/admin/live-events/[id]`
- ✅ Nessun errore in console

**Verifica Console**:
```bash
# Nessun errore, solo log di successo
```

---

### TEST 2: Body Vuoto ❌

**Obiettivo**: Verificare che l'API gestisca body vuoto

**Steps**:
1. Apri DevTools → Network
2. Intercetta la richiesta POST (o modifica temporaneamente il codice per inviare body vuoto)
3. Invia richiesta con body vuoto

**Risultato Atteso**:
- ✅ Status 400
- ✅ Risposta JSON: `{ success: false, error: "Request body is empty", errorCode: "VALIDATION_ERROR" }`
- ✅ UI mostra errore: "Request body is empty"
- ✅ Nessun crash

**Verifica Console**:
```bash
[API Admin Live Events] JSON parse error: ...
```

---

### TEST 3: Campo Obbligatorio Mancante ❌

**Obiettivo**: Verificare validazione campi

**Steps**:
1. Lascia "Titolo" vuoto
2. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ Status 400
- ✅ Risposta JSON: `{ success: false, error: "Title is required", errorCode: "VALIDATION_ERROR", fieldErrors: [...] }`
- ✅ UI mostra errore di validazione
- ✅ Nessun crash

**Verifica Console**:
```bash
# Log di validazione Zod
```

---

### TEST 4: Non Autenticato / Non Admin ❌

**Obiettivo**: Verificare gestione autenticazione

**Steps**:
1. Logout (o usa account non-admin)
2. Prova a creare evento

**Risultato Atteso**:
- ✅ Status 401 o 403
- ✅ Risposta JSON: `{ success: false, error: "Unauthorized" o "Forbidden", errorCode: "AUTH_ERROR" }`
- ✅ UI mostra errore di autorizzazione
- ✅ Nessun crash

**Verifica Console**:
```bash
# Log di autenticazione
```

---

### TEST 5: Errore Firestore (Simulato) ❌

**Obiettivo**: Verificare che errori del repository non causino crash

**Steps**:
1. **Opzione A - Disabilita Firebase Admin**:
   - Rimuovi temporaneamente `GOOGLE_APPLICATION_CREDENTIALS` o credenziali Firebase
   - Prova a creare evento

2. **Opzione B - Simula errore nel codice**:
   - Modifica temporaneamente `lib/repositories/live-events.ts:304`:
     ```typescript
     const docRef = await db.collection("live_events").add(eventData)
     throw new Error("Simulated Firestore error") // Aggiungi questa riga
     ```

**Risultato Atteso**:
- ✅ Status 500
- ✅ Risposta JSON: `{ success: false, error: "...", errorCode: "REPOSITORY_ERROR" }`
- ✅ UI mostra errore leggibile
- ✅ Nessun crash
- ✅ Stack trace in console (solo in dev)

**Verifica Console**:
```bash
[API Admin Live Events] Repository error: ...
[CreateEvent] API error: { status: 500, error: "...", errorCode: "REPOSITORY_ERROR" }
```

---

### TEST 6: JSON Malformato ❌

**Obiettivo**: Verificare parsing JSON robusto

**Steps**:
1. Apri DevTools → Network
2. Intercetta la richiesta POST
3. Modifica il body per essere JSON malformato: `{"title": "test", }` (virgola finale)

**Risultato Atteso**:
- ✅ Status 400
- ✅ Risposta JSON: `{ success: false, error: "Invalid JSON body", errorCode: "VALIDATION_ERROR" }`
- ✅ UI mostra errore
- ✅ Nessun crash

**Verifica Console**:
```bash
[API Admin Live Events] JSON parse error: ...
```

---

### TEST 7: Network Error ❌

**Obiettivo**: Verificare gestione errori di rete

**Steps**:
1. Ferma il server (`Ctrl+C`)
2. Prova a creare evento

**Risultato Atteso**:
- ✅ `fetchJson` ritorna: `{ success: false, error: "Network error", errorCode: "NETWORK_ERROR", status: 0 }`
- ✅ UI mostra errore di rete
- ✅ Nessun crash

**Verifica Console**:
```bash
[fetchJson] Network error: ...
```

---

## Checklist Finale

- [x] API ritorna sempre JSON (anche su errori)
- [x] UI non crasha mai su risposte non-JSON
- [x] Errori strutturati con errorCode
- [x] Messaggi di errore leggibili per l'utente
- [x] Logging dettagliato per debugging
- [x] Helper riusabile `fetchJson` creato
- [x] Test manuali documentati

## File Modificati

1. **app/api/admin/live-events/route.ts**
   - Parsing body robusto
   - Gestione errori completa
   - Sempre ritorna JSON

2. **app/admin/live-events/new/page.tsx**
   - Usa `fetchJson` invece di `authenticatedFetch` + `res.json()`
   - Gestione errori robusta

3. **lib/fetch-json.ts** (NUOVO)
   - Helper riusabile per fetch con parsing JSON robusto
   - Gestione autenticazione automatica
   - Non crasha mai

## Prossimi Passi (Opzionale)

1. Applicare `fetchJson` ad altre pagine admin:
   - `app/admin/live-events/page.tsx`
   - `app/admin/live-events/[id]/page.tsx`
   - Altri form admin

2. Aggiungere test automatici (Jest/Vitest):
   - Test unitari per `fetchJson`
   - Test API route con mock Firestore
   - Test E2E per flusso completo

3. Monitoraggio errori:
   - Logging centralizzato (es. Sentry)
   - Alert su errori 500 frequenti

