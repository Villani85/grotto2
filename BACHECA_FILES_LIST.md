# Bacheca - Elenco File Creati/Modificati

## File Creati (NUOVI)

### Helper e Validazione
1. **lib/auth-server.ts** - Helper per autenticazione server-side
2. **lib/validations.ts** - Validazione Zod e rate limiting

### API Routes
3. **app/api/posts/route.ts** - GET (lista) e POST (crea) post
4. **app/api/posts/[postId]/route.ts** - GET dettaglio post
5. **app/api/posts/[postId]/like/route.ts** - POST (like) e DELETE (unlike)
6. **app/api/posts/[postId]/like/status/route.ts** - GET stato like
7. **app/api/posts/[postId]/comments/route.ts** - GET (lista) e POST (crea) commenti
8. **app/api/posts/[postId]/comments/[commentId]/route.ts** - DELETE commento

### Componenti UI
9. **components/posts/PostComposer.tsx** - Form creazione post
10. **components/posts/PostCard.tsx** - Card visualizzazione post
11. **components/posts/LikeButton.tsx** - Pulsante like/unlike
12. **components/posts/CommentComposer.tsx** - Form creazione commento
13. **components/posts/CommentsList.tsx** - Lista commenti

### Pagine
14. **app/bacheca/page.tsx** - Home bacheca (lista post)
15. **app/bacheca/[postId]/page.tsx** - Dettaglio post con commenti

### Documentazione
16. **BACHECA_IMPLEMENTATION.md** - Documentazione completa implementazione
17. **BACHECA_FILES_LIST.md** - Questo file

## File Modificati

1. **app/area-riservata/dashboard/page.tsx** - Aggiunto link "Bacheca" nelle quick actions
2. **firestore.rules** - Aggiunte regole per posts, likes e comments subcollections

## Dipendenze Aggiunte

- `zod` - Validazione input
- `date-fns` - Formattazione date

## Schema Firestore

### Collection: `posts`
- `authorId` (string) - UID autore (dal token)
- `authorName` (string) - Nome autore
- `authorAvatarUrl` (string | null) - Avatar autore
- `text` (string) - Testo post
- `createdAt` (Timestamp) - Data creazione
- `likesCount` (number) - Contatore like
- `commentsCount` (number) - Contatore commenti

### Subcollection: `posts/{postId}/likes/{likerUid}`
- `createdAt` (Timestamp) - Data like
- Document ID = `likerUid` (per query rapide)

### Subcollection: `posts/{postId}/comments/{commentId}`
- `authorId` (string) - UID autore (dal token)
- `authorName` (string) - Nome autore
- `authorAvatarUrl` (string | null) - Avatar autore
- `text` (string) - Testo commento (max 500)
- `createdAt` (Timestamp) - Data creazione

## Endpoint API

- `GET /api/posts?limit=20&cursor=...` - Lista post
- `POST /api/posts` - Crea post (richiede auth)
- `GET /api/posts/[postId]` - Dettaglio post
- `POST /api/posts/[postId]/like` - Aggiungi like (richiede auth)
- `DELETE /api/posts/[postId]/like` - Rimuovi like (richiede auth)
- `GET /api/posts/[postId]/like/status` - Verifica stato like (richiede auth)
- `GET /api/posts/[postId]/comments?limit=50` - Lista commenti
- `POST /api/posts/[postId]/comments` - Aggiungi commento (richiede auth)
- `DELETE /api/posts/[postId]/comments/[commentId]` - Elimina commento (richiede auth, solo autore)

## Caratteristiche Implementate

✅ Post con testo (max 5000 caratteri)  
✅ Like/Unlike con toggle  
✅ Blocco self-like (400 se autore cerca di mettere like)  
✅ Like idempotente (chiamate multiple non causano errori)  
✅ Commenti (max 500 caratteri)  
✅ Contatori aggiornati con transaction  
✅ Validazione Zod  
✅ Rate limiting (30 req/min per like/comment)  
✅ Autenticazione server-side con Firebase Admin  
✅ `authorId` sempre dal token, mai dal body  
✅ Eliminazione commento solo per autore  
✅ UI con loading states e error handling  
✅ Paginazione post  
✅ Optimistic UI per like  

## Test Manuale

1. ✅ Utente A pubblica post → visibile in lista e dettaglio
2. ✅ Utente B mette like → likesCount +1
3. ✅ Utente B toglie like → likesCount -1
4. ✅ Utente A non può mettere like al proprio post (400)
5. ✅ Commenti aggiunti compaiono subito e commentsCount si aggiorna
6. ✅ Nessuna route accetta userId dal body: sempre dal token

## Note

- Tutte le scritture passano da API Route server-side
- Tutte le validazioni avvengono server-side
- Firestore Rules aggiornate per supportare la nuova struttura
- Componenti UI completamente client-side con fetch autenticato




