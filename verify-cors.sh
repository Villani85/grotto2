#!/bin/bash

# Script di verifica configurazione CORS per Firebase Storage
# Bucket: v0-membership-prod.firebasestorage.app

BUCKET="v0-membership-prod.firebasestorage.app"

echo "🔍 Verifica Configurazione CORS per bucket: $BUCKET"
echo "=================================================="
echo ""

# Verifica che gsutil sia installato
if ! command -v gsutil &> /dev/null; then
    echo "❌ gsutil non trovato. Installa Google Cloud SDK:"
    echo "   https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ gsutil trovato"
echo ""

# Verifica configurazione CORS attuale
echo "📋 Configurazione CORS attuale:"
echo "--------------------------------"
gsutil cors get gs://$BUCKET
echo ""

# Verifica che il bucket esista
echo "🔍 Verifica esistenza bucket..."
if gsutil ls gs://$BUCKET &> /dev/null; then
    echo "✅ Bucket trovato: gs://$BUCKET"
else
    echo "❌ Bucket non trovato: gs://$BUCKET"
    echo "   Verifica il nome del bucket in .env.local"
    exit 1
fi
echo ""

# Test preflight OPTIONS (richiede curl)
echo "🧪 Test Preflight OPTIONS (richiede curl)..."
if command -v curl &> /dev/null; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
        -H "Origin: http://localhost:3000" \
        -H "Access-Control-Request-Method: PUT" \
        -H "Access-Control-Request-Headers: content-type" \
        "https://storage.googleapis.com/$BUCKET/test")
    
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "204" ]; then
        echo "✅ Preflight OPTIONS: Status $RESPONSE"
    else
        echo "⚠️  Preflight OPTIONS: Status $RESPONSE (atteso 200 o 204)"
    fi
else
    echo "⚠️  curl non trovato, salto test preflight"
fi
echo ""

echo "✅ Verifica completata!"
echo ""
echo "📝 Prossimi passi:"
echo "   1. Se CORS non è configurato, esegui: gsutil cors set cors.json gs://$BUCKET"
echo "   2. Testa l'upload da http://localhost:3000/admin/courses/[courseId]/edit"
echo "   3. Verifica il file in Firebase Console > Storage"




