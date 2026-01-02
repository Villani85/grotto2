# Accesso Utente e Iscrizione - Live Events

## Panoramica

Il sistema Live Events è **parzialmente pubblico**: gli utenti possono **guardare le dirette senza registrazione**, ma per **partecipare alla chat** devono essere autenticati.

---

## Come Accedere (Login)

### Pagina Login
**URL**: `/auth/login`

**Campi richiesti:**
- Email
- Password

**Flusso:**
1. Utente compila form login
2. Click su "Accedi"
3. `AuthContext.login()` chiama Firebase Auth `signInWithEmailAndPassword`
4. Se successo → redirect a `/area-riservata/dashboard`
5. Se errore → mostra messaggio errore

**Link disponibili:**
- **Header/Navbar**: Bottone "Login" (se non autenticato)
- **Pagina Login**: Link "Registrati ora" → `/auth/register`
- **Pagina Registrazione**: Link "Hai già un account? Accedi" → `/auth/login`

**File**: `app/auth/login/page.tsx`

---

## Come Iscriversi (Registrazione)

### Pagina Registrazione
**URL**: `/auth/register`

**Campi richiesti:**
- Nickname (nome utente)
- Email
- Password (min 8 caratteri)
- Conferma Password
- Checkbox "Accetto Termini di Servizio e Privacy Policy" (obbligatorio)

**Validazioni:**
- Password minimo 8 caratteri
- Password e conferma devono corrispondere
- Email formato valido
- Accettazione termini obbligatoria

**Flusso:**
1. Utente compila form registrazione
2. Validazione client-side
3. Click su "Registrati"
4. `AuthContext.register()` chiama Firebase Auth `createUserWithEmailAndPassword`
5. Crea profilo in Firestore (`users/{uid}`) con:
   - `email`, `nickname`
   - `pointsTotal: 0`
   - `subscriptionStatus: "none"`
   - `isAdmin: false` (tranne primo utente o email in `ADMIN_EMAILS`)
   - `createdAt`, `updatedAt` (server timestamp)
6. Se successo → redirect a `/area-riservata/dashboard`
7. Se errore → mostra messaggio errore

**Link disponibili:**
- **Homepage**: Bottone "Inizia Gratuitamente" → `/auth/register`
- **Header/Navbar**: Bottone "Registrati" (se non autenticato)
- **Pagina Login**: Link "Registrati ora" → `/auth/register`

**File**: `app/auth/register/page.tsx`

---

## Accesso a Live Events

### Guardare Live (Pubblico - No Login)

**URL**: `/live` o `/live/[slug]`

**Accesso:**
- ✅ **Nessuna autenticazione richiesta**
- ✅ Chiunque può accedere e guardare lo stream
- ✅ Player IVS carica automaticamente il `playbackUrl` dell'evento

**Flusso:**
1. Utente visita `/live`
2. Sistema chiama `/api/live-events/active` (pubblico, no auth)
3. Se evento attivo + pubblicato → redirect automatico a `/live/[slug]`
4. Se nessun evento → mostra "Nessuna diretta in corso"
5. Pagina `/live/[slug]` carica:
   - Titolo evento
   - Player IVS con stream
   - Chat (se abilitata)

**File**: 
- `app/live/page.tsx` (redirect)
- `app/live/[slug]/page.tsx` (watch page)
- `components/live/LivePlayer.tsx` (player)

---

## Partecipare alla Chat (Richiede Login)

### Chat Live Events

**Requisiti:**
- ✅ Utente deve essere **autenticato** (login)
- ✅ Evento deve essere **pubblicato** e **chat abilitata**

**Flusso:**
1. Utente visita `/live/[slug]`
2. Se **non autenticato**:
   - Chat mostra: "Accedi per partecipare alla chat"
   - Link a `/auth/login` (implicito, utente deve fare login manualmente)
3. Se **autenticato**:
   - Chat mostra input + lista messaggi
   - Realtime: Firestore `onSnapshot` su `live_events/{eventId}/chat`
   - Fallback: polling ogni 5s se realtime fallisce
   - Rate limit: 30 messaggi/minuto

**Invio Messaggio:**
- POST `/api/live-events/[slug]/chat` con `Authorization: Bearer <token>`
- Validazione: testo 1-280 caratteri
- Rate limiting: `checkRateLimit(uid, 30, 60000)`

**File**: 
- `components/live/LiveChat.tsx`
- `app/api/live-events/[slug]/chat/route.ts`

---

## Flusso Completo Utente

### Scenario 1: Utente Non Registrato Vuole Guardare Live

1. Visita homepage → vede bottone "Inizia Gratuitamente" (opzionale)
2. Va direttamente a `/live` (o link condiviso `/live/[slug]`)
3. **Può guardare lo stream senza login**
4. Se vuole chattare:
   - Vede messaggio "Accedi per partecipare alla chat"
   - Clicca su "Login" in navbar → `/auth/login`
   - Oppure va a `/auth/register` per registrarsi
   - Dopo login → può chattare

### Scenario 2: Utente Vuole Registrarsi Prima

1. Homepage → "Inizia Gratuitamente" → `/auth/register`
2. Oppure Header → "Registrati" → `/auth/register`
3. Compila form (nickname, email, password)
4. Accetta termini
5. Submit → creazione account Firebase + profilo Firestore
6. Redirect a `/area-riservata/dashboard`
7. Può navigare a `/live` e partecipare alla chat

### Scenario 3: Utente Già Registrato

1. Header → "Login" → `/auth/login`
2. Inserisce email + password
3. Submit → autenticazione Firebase
4. Redirect a `/area-riservata/dashboard`
5. Può navigare a `/live` e partecipare alla chat

---

## Link e Navigazione

### Header/Navbar (`components/layout/Header.tsx`)

**Se NON autenticato:**
- Link "Login" → `/auth/login`
- Bottone "Registrati" → `/auth/register`

**Se autenticato:**
- Avatar + nickname + livello
- Link "Logout"
- Se admin: bottone "Admin" → `/admin/users`

### Homepage (`app/page.tsx`)

**Se NON autenticato:**
- Bottone "Inizia Gratuitamente" → `/auth/register`
- Bottone "Scopri di più" → `/marketing/come-funziona`

**Se autenticato:**
- Bottone "Vai alla Dashboard" → `/area-riservata/dashboard`

### Pagine Auth

**Login (`/auth/login`):**
- Link "Registrati ora" → `/auth/register`
- Link "Password dimenticata?" → `/auth/forgot-password` (se implementato)

**Registrazione (`/auth/register`):**
- Link "Hai già un account? Accedi" → `/auth/login`

---

## Autenticazione Tecnica

### Firebase Auth
- **Provider**: Firebase Authentication
- **Metodo**: Email/Password
- **Storage**: Token JWT in localStorage (gestito da Firebase SDK)

### Firestore User Profile
- **Collection**: `users/{uid}`
- **Campi principali**:
  - `email`, `nickname`, `avatarUrl`
  - `pointsTotal`, `neuroCredits_total`
  - `subscriptionStatus` ("none" | "active" | "cancelled" | "expired")
  - `isAdmin` (boolean)
  - `createdAt`, `updatedAt` (server timestamp)

### Context Provider
- **File**: `context/AuthContext.tsx`
- **Hook**: `useAuth()` → `{ user, login, register, logout, isLoading }`
- **Auto-sync**: `onAuthStateChanged` sincronizza stato Firebase ↔ Firestore

---

## Sicurezza e Permessi

### Live Events (Pubblico)
- ✅ **GET `/api/live-events/active`**: Nessuna auth richiesta
- ✅ **GET `/api/live-events/[slug]`**: Nessuna auth richiesta (solo se `published: true`)
- ✅ **Pagina `/live/[slug]`**: Accessibile senza login

### Chat (Autenticata)
- ✅ **GET `/api/live-events/[slug]/chat`**: Nessuna auth (messaggi pubblici)
- 🔒 **POST `/api/live-events/[slug]/chat`**: `requireAuth` (solo utenti loggati)
- 🔒 **Firestore Rules**: 
  - Read chat: autenticati + evento pubblicato
  - Write chat: autenticati + evento pubblicato + chat abilitata
  - Delete chat: solo admin

---

## Messaggi UX per Utente Non Autenticato

### Chat Live Events
**Messaggio mostrato**: "Accedi per partecipare alla chat"

**Azione suggerita**:
- Utente può cliccare "Login" in navbar
- Oppure andare manualmente a `/auth/login` o `/auth/register`

**Nota**: Attualmente non c'è un link diretto nel messaggio. Potrebbe essere aggiunto in futuro.

---

## Riepilogo Accessi

| Funzionalità | Login Richiesto | Note |
|--------------|-----------------|------|
| Guardare Live (`/live/[slug]`) | ❌ No | Pubblico, nessuna auth |
| Partecipare Chat | ✅ Sì | Richiede login |
| Creare Eventi Live | ✅ Sì (Admin) | Solo admin via `/admin/live-events` |
| Broadcast Live | ✅ Sì (Admin) | Solo admin via `/admin/live` |

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-XX  
**Author**: AI Code Assistant (Cursor)


