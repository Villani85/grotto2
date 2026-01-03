# ✅ SOLUZIONE NEUROCREDITS - Guida Rapida

## 🎯 PROBLEMA IDENTIFICATO

**Modalità Demo Attiva** - Le variabili d'ambiente Firebase non sono configurate.

## 🚀 SOLUZIONE RAPIDA

### 1. Apri il file `.env.local`

### 2. Aggiungi queste variabili (sostituisci con i tuoi valori):

```env
# Firebase Client (da Firebase Console → Impostazioni progetto → App web)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tuo-progetto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tuo-progetto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tuo-progetto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (da Firebase Console → Impostazioni progetto → Account di servizio)
# Scarica il file JSON e copia i valori
FIREBASE_ADMIN_PROJECT_ID=tuo-progetto-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tuo-progetto.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 3. Riavvia il server

```bash
# Ferma il server (Ctrl+C)
npm run dev
```

### 4. Verifica

Esegui:
```bash
npx tsx scripts/diagnose-neurocredits.ts
```

Dovresti vedere:
- ✅ `isDemoMode: false`
- ✅ `hasFirebaseClientConfig: true`
- ✅ `hasFirebaseAdminConfig: true`
- ✅ `Firebase Admin inizializzato con successo`

### 5. Testa

1. Crea un post → Dovresti ricevere +2 NeuroCredits
2. Vai su `/neurocredits` → Dovresti vedere i tuoi NeuroCredits aggiornati

---

## 📖 DOVE TROVARE LE CREDENZIALI

### Firebase Client:
1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto
3. Vai su ⚙️ **Impostazioni progetto**
4. Scorri fino a **Le tue app**
5. Seleziona l'app web (o creane una)
6. Copia i valori dalla sezione "Configurazione SDK"

### Firebase Admin:
1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto
3. Vai su ⚙️ **Impostazioni progetto**
4. Tab **Account di servizio**
5. Clicca su **Genera nuova chiave privata**
6. Scarica il file JSON
7. Copia:
   - `project_id` → `FIREBASE_ADMIN_PROJECT_ID`
   - `client_email` → `FIREBASE_ADMIN_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_ADMIN_PRIVATE_KEY` (con virgolette e `\n`)

---

**Una volta configurato, i NeuroCredits funzioneranno immediatamente!** 🎉
