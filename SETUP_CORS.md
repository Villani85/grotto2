# Configurazione CORS per Google Cloud Storage

## Problema
Quando si tenta di fare upload di video tramite signed URL, il browser blocca la richiesta con errore CORS:
```
Access to fetch at 'https://storage.googleapis.com/...' from origin 'http://localhost:3000' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Soluzione
Configurare CORS sul bucket Google Cloud Storage per permettere richieste PUT da localhost e produzione.

## File di Configurazione
Il file `gcs-cors.json` contiene la configurazione CORS necessaria.

## Istruzioni per Applicare CORS

### Prerequisiti
1. Avere installato `gsutil` (Google Cloud SDK)
2. Essere autenticati: `gcloud auth login`
3. Avere i permessi per modificare il bucket

### Passi

1. **Identifica il nome del bucket**
   - Il bucket è definito in `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` nel file `.env.local`
   - Esempio: `your-project-id.appspot.com` o `gs://your-bucket-name`

2. **Applica la configurazione CORS**
   ```bash
   gsutil cors set gcs-cors.json gs://YOUR-BUCKET-NAME
   ```
   
   Sostituisci `YOUR-BUCKET-NAME` con il nome del tuo bucket (senza `gs://`).

   Esempio:
   ```bash
   gsutil cors set gcs-cors.json gs://my-project-id.appspot.com
   ```

3. **Verifica la configurazione**
   ```bash
   gsutil cors get gs://YOUR-BUCKET-NAME
   ```

4. **Se necessario, aggiungi l'origin di produzione**
   - Modifica `gcs-cors.json` aggiungendo il tuo dominio di produzione nella lista `origin`
   - Esempio: `"https://yourdomain.com"`
   - Riapplica: `gsutil cors set gcs-cors.json gs://YOUR-BUCKET-NAME`

## Configurazione CORS Inclusa

La configurazione permette:
- **Origins**: `http://localhost:3000`, `https://localhost:3000` (aggiungi il tuo dominio di produzione)
- **Metodi**: GET, PUT, HEAD, POST
- **Headers**: Content-Type, Content-Length, e header specifici di GCS per upload resumable
- **Max Age**: 3600 secondi (1 ora)

## Note Importanti

1. **Content-Type**: La signed URL usa `X-Goog-SignedHeaders=content-type;host`, quindi il Content-Type del PUT deve corrispondere esattamente a quello specificato nella richiesta di generazione della signed URL.

2. **Produzione**: Ricorda di aggiungere il tuo dominio di produzione alla lista `origin` in `gcs-cors.json` prima di applicare in produzione.

3. **Sicurezza**: La configurazione attuale permette GET/HEAD da qualsiasi origin per lettura pubblica. Se i video devono essere privati, rimuovi la seconda regola CORS.

## Troubleshooting

- **Errore "Access Denied"**: Verifica di avere i permessi `storage.buckets.update` sul bucket
- **CORS ancora non funziona**: Assicurati di aver riavviato il server Next.js dopo aver applicato CORS
- **Solo localhost funziona**: Aggiungi il dominio di produzione a `gcs-cors.json` e riapplica




