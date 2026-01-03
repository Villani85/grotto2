# Template Prompt Cursor (Riutilizzabile)

**Copia questo template e compila le sezioni tra `[...]`**

---

```markdown
Sei Cursor nel repo [NOME_REPO]. PRIMA DI QUALSIASI MODIFICA devi salvare lo stato attuale su GitHub.

OBIETTIVO: [1 frase precisa che descrive cosa vuoi ottenere]

VINCOLI:
- [vincolo 1: es. "non cambiare UI", "non toccare API", "solo fix build"]
- [vincolo 2: es. "mantieni backward compatibility"]
- [vincolo 3: es. "non modificare signature di funzioni esportate"]

CONTESTO:
[Se applicabile: descrizione del problema, link a issue, screenshot, stack trace]

FASE 0 — SNAPSHOT SU GITHUB (OBBLIGATORIA)
1) Mostrami la situazione:
   - `git status`
   - `git branch --show-current`
   - `git log -5 --oneline`
   - `git remote -v`

2) Crea branch snapshot e committa TUTTO lo stato attuale:
   - `git checkout -b wip/[descrizione-breve]-[YYYYMMDD-HHMM]`
   - `git add -A`
   - `git commit -m "wip: snapshot before [task]"`
   - `git push -u origin wip/[descrizione-breve]-[YYYYMMDD-HHMM]`

3) Verifica che lo snapshot sia su GitHub:
   - `git ls-remote --heads origin | grep wip/[descrizione-breve]`

FASE 1 — DIAGNOSI
[Comandi per verificare e isolare la causa]

Esempio:
- `git diff [file]` per vedere modifiche recenti
- `npm run build` per verificare errori di compilazione
- `rg -n "[pattern]" .` per cercare pattern specifici
- `git log --oneline --all --grep="[keyword]"` per trovare commit correlati

FASE 2 — FIX
[Modifiche puntuali con file e righe specifiche]

Esempio:
- File: `app/[path]/[file].tsx`
- Riga X-Y: [cosa cambiare]
- Criteri di accettazione:
  - [ ] Criterio 1
  - [ ] Criterio 2
  - [ ] Criterio 3

FASE 3 — TEST
[Comandi e test manuali]

Esempio:
- `npm run build` (DEVE PASSARE)
- `npm run dev` e testare:
  - [ ] Test case 1
  - [ ] Test case 2
  - [ ] Test case 3

FASE 4 — COMMIT (solo se tutto passa)
- `git status` deve mostrare SOLO i file necessari
- `git commit -m "[tipo]: [descrizione breve]"`
- `git push` sul branch corrente

OUTPUT ATTESO:
- Elenco file modificati
- Spiegazione breve di cosa hai cambiato
- Risultato dei test (build pass/fail)
- Comando git usato (commit + push)
```

---

## Checklist Pre-Compilazione

Prima di usare il template, raccogli:

- [ ] Repo URL + branch corrente
- [ ] Obiettivo preciso (1 frase)
- [ ] Errore completo (se applicabile)
- [ ] Passi per riprodurre (1-5 step)
- [ ] Ambiente (Node, Next.js, package manager, OS)
- [ ] File coinvolti (path)
- [ ] Vincoli espliciti
- [ ] Cosa è cambiato "da ieri" (ultimi commit)

---

## Esempi di Tipi di Commit

- `fix:` - Bug fix
- `feat:` - Nuova feature
- `refactor:` - Refactoring codice
- `chore:` - Task di manutenzione
- `docs:` - Documentazione
- `test:` - Test
- `style:` - Formattazione codice
- `perf:` - Miglioramento performance

---

## Esempi di Vincoli Comuni

- "NON cambiare UI esistente"
- "NON toccare API routes"
- "Solo fix build, niente refactor"
- "Mantieni backward compatibility"
- "Non modificare signature di funzioni esportate"
- "Non aggiungere dipendenze"
- "Fix minimale, niente refactor"
- "Non cambiare schema database"
