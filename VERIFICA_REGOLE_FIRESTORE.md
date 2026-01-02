# ✅ Verifica Regole Firestore - Checklist

## 🚨 Se Vedi Ancora "Permission Denied"

### Step 1: Verifica che le Regole Siano Pubblicate

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto **`v0-membership-prod`**
3. Vai su **Firestore Database** → **Rules** (sidebar sinistra)
4. Controlla che le regole contengano:

```javascript
match /posts/{postId} {
  allow read: if isAuthenticated();
  // ... altre regole
}
```

**IMPORTANTE**: Deve essere `allow read` (non `allow get` + `allow list` separati)

### Step 2: Pubblica le Regole Corrette

Se le regole non sono corrette o non sono pubblicate:

1. **Copia** il contenuto completo di `firestore.rules.development` (o `firestore.rules.simple`)
2. **Incolla** nella console Firebase
3. Clicca **Publish**
4. Attendi il messaggio di conferma
5. **Attendi 30 secondi** per la propagazione
6. **Ricarica** la pagina community

### Step 3: Verifica Autenticazione

Controlla nella console del browser:

```
[Firebase] ✅ Auth instance available: {hasAuth: true, currentUser: "uid", email: "email"}
[Firestore] ✅ User authenticated: {uid: "...", email: "..."}
```

Se vedi `[Firestore] ❌ User not authenticated`, il problema è l'autenticazione, non le regole.

### Step 4: Test Query

Dopo aver pubblicato le regole, dovresti vedere:

```
[Firestore] ✅ Query all posts successful, got X documents
[Community] ✅ Loaded posts from Firestore: X
```

Se vedi ancora errori, controlla:
- Che il progetto Firebase sia corretto
- Che l'utente sia autenticato (non in demo mode)
- Che le regole siano state pubblicate (non solo salvate come draft)

## 🔍 Debug Avanzato

### Controlla le Regole Attuali

Nella console Firebase, le regole per `posts` dovrebbero essere:

```javascript
match /posts/{postId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && 
                 request.resource.data.userId == request.auth.uid &&
                 request.resource.data.published == true;
  allow update: if isAuthenticated() && 
                 isOwner(resource.data.userId);
  allow delete: if isAuthenticated() && 
                 isOwner(resource.data.userId);
}
```

### Versione Ultra Semplificata (Solo per Test)

Se nulla funziona, prova questa versione minimale:

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

**⚠️ ATTENZIONE**: Questa versione è estremamente permissiva - usa solo per test!

## 📞 Se Nulla Funziona

1. Verifica che il progetto Firebase sia corretto nel `.env.local`
2. Verifica che `NEXT_PUBLIC_FIREBASE_PROJECT_ID` corrisponda al progetto in console
3. Prova a fare logout e login di nuovo
4. Controlla la console per errori di autenticazione





