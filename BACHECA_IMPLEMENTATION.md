# Implementazione Bacheca - Documentazione Completa

## File Creati/Modificati

### 1. Helper Server-Side

#### `lib/auth-server.ts` (NUOVO)
- `verifyIdToken(request)`: Verifica token Firebase ID dal header Authorization
- `requireAuth(request)`: Richiede autenticazione (lancia errore se non autenticato)
- Usa Firebase Admin SDK per validazione server-side

#### `lib/validations.ts` (NUOVO)
- `createPostSchema`: Validazione Zod per creazione post (min 1, max 5000 caratteri)
- `createCommentSchema`: Validazione Zod per commenti (min 1, max 500 caratteri)
- `checkRateLimit()`: Rate limiting semplice in-memory (30 richieste/minuto per uid)

### 2. API Routes (Server-Side)

#### `app/api/posts/route.ts` (NUOVO)
- **GET**: Lista post con paginazione (limit, cursor)
- **POST**: Crea nuovo post (richiede auth, valida con Zod)
- Recupera user info da Firestore (nickname, avatar)
- **Sicurezza**: `authorId` sempre dal token, mai dal body

#### `app/api/posts/[postId]/route.ts` (NUOVO)
- **GET**: Dettaglio singolo post

#### `app/api/posts/[postId]/like/route.ts` (NUOVO)
- **POST**: Aggiungi like
  - Blocca self-like (400 se likerUid == authorId)
  - Idempotente: se like esiste già, non fa nulla
  - Usa transaction per consistenza (crea like + incrementa counter)
- **DELETE**: Rimuovi like
  - Idempotente: se like non esiste, non fa nulla
  - Usa transaction per consistenza (elimina like + decrementa counter)

#### `app/api/posts/[postId]/like/status/route.ts` (NUOVO)
- **GET**: Verifica se utente ha messo like al post
- Usato dal client per inizializzare stato del LikeButton

#### `app/api/posts/[postId]/comments/route.ts` (NUOVO)
- **GET**: Lista commenti ordinati per createdAt ASC
- **POST**: Aggiungi commento
  - Valida con Zod (max 500 caratteri)
  - Usa transaction per consistenza (crea commento + incrementa counter)
  - **Sicurezza**: `authorId` sempre dal token

#### `app/api/posts/[postId]/comments/[commentId]/route.ts` (NUOVO)
- **DELETE**: Elimina commento
  - Solo l'autore può eliminare (403 se non autorizzato)
  - Usa transaction per consistenza (elimina commento + decrementa counter)

### 3. Componenti UI Client-Side

#### `components/posts/PostComposer.tsx` (NUOVO)
- Form per creare nuovo post
- Validazione client-side (max 5000 caratteri)
- Invia token Firebase nell'header Authorization
- Toast per feedback utente
- Callback `onPostCreated` per refresh lista

#### `components/posts/PostCard.tsx` (NUOVO)
- Card per visualizzare post in lista
- Mostra: autore (avatar + nome), testo, data, likesCount, commentsCount
- Link a profilo utente e dettaglio post
- Integra LikeButton

#### `components/posts/LikeButton.tsx` (NUOVO)
- Pulsante like/unlike con toggle
- Verifica stato iniziale via API `/like/status`
- Optimistic UI update
- Disabilitato se utente = autore
- Mostra count aggiornato

#### `components/posts/CommentComposer.tsx` (NUOVO)
- Form per aggiungere commento
- Validazione client-side (max 500 caratteri)
- Invia token Firebase nell'header Authorization
- Callback `onCommentAdded` per refresh lista

#### `components/posts/CommentsList.tsx` (NUOVO)
- Lista commenti ordinata per data
- Mostra: autore (avatar + nome), testo, data
- Pulsante elimina solo per autore del commento
- Loading state e empty state

### 4. Pagine

#### `app/bacheca/page.tsx` (NUOVO)
- Home bacheca con lista post
- PostComposer in cima
- Paginazione con "Carica altri post"
- Refresh manuale
- Gestione stati: loading, empty, error

#### `app/bacheca/[postId]/page.tsx` (NUOVO)
- Dettaglio post completo
- PostCard con LikeButton
- Sezione commenti con CommentComposer e CommentsList
- Link per tornare alla bacheca

### 5. Modifiche a File Esistenti

#### `app/area-riservata/dashboard/page.tsx` (MODIFICATO)
- Aggiunto link "Bacheca" nelle quick actions

## Schema Firestore

### Collection: `posts`
```typescript
{
  authorId: string          // UID dal token (mai dal body)
  authorName: string        // nickname o email da Firestore users
  authorAvatarUrl: string | null
  text: string              // Testo del post
  createdAt: Timestamp
  likesCount: number        // Aggiornato con transaction
  commentsCount: number     // Aggiornato con transaction
}
```

### Subcollection: `posts/{postId}/likes`
```typescript
{
  createdAt: Timestamp
}
// Document ID = likerUid (per query rapide)
```

### Subcollection: `posts/{postId}/comments`
```typescript
{
  authorId: string          // UID dal token (mai dal body)
  authorName: string        // nickname o email da Firestore users
  authorAvatarUrl: string | null
  text: string              // Testo commento (max 500)
  createdAt: Timestamp
}
```

## Firestore Rules (da aggiungere)

```javascript
// Posts
match /posts/{postId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && 
                 request.resource.data.authorId == request.auth.uid;
  allow update: if isAdmin(); // Solo admin può modificare
  allow delete: if isAdmin(); // Solo admin può eliminare
  
  // Likes
  match /likes/{likerUid} {
    allow read: if isAuthenticated();
    allow create: if isAuthenticated() && 
                   request.resource.data.createdAt != null &&
                   likerUid == request.auth.uid;
    allow delete: if isAuthenticated() && 
                   likerUid == request.auth.uid;
  }
  
  // Comments
  match /comments/{commentId} {
    allow read: if isAuthenticated();
    allow create: if isAuthenticated() && 
                   request.resource.data.authorId == request.auth.uid &&
                   request.resource.data.text.size() <= 500;
    allow delete: if isAuthenticated() && 
                   (resource.data.authorId == request.auth.uid || isAdmin());
  }
}
```

## Sicurezza Implementata

✅ **Autenticazione**: Tutte le route di scrittura richiedono token Firebase ID  
✅ **Autorizzazione**: `authorId` sempre dal token, mai dal body  
✅ **Validazione**: Zod per input validation (post max 5000, comment max 500)  
✅ **Rate Limiting**: 30 richieste/minuto per uid (like/comment)  
✅ **Self-Like Block**: 400 se utente cerca di mettere like al proprio post  
✅ **Idempotenza**: Like/Unlike non falliscono se già esistenti/non esistenti  
✅ **Transazioni**: Tutti i contatori (likesCount, commentsCount) aggiornati con transaction  
✅ **Delete Protection**: Solo autore può eliminare commento (403 se non autorizzato)  

## Flusso Completo

### Creazione Post
1. Utente compila form → `PostComposer`
2. Client ottiene token → `getFirebaseIdToken()`
3. POST `/api/posts` con token in header
4. Server verifica token → `requireAuth()`
5. Server valida input → `createPostSchema.parse()`
6. Server recupera user info da Firestore
7. Server crea post in Firestore con `authorId` dal token
8. Client aggiorna lista (refresh o aggiunge in cima)

### Like/Unlike
1. Utente clicca LikeButton
2. Client verifica: utente autenticato? autore diverso?
3. POST/DELETE `/api/posts/[postId]/like` con token
4. Server verifica token e blocca self-like
5. Server usa transaction:
   - Verifica esistenza like
   - Crea/elimina like
   - Incrementa/decrementa `likesCount`
6. Client aggiorna UI (optimistic update)

### Commento
1. Utente compila form → `CommentComposer`
2. POST `/api/posts/[postId]/comments` con token
3. Server verifica token e valida input
4. Server usa transaction:
   - Crea commento
   - Incrementa `commentsCount`
5. Client aggiorna lista commenti

## Dipendenze Aggiunte

```json
{
  "zod": "^3.x.x",
  "date-fns": "^2.x.x"
}
```

## Test Manuale

### ✅ Test 1: Creazione Post
- [ ] Utente A pubblica post → visibile in lista e dettaglio
- [ ] Post salvato in Firestore con `authorId` corretto

### ✅ Test 2: Like
- [ ] Utente B mette like → `likesCount` +1
- [ ] Click di nuovo → like rimosso, `likesCount` -1
- [ ] Utente A non può mettere like al proprio post (400)

### ✅ Test 3: Commenti
- [ ] Commento aggiunto → compare subito in lista
- [ ] `commentsCount` si aggiorna correttamente
- [ ] Solo autore può eliminare commento

### ✅ Test 4: Sicurezza
- [ ] Nessuna route accetta `userId` dal body
- [ ] Token mancante → 401
- [ ] Input invalido → 400 con messaggio Zod
- [ ] Rate limit → 429 dopo 30 richieste/minuto

## Note Implementative

1. **Transazioni Firestore**: Tutti gli aggiornamenti ai contatori usano `runTransaction()` per garantire consistenza
2. **Idempotenza**: Like/Unlike sono idempotenti (chiamate multiple non causano errori)
3. **Optimistic UI**: LikeButton aggiorna UI immediatamente, poi sincronizza con server
4. **Error Handling**: Tutti gli errori mostrano toast informativi all'utente
5. **Loading States**: Tutti i componenti mostrano stati di loading appropriati

## Prossimi Passi (Opzionali)

- [ ] Aggiungere infinite scroll invece di "Carica altri post"
- [ ] Aggiungere editing post (solo autore)
- [ ] Aggiungere notifiche per like/commenti
- [ ] Aggiungere immagini ai post
- [ ] Aggiungere hashtag/mentions
- [ ] Migliorare rate limiting con Redis in produzione




