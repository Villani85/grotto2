# ✅ Test Completo Firestore Rules

## 🎯 Obiettivo
Verificare che le regole Firestore permettano:
1. ✅ Query (lettura) dei post
2. ✅ Creazione di nuovi post
3. ✅ Aggiornamento dei post
4. ✅ Eliminazione dei post

## 📋 Checklist Pre-Test

### 1. Verifica Autenticazione
- [ ] L'utente è autenticato (non in demo mode)
- [ ] Console mostra: `[Firebase] ✅ Auth instance available`
- [ ] Console mostra: `[Firestore] ✅ User authenticated`

### 2. Verifica Regole Pubblicate
- [ ] Vai su Firebase Console → Firestore → Rules
- [ ] Le regole contengono `allow read, write: if request.auth != null;` per posts
- [ ] Le regole sono state **PUBBLICATE** (non solo salvate)
- [ ] Atteso 30 secondi dopo la pubblicazione

## 🧪 Test 1: Query Posts (Lettura)

### Passi:
1. Apri la pagina `/area-riservata/community`
2. Controlla la console del browser

### Risultato Atteso:
```
[Firestore] ✅ User authenticated: {uid: "...", email: "..."}
[Firestore] 📥 Attempting to query posts collection...
[Firestore] ✅ Query all posts successful, got X documents
[Community] ✅ Loaded posts from Firestore: X
```

### ❌ Se Fallisce:
- Verifica che le regole siano pubblicate
- Verifica che l'utente sia autenticato
- Usa `firestore.rules.test` (versione ultra semplificata)

## 🧪 Test 2: Creazione Post

### Passi:
1. Apri la pagina `/area-riservata/community`
2. Compila il form:
   - **Titolo**: "Test Post"
   - **Contenuto**: "Questo è un post di test"
3. Clicca "Pubblica"

### Risultato Atteso:
```
[Community] 📝 Creating post with user: {...}
[Firestore] ✅ User authenticated for post creation: {...}
[Firestore] 📝 Attempting to create post with data: {...}
[Firestore] ✅ Post created successfully: [id]
[Community] ✅ Post created in Firestore: [id]
```

### ❌ Se Fallisce:
- Verifica che l'utente sia autenticato
- Verifica che `userId` corrisponda a `currentUser.uid`
- Verifica che `published` sia `true`
- Controlla errori nella console

## 🧪 Test 3: Visualizzazione Post

### Passi:
1. Dopo aver creato un post, ricarica la pagina
2. Il post dovrebbe essere visibile nella lista

### Risultato Atteso:
- Il post appare nella lista
- Mostra titolo, contenuto, autore
- Mostra data di creazione

## 🧪 Test 4: Eliminazione Post (Admin)

### Passi:
1. Se sei admin, vedi il pulsante "Elimina" sul post
2. Clicca "Elimina"
3. Conferma l'eliminazione

### Risultato Atteso:
```
[Firestore] ✅ Post deleted: [id]
[Community] ✅ Post deleted successfully
```

## 🔧 Regole da Usare

### Per Test Immediato (CONSIGLIATO):
Usa `firestore.rules.test` - versione ultra semplificata:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /posts/{postId} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Per Sviluppo:
Usa `firestore.rules.development` - più strutturato ma ancora permissivo

### Per Produzione:
Usa `firestore.rules` - con controlli admin e validazioni

## ✅ Conferma Finale

Dopo aver completato tutti i test, verifica:

- [ ] ✅ Query posts funziona
- [ ] ✅ Creazione post funziona
- [ ] ✅ Post visibili dopo creazione
- [ ] ✅ Eliminazione post funziona (se admin)
- [ ] ✅ Nessun errore in console
- [ ] ✅ Tutti i log mostrano ✅ (non ❌)

## 🚨 Se Nulla Funziona

1. Verifica progetto Firebase nel `.env.local`
2. Verifica che `NEXT_PUBLIC_FIREBASE_PROJECT_ID` sia corretto
3. Fai logout e login di nuovo
4. Pubblica `firestore.rules.test` (versione minimale)
5. Attendi 60 secondi
6. Ricarica la pagina





