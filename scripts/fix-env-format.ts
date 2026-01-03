#!/usr/bin/env tsx
/**
 * Script per verificare e correggere il formato delle variabili d'ambiente
 */

import * as fs from "fs"
import * as path from "path"

const envPath = path.join(process.cwd(), ".env.local")

if (!fs.existsSync(envPath)) {
  console.error("❌ File .env.local non trovato")
  process.exit(1)
}

const content = fs.readFileSync(envPath, "utf-8")
const lines = content.split("\n")

console.log("🔍 Analisi file .env.local...")
console.log()

let hasIssues = false
const fixedLines: string[] = []

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const trimmed = line.trim()
  
  // Skip empty lines and comments
  if (!trimmed || trimmed.startsWith("#")) {
    fixedLines.push(line)
    continue
  }
  
  // Check for Firebase variables
  if (trimmed.startsWith("NEXT_PUBLIC_") || trimmed.startsWith("FIREBASE_ADMIN_")) {
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      
      // Check if value has unnecessary quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        // Remove outer quotes but preserve inner quotes and \n
        value = value.slice(1, -1)
        hasIssues = true
        console.log(`⚠️  Rimosse virgolette da: ${key}`)
      }
      
      // For FIREBASE_ADMIN_PRIVATE_KEY, ensure \n is preserved
      if (key === "FIREBASE_ADMIN_PRIVATE_KEY" && value.includes("\\n")) {
        // Value should have \n as literal, which is correct
        fixedLines.push(`${key}=${value}`)
      } else {
        fixedLines.push(`${key}=${value}`)
      }
    } else {
      fixedLines.push(line)
    }
  } else {
    fixedLines.push(line)
  }
}

if (hasIssues) {
  console.log()
  console.log("📝 Correzione automatica...")
  fs.writeFileSync(envPath, fixedLines.join("\n"), "utf-8")
  console.log("✅ File .env.local corretto!")
  console.log()
  console.log("⚠️  IMPORTANTE: Riavvia il server Next.js per applicare le modifiche!")
} else {
  console.log("✅ Formato variabili corretto!")
}
