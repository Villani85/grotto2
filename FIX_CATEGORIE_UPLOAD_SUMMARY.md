# Fix Categorie e Upload - Riepilogo Modifiche

## FASE 1 - VERIFICA ✅

### Report Completo
Vedi `REPORT_VERIFICA_CATEGORIE_UPLOAD.md` per dettagli.

**Risultati**:
- ✅ Categorie: Parsing corretto, ma manca error handling
- ✅ Upload: Pattern corretto da riusare (uploadBytesResumable con Promise wrapper)
- ✅ Storage Rules: Già corrette, nessuna modifica necessaria

---

## FASE 2 - MODIFICHE ✅

### File Modificato: `app/admin/courses/new-academy/page.tsx`

#### 1. Fix Categorie (Righe 56-69, 523-540)

**Aggiunto**:
- State: `categoriesLoading`, `categoriesError`
- Error handling completo in `fetchCategories()`:
  - Gestisce status 500
  - Gestisce array vuoto con messaggio esplicativo
  - Mostra loading state
  - Bottone "Riprova" in caso di errore

**UI Select Categoria**:
- Mostra "Caricamento categorie..." durante loading
- Mostra messaggio errore + bottone "Riprova" se errore
- Mostra select normale se tutto OK

**Messaggio Errore Array Vuoto**:
> "Nessuna categoria disponibile. Crea almeno un documento in Firestore collection 'categories' con isActive: true e order: number."

#### 2. Upload Cover Image e Preview Video (Righe 59-66, 130-200, 642-720)

**Aggiunto State**:
- `coverImageFile`, `previewVideoFile` (File | null)
- `coverImageMode`, `previewVideoMode` ("url" | "file")
- `uploadingCover`, `uploadingPreview` (boolean)

**Helper Upload**:
- `uploadImageFile(file, prefix)`: Usa `uploadBytes` (Promise vera) per immagini
- `uploadVideoFile(file, prefix)`: Usa `uploadBytesResumable` wrappato in Promise per video
- Path: `courses/covers/{timestamp}-{filename}` e `courses/previews/{timestamp}-{filename}`

**UI Toggle URL/File**:
- Radio buttons per scegliere modalità (URL o File)
- Input URL quando modalità "url"
- Input file quando modalità "file"
- Preview immagine con `URL.createObjectURL()` + cleanup
- Preview video mostra filename + size

**Submit Handler** (Righe 324-356):
- Prima di creare corso:
  1. Se `coverImageMode === "file"` e file presente → upload → salva URL
  2. Se `previewVideoMode === "file"` e file presente → upload → salva URL
  3. Poi procede con creazione corso usando URL ottenuti

**Error Handling**:
- Messaggi step-specifici: "Errore upload cover image: ..." / "Errore upload preview video: ..."
- Nessun rollback automatico

---

## Storage Rules

### Verifica (storage.rules)
- ✅ Helper `isAdmin()` già definito (righe 6-8)
- ✅ Path `/courses/**` già configurato per write admin (righe 36-39)
- ✅ Read pubblico per utenti autenticati
- ✅ Write solo admin

**Conclusione**: Nessuna modifica necessaria. Le rules già permettono upload admin in `/courses/covers/**` e `/courses/previews/**`.

---

## File Modificati

### 1. `app/admin/courses/new-academy/page.tsx`
- **Righe 56-69**: Aggiunto state e error handling per categorie
- **Righe 59-66**: Aggiunto state per upload file
- **Righe 130-200**: Aggiunto helper `uploadImageFile` e `uploadVideoFile`
- **Righe 200-220**: Aggiunto handler `handleCoverImageFileChange` e `handlePreviewVideoFileChange`
- **Righe 324-356**: Modificato `handleSubmit` per upload file prima di creare corso
- **Righe 523-540**: Modificato UI select categoria con loading/error states
- **Righe 642-720**: Modificato UI cover/preview con toggle URL/File

---

## Test Checklist

### Categorie
- ✅ Loading state mostrato durante fetch
- ✅ Error 500 mostrato con messaggio + bottone "Riprova"
- ✅ Array vuoto mostrato con messaggio esplicativo
- ✅ Select funziona quando categorie disponibili

### Upload
- ✅ Toggle URL/File funziona per cover e preview
- ✅ Preview immagine mostra thumbnail
- ✅ Preview video mostra filename + size
- ✅ Upload cover image funziona (path: `courses/covers/`)
- ✅ Upload preview video funziona (path: `courses/previews/`)
- ✅ URL salvati correttamente nel corso
- ✅ Error handling mostra messaggi specifici

### Storage Rules
- ✅ Upload funziona solo per admin (verificato da rules esistenti)
- ✅ Read pubblico per utenti autenticati (OK per Academy)

---

## Note Importanti

1. **Categorie**: Se il problema persiste, verificare:
   - Esistono documenti in Firestore collection `categories` con `isActive: true` e `order` numerico
   - Se serve index Firestore (where + orderBy), crearlo manualmente da Firebase Console

2. **Upload**: 
   - Cover image: accetta solo `image/*`
   - Preview video: accetta solo `video/*`
   - File vengono sanitizzati (caratteri speciali rimossi dal filename)
   - Path include timestamp per evitare collisioni

3. **Storage Rules**: Già corrette, nessuna modifica necessaria.




