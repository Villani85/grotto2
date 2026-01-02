# Setup Resend per Newsletter

## Problema Attuale

Resend sta rifiutando l'invio con questo errore:
```
validation_error: You can only send testing emails to your own email address. 
To send emails to other recipients, please verify a domain at resend.com/domains
```

## Soluzione

### Opzione 1: Verificare un Dominio (CONSIGLIATO per Produzione)

1. Vai su [Resend Domains](https://resend.com/domains)
2. Aggiungi il tuo dominio (es. `brainhackingacademy.com`)
3. Aggiungi i record DNS richiesti:
   - **SPF**: `v=spf1 include:resend.com ~all`
   - **DKIM**: Record forniti da Resend
   - **DMARC**: `v=DMARC1; p=none;`
4. Attendi la verifica (può richiedere alcune ore)
5. Una volta verificato, aggiorna l'email `from` nelle campagne:
   - Da: `onboarding@resend.dev`
   - A: `info@brainhackingacademy.com` (o altro indirizzo sul tuo dominio)

### Opzione 2: Test con Email Verificata (Solo per Test)

Per testare senza verificare un dominio, puoi inviare solo all'email del tuo account Resend:
- Email verificata: `stefania.chiaradia@antihater.it`

**Nota**: Questa opzione funziona solo per test. Per inviare a tutti i membri, devi verificare un dominio.

## Configurazione

### Variabili d'Ambiente

Assicurati di avere:
```env
RESEND_API_KEY=re_xxxxxxxxx
EMAIL_FROM=info@brainhackingacademy.com  # Usa il tuo dominio verificato
```

### Aggiornare Email From nelle Campagne

Dopo aver verificato il dominio, aggiorna le campagne esistenti o crea nuove campagne con:
- **From Email**: `info@brainhackingacademy.com` (o altro sul tuo dominio)
- **From Name**: `Brain Hacking Academy`
- **Reply To**: `info@brainhackingacademy.com`

## Verifica

Dopo aver verificato il dominio:
1. Crea una nuova campagna newsletter
2. Usa un indirizzo email sul tuo dominio verificato come `from`
3. Prova a inviare a un indirizzo di test
4. Controlla i log di Resend per confermare l'invio

## Troubleshooting

### Errore: "validation_error"
- **Causa**: Dominio non verificato o email `from` non sul dominio verificato
- **Soluzione**: Verifica il dominio e usa un indirizzo email sul dominio verificato

### Errore: "You can only send testing emails to your own email address"
- **Causa**: Stai usando `onboarding@resend.dev` e inviando a email esterne
- **Soluzione**: Verifica un dominio e cambia l'email `from`

### Nessun log nel server
- Verifica che `RESEND_API_KEY` sia configurato correttamente
- Controlla i log del server Next.js (non solo la console del browser)
- Verifica che la campagna sia stata creata in Firestore




