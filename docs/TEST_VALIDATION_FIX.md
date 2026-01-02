# TEST MANUALI - Validation Error Fix

## FASE 3 - Test Manuali

### TEST 1: Creazione Evento OK ✅

**Steps**:
1. Vai a `/admin/live-events/new`
2. Compila form:
   - **Titolo**: "Test Evento Live"
   - **Descrizione**: "Evento di test per validazione"
   - **Data/Ora Programmata**: Seleziona data futura (es. domani alle 18:00)
   - **Chat**: Abilitata
   - **Relatore**: "Dr. Test"
3. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ Network tab: `POST /api/admin/live-events` → Status 201
- ✅ Response JSON: `{ success: true, event: { id: "...", title: "Test Evento Live", ... }, traceId: "..." }`
- ✅ Console server (dev): Log `[LiveEvents] POST body:` con payload completo
- ✅ UI: Redirect a `/admin/live-events/[id]`
- ✅ Nessun errore in console

**Verifica Console Server**:
```bash
[LiveEvents] POST body: {
  "title": "Test Evento Live",
  "description": "Evento di test per validazione",
  "scheduledAt": "2024-12-16T18:00:00.000Z",  // ISO format
  "chatEnabled": true,
  "speaker": "Dr. Test"
}
```

---

### TEST 2: Missing Title ❌

**Steps**:
1. Vai a `/admin/live-events/new`
2. Lascia "Titolo" **vuoto**
3. Compila altri campi (opzionali)
4. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ **Client-side validation**: Form non submit, mostra errore "Il titolo è obbligatorio"
- ✅ Campo "Titolo" evidenziato in rosso
- ✅ Nessuna chiamata API (validazione client-side blocca)

**Verifica UI**:
- Campo title con bordo rosso
- Messaggio sotto: "Il titolo è obbligatorio"
- Pulsante "Crea Evento" non disabilitato ma form non submit

---

### TEST 3: Title Vuoto (Bypass Client Validation) ❌

**Steps**:
1. Vai a `/admin/live-events/new`
2. Inserisci solo spazi in "Titolo": `"   "`
3. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ Network tab: `POST /api/admin/live-events` → Status 400
- ✅ Response JSON: 
  ```json
  {
    "success": false,
    "error": "Title is required",
    "errorCode": "VALIDATION_ERROR",
    "fieldErrors": [
      {
        "code": "too_small",
        "minimum": 1,
        "type": "string",
        "inclusive": true,
        "exact": false,
        "message": "Title is required",
        "path": ["title"]
      }
    ]
  }
  ```
- ✅ UI: Mostra errore "Title is required"
- ✅ Campo "Titolo" evidenziato in rosso
- ✅ Console server (dev): Log `[LiveEvents] Zod issues:` con dettagli

**Verifica Console Server**:
```bash
[LiveEvents] POST body: { "title": "   ", ... }
[LiveEvents] Zod issues: [
  {
    "code": "too_small",
    "minimum": 1,
    "type": "string",
    "message": "Title is required",
    "path": ["title"]
  }
]
```

---

### TEST 4: scheduledAt Non Valido / Formato Sbagliato ❌

**Steps**:
1. Vai a `/admin/live-events/new`
2. Compila "Titolo": "Test"
3. **Opzione A**: Lascia "Data/Ora Programmata" vuota (ok, è opzionale)
4. **Opzione B**: Inserisci data passata (dovrebbe essere accettata, ma testa)
5. Clicca "Crea Evento"

**Risultato Atteso (Opzione A - Vuoto)**:
- ✅ Status 201 (scheduledAt è opzionale)
- ✅ Evento creato senza data

**Risultato Atteso (Opzione B - Data Passata)**:
- ✅ Status 201 (Zod non valida che sia futura, solo formato)
- ✅ Evento creato con data passata

**Se scheduledAt viene inviato in formato sbagliato** (non dovrebbe succedere con il fix):
- ✅ Status 400
- ✅ Response JSON con `fieldErrors` per `scheduledAt`
- ✅ UI mostra errore sotto campo "Data/Ora Programmata"

---

### TEST 5: scheduledAt Formato Corretto (ISO) ✅

**Steps**:
1. Vai a `/admin/live-events/new`
2. Compila:
   - **Titolo**: "Test ISO Date"
   - **Data/Ora Programmata**: Seleziona "2024-12-20 18:00"
3. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ Network tab: Status 201
- ✅ Console server: `scheduledAt: "2024-12-20T18:00:00.000Z"` (ISO format)
- ✅ Evento creato con data corretta

**Verifica Console Server**:
```bash
[LiveEvents] POST body: {
  "title": "Test ISO Date",
  "scheduledAt": "2024-12-20T18:00:00.000Z"  // Convertito da datetime-local
}
```

---

### TEST 6: duration Non Valido ❌

**Steps**:
1. Vai a `/admin/live-events/new`
2. Compila:
   - **Titolo**: "Test Duration"
   - **Durata**: Inserisci testo "abc" o numero negativo "-10"
3. Clicca "Crea Evento"

**Risultato Atteso**:
- ✅ Se "abc": `duration` non inviato (undefined) → Status 201 (ok, opzionale)
- ✅ Se "-10": Status 400 con `fieldErrors` per `duration` (deve essere positivo)
- ✅ UI mostra errore se presente

---

### TEST 7: Non Autenticato / Non Admin ❌

**Steps**:
1. Fai logout
2. Prova a creare evento

**Risultato Atteso**:
- ✅ Network tab: Status 401 o 403
- ✅ Response JSON: `{ success: false, error: "Authentication required" o "Admin access required", errorCode: "AUTH_ERROR" }`
- ✅ UI: Mostra errore "Non autorizzato" (non crasha)
- ✅ Nessun fieldErrors (non è validation error)

---

## Checklist Test

- [ ] TEST 1: Creazione OK → 201 + redirect
- [ ] TEST 2: Title vuoto → Client validation blocca
- [ ] TEST 3: Title solo spazi → 400 + fieldErrors.title
- [ ] TEST 4: scheduledAt vuoto → 201 (opzionale)
- [ ] TEST 5: scheduledAt ISO → 201 + formato corretto
- [ ] TEST 6: duration non valido → 400 + fieldErrors (se negativo)
- [ ] TEST 7: Non admin → 401/403 JSON

## Output Atteso

### Console Server (Dev Mode)
```
[LiveEvents] POST body: { ... }
[LiveEvents] Zod issues: [ ... ]  // Solo se validation error
```

### Network Tab
- Status: 201 (OK) o 400 (Validation)
- Content-Type: application/json
- Body: JSON con `fieldErrors` se validation error

### UI
- Errori mostrati sotto i campi interessati
- Campo evidenziato in rosso se ha errore
- Nessun crash anche con risposte non-JSON

