# ⚠️ IMPORTANTE: Aggiorna le Regole Firestore

## Errore "Missing or insufficient permissions"

L'errore indica che le regole Firestore non permettono le query sulla collection `posts`.

## 🔧 Soluzione Immediata

### Usa le Regole Semplificate (Consigliato per Sviluppo)

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto `v0-membership-prod`
3. Vai su **Firestore Database** → **Rules**
4. **Copia e incolla** il contenuto del file `firestore.rules.simple` che ho aggiornato
5. Clicca **Publish**

### Cosa Ho Aggiunto

Ho aggiunto `allow list: if isAuthenticated();` alle regole per permettere le query sulla collection `posts`.

**Prima:**
```javascript
match /posts/{postId} {
  allow read: if isAuthenticated();  // Solo per documenti singoli
  // ...
}
```

**Dopo:**
```javascript
match /posts/{postId} {
  allow read: if isAuthenticated();  // Per documenti singoli
  allow list: if isAuthenticated();  // ✅ PER QUERY/COLLECTION
  // ...
}
```

## 📋 Differenza tra `read` e `list`

- **`read`**: Permette di leggere un documento specifico (es. `getDoc()`)
- **`list`**: Permette di fare query sulla collection (es. `getDocs()`, `query()`)

Per la community, serve `list` perché facciamo query per ottenere tutti i post.

## ✅ Dopo l'Aggiornamento

Dopo aver pubblicato le regole aggiornate:
1. Ricarica la pagina community
2. Dovresti vedere i post reali da Firestore
3. Non dovresti più vedere errori di permessi

## 🔍 Verifica

Controlla la console del browser:
- `[Community] Loaded posts from Firestore: X` - Post caricati
- `[Firestore] Loaded X published posts from Firestore` - Conferma
- Nessun errore "Missing or insufficient permissions"





