# ESLint Flat Config per Next.js 16

## Contesto

Migrazione a **ESLint flat config** (formato nativo di ESLint 9+) per supportare Next.js 16. Branch: `wip/eslint-flatconfig-next16-final-20260105-0211`. Commit: `1ebc209`.

## Strategia: Adozione Incrementale

Adozione graduale per evitare blocchi su migliaia di errori esistenti. Focus immediato: **no-floating-promises** solo server-side (API routes + lib).

## Regole Disabilitate (Globali)

Le seguenti regole sono disabilitate globalmente per permettere l'adozione senza bloccare il lavoro:

- **React/Next**: `react/no-unescaped-entities`, `react/jsx-no-undef`, `@next/next/no-img-element`, `@next/next/no-assign-module-variable`
- **React Hooks**: `react-hooks/exhaustive-deps`, `react-hooks/purity`, `react-hooks/set-state-in-effect`, `react-hooks/immutability`
- **TypeScript**: `@typescript-eslint/no-unused-vars`, `@typescript-eslint/no-explicit-any`
- **Promises**: `@typescript-eslint/no-floating-promises` (disabilitato globalmente, attivo solo server-side)

## Regola Attiva: no-floating-promises (Server-Only)

**Attiva solo in**: `app/api/**/*.{ts,tsx}`, `lib/**/*.{ts,tsx}`

Configurazione type-aware con `ignoreVoid: true` per evitare falsi positivi su `void` expressions.

## Roadmap: Riattivazione Graduale

1. **Fase 1** (attuale): no-floating-promises server-side ✅
2. **Fase 2**: Riattivare `@typescript-eslint/no-unused-vars` (fix incrementali)
3. **Fase 3**: Riattivare `react-hooks/exhaustive-deps` (fix incrementali)
4. **Fase 4**: Riattivare altre regole una alla volta

**Come riattivare**: Rimuovere la regola da `rules: { ... }` in `eslint.config.mjs`, fixare gli errori incrementali, commit.

## Verifica

```bash
npm ci          # Install dipendenze
npm run lint    # Verifica ESLint (deve passare con 0 warnings)
npm run build   # Verifica build Next.js
```

## File di Configurazione

- `eslint.config.mjs`: Configurazione flat config principale
