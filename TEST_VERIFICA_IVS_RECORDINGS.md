# 🧪 Test e Verifica - Integrazione IVS Recordings S3

**Data Test:** 2025-01-XX  
**Versione:** 1.0  
**Status:** ✅ Pronto per Test

---

## 📋 Checklist Pre-Test

### Configurazione Ambiente

- [ ] Variabili ambiente configurate in `.env.local`:
  ```bash
  AWS_ACCESS_KEY_ID=your-access-key-id
  AWS_SECRET_ACCESS_KEY=your-secret-access-key
  AWS_REGION=eu-central-1
  AWS_S3_RECORDINGS_BUCKET=v0-membership-recordings-tuonome2
  AWS_S3_RECORDINGS_PREFIX=ivs/v1/
  ```

- [ ] Build passa senza errori:
  ```bash
  npm run build
  ```

- [ ] Dipendenze installate:
  ```bash
  npm list @aws-sdk/client-s3
  ```

- [ ] Permessi AWS IAM configurati:
  - `s3:ListBucket` sul bucket
  - `s3:GetObject` su tutti gli oggetti del bucket

---

## 🧪 Test 1: Build e Compilazione

### Comando
```bash
npm run build
```

### Risultato Atteso
```
✓ Compiled successfully
✓ Generating static pages
```

### Verifica
- [ ] Build completa senza errori
- [ ] Nessun errore TypeScript
- [ ] Route `/api/admin/ivs/recordings/list` presente
- [ ] Route `/api/admin/ivs/recordings` presente

---

## 🧪 Test 2: Route GET /api/admin/ivs/recordings/list

### Prerequisiti
- Admin autenticato
- AWS credentials configurate
- Almeno una registrazione in S3 bucket

### Test Manuale

1. **Apri `/admin/live` come admin**

2. **Clicca "🔄 Aggiorna elenco"**

3. **Verifica Console Browser (F12):**
   - Request: `GET /api/admin/ivs/recordings/list`
   - Status: `200 OK`
   - Response contiene array `recordings`

4. **Verifica Response JSON:**
   ```json
   {
     "recordings": [
       {
         "endedKey": "ivs/v1/.../events/recording-ended.json",
         "prefix": "ivs/v1/...",
         "endedAt": "2025-01-15T10:30:00Z",
         "channelId": "canale-diretta-v0",
         "region": "eu-central-1",
         "hasMediaHls": true,
         "duration": 3600,
         "streamId": "stream-123"
       }
     ],
     "count": 1,
     "total": 1,
     "hasMore": false,
     "nextCursor": null
   }
   ```

5. **Verifica UI:**
   - Lista registrazioni visibile
   - Ogni registrazione mostra: data, channel ID, durata, status HLS
   - Prefix S3 mostrato in font monospace

### Test Paginazione

1. **Test con limite:**
   ```
   GET /api/admin/ivs/recordings/list?limit=10
   ```
   - Verifica: max 10 registrazioni restituite

2. **Test con cursor:**
   ```
   GET /api/admin/ivs/recordings/list?limit=10&cursor=abc123
   ```
   - Verifica: paginazione funziona

### Test Errori

1. **Credenziali mancanti:**
   - Rimuovi temporaneamente `AWS_ACCESS_KEY_ID` da `.env.local`
   - Riavvia dev server
   - Clicca "🔄 Aggiorna elenco"
   - **Risultato Atteso:** `{ recordings: [], error: "AWS credentials not configured" }`

2. **Bucket vuoto:**
   - Se non ci sono registrazioni in S3
   - **Risultato Atteso:** `{ recordings: [], message: "No recordings found in S3" }`

### Checklist Test 2
- [ ] Lista registrazioni caricata correttamente
- [ ] Metadati corretti (endedAt, channelId, duration)
- [ ] Status HLS corretto (✅ o ⚠️)
- [ ] Paginazione funziona
- [ ] Gestione errori corretta

---

## 🧪 Test 3: Route POST /api/admin/ivs/recordings (Importazione)

### Prerequisiti
- Test 2 completato con successo
- Almeno una registrazione visibile nella lista

### Test Manuale

1. **Nella lista registrazioni, clicca "📥 Importa" su una registrazione**

2. **Inserisci titolo nel prompt:**
   - Esempio: "Diretta Test 15 Gennaio"

3. **Verifica Console Browser:**
   - Request: `POST /api/admin/ivs/recordings`
   - Body: `{ title: "...", endedKey: "...", prefix: "..." }`
   - Status: `200 OK`
   - Response: `{ success: true, id: "firestore-doc-id" }`

4. **Verifica Alert:**
   - Mostra: "Registrazione importata con successo! ID: ..."

5. **Verifica Firestore Console:**
   - Vai a Firestore → Collection `ivsRecordings`
   - Documento creato con:
     - `title`: titolo inserito
     - `s3Prefix`: prefix S3
     - `endedKey`: chiave JSON
     - `endedAt`: data fine registrazione (estratto da S3 JSON)
     - `status`: "READY"
     - `createdBy`: UID admin

### Test Deduplicazione

1. **Importa la stessa registrazione due volte:**
   - Prima importazione: ✅ Successo
   - Seconda importazione: ❌ Errore 409 (Conflict)

2. **Verifica Response Errore:**
   ```json
   {
     "success": false,
     "error": "Recording already imported",
     "id": "existing-doc-id"
   }
   ```

### Checklist Test 3
- [ ] Importazione funziona
- [ ] Documento creato in Firestore
- [ ] Campo `endedAt` salvato correttamente (estratto da S3 JSON)
- [ ] Deduplicazione funziona (errore 409 su duplicato)
- [ ] Alert di successo/errore mostrato

---

## 🧪 Test 4: Verifica HLS Check

### Obiettivo
Verificare che `hasMediaHls` controlli **qualsiasi file `.m3u8`** (non solo `index.m3u8`)

### Test

1. **Registrazione con HLS:**
   - Verifica: `hasMediaHls: true` ✅
   - UI mostra: "✅ HLS disponibile"

2. **Registrazione senza HLS:**
   - Verifica: `hasMediaHls: false` ⚠️
   - UI mostra: "⚠️ HLS non trovato"

3. **Registrazione con manifest diverso da `index.m3u8`:**
   - Verifica: `hasMediaHls: true` anche se il file si chiama diversamente

### Checklist Test 4
- [ ] Check HLS funziona per qualsiasi `.m3u8`
- [ ] Status corretto in UI

---

## 🧪 Test 5: Paginazione e Scalabilità

### Test Paginazione

1. **Test con molte registrazioni (>30):**
   ```
   GET /api/admin/ivs/recordings/list?limit=30
   ```
   - Verifica: max 30 registrazioni restituite
   - Verifica: `hasMore: true` se ci sono altre
   - Verifica: `nextCursor` presente se `hasMore: true`

2. **Test paginazione completa:**
   ```
   GET /api/admin/ivs/recordings/list?limit=30&cursor={nextCursor}
   ```
   - Verifica: prossime 30 registrazioni restituite

### Test Limite Massimo

1. **Test limite > 100:**
   ```
   GET /api/admin/ivs/recordings/list?limit=200
   ```
   - Verifica: limite applicato a 100 (max)

### Checklist Test 5
- [ ] Paginazione funziona correttamente
- [ ] Limite default 30 applicato
- [ ] Limite max 100 rispettato
- [ ] `hasMore` e `nextCursor` corretti

---

## 🧪 Test 6: Estrazione endedAt da S3

### Obiettivo
Verificare che `endedAt` venga estratto dal JSON S3 invece di usare current time

### Test

1. **Importa una registrazione**

2. **Verifica Firestore:**
   - Campo `endedAt` presente
   - Valore corrisponde a `recording-ended.json.endedAt` (non current time)

3. **Verifica se S3 non accessibile:**
   - Se fetch S3 fallisce, usa current time come fallback
   - Nessun errore, solo warning in console

### Checklist Test 6
- [ ] `endedAt` estratto da S3 JSON
- [ ] Fallback a current time se S3 non accessibile
- [ ] Nessun errore se fetch S3 fallisce

---

## 🧪 Test 7: Sicurezza e Autenticazione

### Test Autenticazione

1. **Test senza token:**
   ```
   GET /api/admin/ivs/recordings/list
   ```
   - Senza header `Authorization`
   - **Risultato Atteso:** `401 Unauthorized`

2. **Test con token non admin:**
   - Token utente normale (non admin)
   - **Risultato Atteso:** `403 Forbidden`

3. **Test con token admin:**
   - Token admin valido
   - **Risultato Atteso:** `200 OK` con dati

### Test Credenziali AWS

1. **Verifica che credenziali AWS NON siano esposte:**
   - Controlla response API: nessuna chiave AWS visibile
   - Controlla source code client: nessuna chiave AWS

### Checklist Test 7
- [ ] Autenticazione richiesta (401 senza token)
- [ ] Admin check funziona (403 per non-admin)
- [ ] Credenziali AWS non esposte nel client

---

## 📊 Risultati Test

### Test Completati
- [ ] Test 1: Build e Compilazione
- [ ] Test 2: Route GET /recordings/list
- [ ] Test 3: Route POST /recordings (Importazione)
- [ ] Test 4: Verifica HLS Check
- [ ] Test 5: Paginazione e Scalabilità
- [ ] Test 6: Estrazione endedAt da S3
- [ ] Test 7: Sicurezza e Autenticazione

### Problemi Riscontrati
_(Compila qui eventuali problemi trovati durante i test)_

### Note
_(Aggiungi qui note aggiuntive sui test)_

---

## ✅ Conclusione Test

**Data Completamento:** _______________  
**Tester:** _______________  
**Status Finale:** [ ] ✅ Passato | [ ] ⚠️ Parziale | [ ] ❌ Fallito

**Note Finali:**
_________________________________________________
_________________________________________________


