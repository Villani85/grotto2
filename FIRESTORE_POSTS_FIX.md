# 🔧 Fix Post Visibility - Regole Firestore

## Problema
I post creati non sono visibili ad altri membri a causa di errori "Missing or insufficient permissions".

## Soluzione Applicata

### 1. Regole Firestore Aggiornate

**File: `firestore.rules`**

Ho separato `allow read` in `allow get` e `allow list`:
- `allow get`: Per lettura di documenti singoli (controlla `published == true`)
- `allow list`: Per query sulla collection (necessario per `getDocs()` con filtri)

**Prima:**
```javascript
allow read: if isAuthenticated() && 
             (resource.data.published == true || isAdmin());
allow list: if isAuthenticated();
```

**Dopo:**
```javascript
allow get: if isAuthenticated() && 
            (resource.data.published == true || isAdmin() || !('published' in resource.data));
allow list: if isAuthenticated(); // Permette tutte le query
```

### 2. Regole Semplificate Aggiornate

**File: `firestore.rules.simple`**

Aggiornate per sviluppo con regole più permissive:
- `allow get`: Permette lettura di tutti i post (per sviluppo)
- `allow list`: Permette query sulla collection
- `allow create`: Richiede `published == true`

### 3. Query Firestore Migliorate

**File: `lib/firestore-posts.ts`**

Migliorata gestione errori e logging:
- Prova prima con `where + orderBy`
- Se fallisce (no index), prova solo `where`
- Se fallisce, query tutti i post e filtra in memoria
- Logging dettagliato per debug

## ⚠️ AZIONE RICHIESTA

### Aggiorna le Regole Firestore

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto `v0-membership-prod`
3. Vai su **Firestore Database** → **Rules**
4. **Copia e incolla** il contenuto del file `firestore.rules.simple` (per sviluppo) o `firestore.rules` (per produzione)
5. Clicca **Publish**

### Crea Indice Composito (Opzionale ma Consigliato)

Se vuoi usare `where + orderBy` insieme, crea un indice:

1. Vai su **Firestore Database** → **Indexes**
2. Clicca **Create Index**
3. Collection: `posts`
4. Fields:
   - `published` (Ascending)
   - `createdAt` (Descending)
5. Clicca **Create**

**Oppure** clicca sul link nell'errore quando appare nella console.

## Verifica

Dopo aver aggiornato le regole:

1. Crea un nuovo post
2. Verifica che appaia nella lista
3. Verifica che altri utenti possano vederlo
4. Controlla la console per errori

## Debug

Controlla la console per vedere:
- `[Firestore] Query with where + orderBy successful` - Query riuscita
- `[Firestore] orderBy failed, trying without orderBy` - Fallback senza orderBy
- `[Firestore] where failed, querying all posts and filtering` - Fallback con filtro in memoria
- `[Firestore] Post created: [id]` - Post creato correttamente
- `[Community] Loaded posts from Firestore: X` - Post caricati

## Note

- Le regole `allow list` permettono query sulla collection
- Il filtro `published == true` viene applicato nel codice anche se la query fallisce
- I post vengono sempre creati con `published: true`





