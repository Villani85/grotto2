# Setup Indice Firestore per Lezioni

## Problema
La query per recuperare le lezioni pubblicate ordinate per `order` richiede un indice composito Firestore.

## Errore
```
FirebaseError: The query requires an index. You can create it here:
https://console.firebase.google.com/v1/r/project/v0-membership-prod/firestore/indexes?create_composite=...
```

## Soluzione: Creare l'Indice Composito

### Opzione 1: Usare il Link Diretto (CONSIGLIATO)
1. Clicca sul link fornito nell'errore nella console del browser
2. Verrai reindirizzato alla pagina di creazione indice in Firebase Console
3. Clicca su **Create Index**
4. Attendi 1-2 minuti per la creazione dell'indice

### Opzione 2: Creare Manualmente
1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona progetto **`v0-membership-prod`**
3. Vai su **Firestore Database** → **Indexes**
4. Clicca su **Create Index**
5. Configura l'indice:
   - **Collection ID**: `lessons` (subcollection di `courses`)
   - **Fields to index**:
     - Campo: `published`, Ordinamento: `Ascending`
     - Campo: `order`, Ordinamento: `Ascending`
   - **Query scope**: Collection
6. Clicca **Create**

### Configurazione Indice Richiesta

**Collection**: `courses/{courseId}/lessons`  
**Fields**:
1. `published` - Ascending
2. `order` - Ascending

**Query Scope**: Collection (non Collection Group)

## Verifica
Dopo aver creato l'indice:
1. Attendi 1-2 minuti per la creazione
2. Ricarica la pagina del corso
3. Le lezioni dovrebbero essere caricate correttamente

## Note
- Gli indici compositi possono richiedere alcuni minuti per essere creati
- Se l'indice è in stato "Building", attendi il completamento
- Una volta creato, la query funzionerà automaticamente




