# REPORT DI VERIFICA - Categorie e Upload

## A) VERIFICA CATEGORIE

### 1. Endpoint API (app/api/categories/route.ts)
- **Path**: `GET /api/categories`
- **Response Shape**: `{ categories: Category[] }` (riga 8)
- **Error Handling**: Ritorna `{ error: string }` con status 500 in caso di errore

### 2. Repository (lib/repositories/academy/categories.ts)
- **Query Firestore** (righe 23-27):
  ```typescript
  db.collection("categories")
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .get()
  ```
- **Filtri**: `isActive == true` (obbligatorio)
- **Ordinamento**: `order` ASC (obbligatorio)
- **Campi Richiesti**: 
  - `name` (string)
  - `order` (number) - **OBBLIGATORIO per orderBy**
  - `isActive` (boolean) - **OBBLIGATORIO per where**
  - `createdAt`, `updatedAt` (Timestamp o Date)

### 3. Client Parsing (app/admin/courses/new-academy/page.tsx, righe 61-69)
```typescript
const res = await fetch("/api/categories")
const data = await res.json()
setCategories(data.categories || [])
```
- ✅ **Parsing CORRETTO**: usa `data.categories`
- ❌ **Error Handling MANCANTE**: non gestisce:
  - Status 500 (mostra solo in console)
  - Array vuoto (non mostra messaggio)
  - Loading state (non c'è)

### 4. Cause Probabili del Problema

**CAUSA PIÙ PROBABILE**: **DB vuoto o documenti senza `isActive: true` o `order` mancante/non numerico**

**Verifica necessaria**:
1. **Index Firestore**: La query `where("isActive", "==", true).orderBy("order", "asc")` **RICHIEDE un composite index**.
   - Se l'index non esiste → errore 500 con messaggio "The query requires an index"
   - **Prova**: Controllare console server per errori Firestore

2. **Documenti mancanti**: Se non ci sono documenti in `categories` con `isActive: true` → array vuoto

3. **Campi mancanti**: Se un documento ha `isActive: true` ma manca `order` o `order` non è number → query fallisce

### 5. Conclusione Categorie

**Cosa va corretto**:
1. ✅ Parsing è corretto (`data.categories`)
2. ❌ Aggiungere error handling: gestire 500, array vuoto, loading
3. ❌ Verificare che esistano categorie in Firestore con `isActive: true` e `order` numerico
4. ❌ Se serve index, loggare errore server-side con istruzioni (non creare link automatico)

---

## B) VERIFICA UPLOAD PATTERN E FIREBASE STORAGE

### 1. getFirebaseStorage (lib/firebase-client.ts)
- ✅ **Esiste**: `getFirebaseStorage()` (riga ~170, da verificare)
- ✅ **Client-side only**: Funziona solo nel browser (usa `window`)
- ✅ **Inizializzazione**: Storage viene inizializzato con `getStorage(app)` (riga 103)

### 2. Pattern Upload Esistente (app/admin/courses/[courseId]/edit/page.tsx)

**Pattern CORRETTO** (righe 197-214):
```typescript
const uploadTask = uploadBytesResumable(storageRef, file, {
  contentType: file.type,
})

// ✅ CORRETTO: Wrappa in Promise con on("state_changed")
await new Promise<void>((resolve, reject) => {
  uploadTask.on(
    "state_changed",
    (snapshot) => { /* progress */ },
    (error) => { reject(error) },
    async () => {
      // Upload completed
      const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
      resolve()
    }
  )
})
```

**Conferma**: Il pattern è **CORRETTO** - non fa `await uploadTask` direttamente, ma wrappa in Promise.

### 3. Path Storage Esistenti
- Video lezioni: `courses/{courseId}/lessons/{lessonId}/video.mp4` (riga 188)
- Pattern da usare per cover: `courses/covers/{timestamp}-{filename}`
- Pattern da usare per preview: `courses/previews/{timestamp}-{filename}`

### 4. Conclusione Upload Pattern

**Pattern da riusare**:
- ✅ Usare `uploadBytesResumable` per video (grandi file)
- ✅ Usare `uploadBytes` per immagini (piccole, Promise vera)
- ✅ Wrappare `uploadBytesResumable` in Promise con `on("state_changed")`
- ✅ Path: `courses/covers/` e `courses/previews/` (sotto `/courses/**` già permesso dalle rules)

---

## C) VERIFICA FIREBASE STORAGE RULES

### 1. File Rules (storage.rules)
- ✅ **Esiste**: `storage.rules` (root del progetto)
- ✅ **Helper isAdmin()**: Esiste (righe 6-8):
  ```javascript
  function isAdmin() {
    return request.auth != null && 
      firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
  }
  ```

### 2. Permessi Esistenti (storage.rules, righe 36-39)
```javascript
match /courses/{allPaths=**} {
  allow read: if request.auth != null; // Utenti autenticati
  allow write: if isAdmin(); // Solo admin
}
```

### 3. Analisi
- ✅ **Path `/courses/**` già configurato** per write admin
- ✅ **Helper `isAdmin()` già definito**
- ✅ **Read pubblico** per utenti autenticati (OK per Academy pubblica)
- ✅ **Write solo admin** (OK per upload)

### 4. Conclusione Storage Rules

**Le rules sono GIÀ CORRETTE** per:
- ✅ Upload cover: `courses/covers/**` → permesso (sotto `/courses/**`)
- ✅ Upload preview: `courses/previews/**` → permesso (sotto `/courses/**`)
- ✅ Upload video lezioni: `courses/{courseId}/lessons/**` → permesso (sotto `/courses/**`)

**Nessuna modifica necessaria alle storage rules.**

---

## RIEPILOGO FINALE

### Categorie
- **Problema**: Probabilmente DB vuoto o index mancante
- **Fix necessario**: 
  1. Aggiungere error handling nel client (500, vuoto, loading)
  2. Verificare che esistano categorie con `isActive: true` e `order` numerico
  3. Se serve index, loggare errore server-side

### Upload
- **Pattern**: ✅ Corretto, da riusare
- **Rules**: ✅ Già configurate correttamente
- **Fix necessario**: 
  1. Implementare upload cover/preview con toggle URL/File
  2. Usare `uploadBytes` per immagini, `uploadBytesResumable` per video
  3. Path: `courses/covers/` e `courses/previews/`

### Storage Rules
- **Status**: ✅ Già corrette, nessuna modifica necessaria

---

## PROSSIMI PASSI (FASE 2)

1. **Categorie**: Aggiungere error handling + loading state
2. **Upload**: Implementare toggle URL/File + upload helper
3. **Storage Rules**: Nessuna modifica (già OK)




