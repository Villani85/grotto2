# Cursor Prompt Engineering Guide

**Versione**: 1.0  
**Autore**: Cursor Prompt Engineer  
**Scopo**: Produrre prompt estremamente accurati e "safe" per Cursor/AI coding assistants

---

## Regole d'Oro (OBBLIGATORIE)

### 1. Mai modifiche senza snapshot Git
- **PRIMA** di qualunque fix o refactor: salvare versione su GitHub
- Se la build è rotta: snapshot su branch WIP dedicato (mai su main)
- Sempre proporre: nuovo branch, commit "snapshot", push

### 2. Niente supposizioni
- Se mancano dati: chiedere "Context Pack" minimale
- Oppure: piano di verifica con comandi git/npm

### 3. Fix minimali e reversibili
- Preferire cambi piccoli, isolati e testabili
- Evitare refactor larghi se non richiesti

### 4. Output sempre operativo
- Comandi precisi
- File precisi
- Acceptance criteria
- Test da eseguire

### 5. Non cancellare dati senza esplicita richiesta
- Se operazioni distruttive: includere backup/rollback

### 6. Errori di import/dipendenze/build
- Proporre correzione più piccola possibile
- Verificare con `npm run build`

---

## Context Pack (Standard)

Quando mancano informazioni, chiedere questi elementi (massimo 8 punti):

1. **Repo**: URL + branch corrente + commit HEAD
2. **Obiettivo preciso**: 1 frase
3. **Errore completo**: stack trace/log + pagina/route coinvolta
4. **Passi per riprodurre**: 1-5 step
5. **Ambiente**: Node, Next.js, package manager, OS
6. **File coinvolti**: path e/o diff (se disponibile)
7. **Vincoli**: "non cambiare UI", "non toccare API", "solo fix build", ecc.
8. **Cosa è cambiato "da ieri"**: ultimi commit o elenco file

---

## Formato di Output (Standard)

### A) Prompt per Cursor (COPIA/INCOLLA)

Blocco unico con:

#### 0. Snapshot GitHub (OBBLIGATORIO)
```bash
# Verifica stato
git status
git branch --show-current
git log -1 --oneline

# Crea snapshot
git checkout -b wip/<descrizione-breve>-<YYYYMMDD-HHMM>
git add -A
git commit -m "wip: snapshot before <task>"
git push -u origin wip/<descrizione-breve>-<YYYYMMDD-HHMM>
```

#### 1. Diagnosi
- Comandi per verificare e isolare la causa
- `git diff/log`, `grep`, `npm run build`
- Output atteso

#### 2. Fix
- Modifiche puntuali (file e cosa cambiare)
- Criteri di accettazione
- Alternative (se applicabile)

#### 3. Test
- Comandi (build/dev)
- Test manuali da fare
- Criteri di successo

#### 4. Commit finale
- Messaggio commit
- Push
- (Opzionale) PR

### B) Checklist rapida (5-10 checkbox)

---

## Template Prompt Completo

```markdown
Sei Cursor nel repo. PRIMA DI QUALSIASI MODIFICA devi salvare lo stato attuale su GitHub.

OBIETTIVO: [1 frase precisa]

VINCOLI:
- [vincolo 1]
- [vincolo 2]
- [vincolo 3]

FASE 0 — SNAPSHOT SU GITHUB (OBBLIGATORIA)
1) Mostrami la situazione:
   - `git status`
   - `git branch --show-current`
   - `git log -5 --oneline`
   - `git remote -v`

2) Crea branch snapshot e committa TUTTO lo stato attuale:
   - `git checkout -b wip/<task>-<YYYYMMDD-HHMM>`
   - `git add -A`
   - `git commit -m "wip: snapshot before <task>"`
   - `git push -u origin wip/<task>-<YYYYMMDD-HHMM>`

3) Verifica che lo snapshot sia su GitHub:
   - `git ls-remote --heads origin | grep wip/<task>`

FASE 1 — DIAGNOSI
[Comandi per verificare il problema]

FASE 2 — FIX
[Modifiche puntuali con file e righe]

FASE 3 — TEST
[Comandi e test manuali]

FASE 4 — COMMIT
[Se tutto passa: commit + push]

OUTPUT ATTESO:
- Elenco file modificati
- Spiegazione breve
- Risultato test (build pass/fail)
- Comando git usato
```

---

## Esempio Pratico: Fix Password Reset

Vedi `docs/EXAMPLES/password-reset-fix-prompt.md` per un esempio completo.

---

## Checklist Qualità Prompt

Prima di considerare un prompt "pronto", verifica:

- [ ] Include snapshot Git (FASE 0)
- [ ] Comandi precisi e copiabili
- [ ] File e righe specifiche
- [ ] Criteri di accettazione chiari
- [ ] Test obbligatori definiti
- [ ] Vincoli espliciti
- [ ] Output atteso documentato
- [ ] Nessuna supposizione non verificata
- [ ] Fix minimale e reversibile
- [ ] Backup/rollback se operazioni distruttive

---

## Stile

- **Italiano**, tono diretto
- Elenchi puntati e sezioni numerate
- Massimo 1-2 righe di motivazione per scelta tecnica
- Se alternative: "Scelta consigliata" + 1 alternativa

---

## Note Finali

Il prompt deve essere così chiaro che Cursor possa eseguirlo **senza domande**: comandi, file, criteri, test.

Ogni prompt deve essere **self-contained** e **actionable**.
