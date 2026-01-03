# Esempio: Prompt per Fix Password Reset

**Data**: 2026-01-03  
**Contesto**: Race condition Firebase init in forgot-password  
**Tipo**: Fix bug + miglioramento UX

---

## Prompt per Cursor (COPIA/INCOLLA)

```markdown
Sei Cursor nel repo. PRIMA DI QUALSIASI MODIFICA devi salvare lo stato attuale su GitHub, anche se la feature "recupera password" è buggata: serve come punto di ripristino.

OBIETTIVO: Fixare la race condition di Firebase init in /auth/forgot-password, migliorare UX e logging.

VINCOLI:
- NON cambiare la signature di getFirebaseAuth() (rimane sync)
- NON fare refactor globale di firebase-client.ts
- Modifica SOLO ciò che serve per rendere "forgot-password" robusto
- Niente "workaround" silenziosi: voglio log e messaggi chiari
- Prima di committare: deve passare `npm run build` (obbligatorio)

CONTESTO PROBLEMA:
- In /auth/forgot-password l'utente può cliccare "Invia" prima che Firebase abbia finito di inizializzarsi
- getFirebaseAuth() può tornare null -> "Servizio non disponibile"
- currentUser null è normale e NON c'entra: reset password non richiede login

FASE 0 — SNAPSHOT SU GITHUB (OBBLIGATORIA)
1) Mostrami la situazione:
   - `git status`
   - `git branch --show-current`
   - `git log -5 --oneline`
   - `git remote -v`

2) Crea branch snapshot e committa TUTTO lo stato attuale:
   - `git checkout -b snapshot/password-reset-pre-fix-YYYYMMDD-HHMM`
   - `git add -A`
   - `git commit -m "chore: snapshot pre password-reset fix"`
   - `git push -u origin snapshot/password-reset-pre-fix-YYYYMMDD-HHMM`

3) Verifica che lo snapshot sia su GitHub:
   - `git ls-remote --heads origin | grep snapshot/password-reset-pre-fix`

FASE 1 — IMPLEMENTAZIONE FIX
Apri `app/auth/forgot-password/page.tsx` e implementa:

A) useEffect per pre-inizializzare Firebase:
   - importa `initializeFirebase` da `@/lib/firebase-client`
   - al mount esegui `initializeFirebase()` e gestisci state `isFirebaseReady`
   - se init fallisce, mostra errore leggibile

B) Retry logic in `handleSubmit`:
   - prima di chiamare getFirebaseAuth(), esegui `await initializeFirebase()`
   - poi tenta di ottenere auth con retry: max 3 tentativi, wait 400-600ms
   - se ancora auth è null: mostra errore "Servizio non disponibile, riprova tra qualche secondo."

C) UX:
   - disabilita il bottone se: email vuota/invalida, isSubmitting true, isFirebaseReady false
   - mostra "Sto preparando il servizio..." se isFirebaseReady è false
   - mantieni toast/messaggi coerenti

D) Logging DEV:
   - quando l'utente clicca invio: console.log("[ForgotPassword] submit start", { emailMasked })
   - quando init è pronta: console.log("[ForgotPassword] firebase ready")
   - in catch: console.error("[ForgotPassword] reset error", { code, message })

E) Error mapping:
   - gestisci: auth/user-not-found, auth/invalid-email, auth/too-many-requests
   - fallback: messaggio generico, ma non perdere err.code

FASE 2 — VERIFICA
- Verifica che NON usi mai auth.currentUser.email per inviare reset
- Verifica routing: /auth/forgot-password deve restare raggiungibile da /auth/login

FASE 3 — TEST OBBLIGATORI (prima del commit)
- Avvia dev e prova:
  - subito dopo load pagina: inserisci email e clicca immediatamente -> deve funzionare
  - email invalida -> errore chiaro
  - email non esistente -> errore chiaro
  - molte richieste -> messaggio "troppi tentativi"
- Esegui: `npm run build` e assicurati che PASSI

FASE 4 — COMMIT (solo se tutto passa)
- `git status` deve mostrare SOLO i file necessari
- `git commit -m "fix: robust password reset (firebase init + retry)"`
- `git push` sul branch corrente

OUTPUT ATTESO:
- Elenco file modificati
- Spiegazione breve di cosa hai cambiato
- Risultato dei test (build pass/fail)
- Comando git usato (commit + push)
```

---

## Checklist Rapida

- [ ] Snapshot Git creato e pushato
- [ ] useEffect per pre-inizializzazione Firebase implementato
- [ ] Retry logic in handleSubmit con max 3 tentativi
- [ ] Bottone disabilitato quando necessario
- [ ] Messaggio "Sto preparando il servizio..." visibile
- [ ] Logging DEV implementato (submit start, firebase ready, error)
- [ ] Error mapping per auth/user-not-found, auth/invalid-email, auth/too-many-requests
- [ ] Verificato che NON usa auth.currentUser.email
- [ ] Routing /auth/forgot-password funziona
- [ ] Test manuali: race condition risolta
- [ ] `npm run build` PASS
- [ ] Commit e push completati

---

## Risultato Atteso

**File modificati**: `app/auth/forgot-password/page.tsx`  
**Righe**: +131 inserimenti, -13 eliminazioni  
**Build**: PASS  
**Commit**: `1c8a3be` - "fix: robust password reset (firebase init + retry)"
