#!/usr/bin/env tsx
/**
 * Script di diagnostica per NeuroCredits
 * Verifica configurazione Firebase Admin e modalità demo
 */

import { isDemoMode, firebaseAdminConfig, hasFirebaseAdminConfig, hasFirebaseClientConfig } from "../lib/env"
import { getAdminApp } from "../lib/firebase-admin"

async function diagnose() {
  console.log("=".repeat(60))
  console.log("🔍 DIAGNOSTICA NEUROCREDITS")
  console.log("=".repeat(60))
  console.log()

  // 1. Verifica Modalità Demo
  console.log("1️⃣ MODALITÀ DEMO")
  console.log("-".repeat(60))
  console.log(`isDemoMode: ${isDemoMode}`)
  console.log(`NEXT_PUBLIC_DEMO_MODE: ${process.env.NEXT_PUBLIC_DEMO_MODE || "non impostato"}`)
  console.log(`hasFirebaseClientConfig: ${hasFirebaseClientConfig}`)
  console.log()

  // 2. Verifica Firebase Client Config
  console.log("2️⃣ FIREBASE CLIENT CONFIG")
  console.log("-".repeat(60))
  console.log(`NEXT_PUBLIC_FIREBASE_API_KEY: ${process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "✅ presente" : "❌ mancante"}`)
  console.log(`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "✅ presente" : "❌ mancante"}`)
  console.log(`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "✅ presente" : "❌ mancante"}`)
  console.log()

  // 3. Verifica Firebase Admin Config
  console.log("3️⃣ FIREBASE ADMIN CONFIG")
  console.log("-".repeat(60))
  console.log(`hasFirebaseAdminConfig: ${hasFirebaseAdminConfig}`)
  console.log(`FIREBASE_ADMIN_PROJECT_ID: ${firebaseAdminConfig.projectId ? "✅ presente" : "❌ mancante"}`)
  console.log(`FIREBASE_ADMIN_CLIENT_EMAIL: ${firebaseAdminConfig.clientEmail ? "✅ presente" : "❌ mancante"}`)
  console.log(`FIREBASE_ADMIN_PRIVATE_KEY: ${firebaseAdminConfig.privateKey ? "✅ presente" : "❌ mancante"}`)
  console.log()

  // 4. Test Inizializzazione Firebase Admin
  console.log("4️⃣ TEST INIZIALIZZAZIONE FIREBASE ADMIN")
  console.log("-".repeat(60))
  try {
    const app = await getAdminApp()
    if (app) {
      console.log("✅ Firebase Admin inizializzato con successo")
      console.log(`Project ID: ${app.options.projectId}`)
    } else {
      console.log("❌ Firebase Admin NON inizializzato")
      console.log("   Motivo probabile:")
      if (isDemoMode) {
        console.log("   - Modalità demo attiva")
      }
      if (!hasFirebaseAdminConfig) {
        console.log("   - Configurazione Firebase Admin mancante o incompleta")
      }
    }
  } catch (error: any) {
    console.log("❌ Errore durante inizializzazione:")
    console.log(`   ${error.message}`)
  }
  console.log()

  // 5. Diagnosi Finale
  console.log("5️⃣ DIAGNOSI FINALE")
  console.log("-".repeat(60))
  if (isDemoMode) {
    console.log("⚠️  MODALITÀ DEMO ATTIVA")
    console.log("   I NeuroCredits verranno loggati ma non salvati in Firestore")
    console.log("   Per abilitare NeuroCredits reali:")
    console.log("   1. Configura tutte le variabili Firebase Client")
    console.log("   2. Imposta NEXT_PUBLIC_DEMO_MODE=false (o rimuovilo)")
  } else if (!hasFirebaseAdminConfig) {
    console.log("❌ FIREBASE ADMIN NON CONFIGURATO")
    console.log("   I NeuroCredits NON verranno assegnati")
    console.log("   Per abilitare NeuroCredits:")
    console.log("   1. Ottieni le credenziali Firebase Admin dal progetto Firebase")
    console.log("   2. Aggiungi al file .env.local:")
    console.log("      FIREBASE_ADMIN_PROJECT_ID=...")
    console.log("      FIREBASE_ADMIN_CLIENT_EMAIL=...")
    console.log("      FIREBASE_ADMIN_PRIVATE_KEY=...")
  } else {
    console.log("✅ Configurazione corretta")
    console.log("   I NeuroCredits dovrebbero funzionare correttamente")
  }
  console.log()
  console.log("=".repeat(60))
}

diagnose().catch(console.error)
