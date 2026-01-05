import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-helpers"

// GET /api/admin/ivs/config - Restituisce config IVS (protetto, admin only)
export async function GET(request: NextRequest) {
  try {
    const _admin = await requireAdmin(request)

    const ingestEndpoint = process.env.IVS_INGEST_ENDPOINT
    const streamKey = process.env.IVS_STREAM_KEY

    // Check which env vars are missing
    const missing: string[] = []
    if (!ingestEndpoint) missing.push("IVS_INGEST_ENDPOINT")
    if (!streamKey) missing.push("IVS_STREAM_KEY")

    if (missing.length > 0) {
      // Log in dev only (without exposing values)
      if (process.env.NODE_ENV !== "production") {
        console.warn("[API Admin IVS Config] Missing env vars:", {
          hasIngest: !!ingestEndpoint,
          hasKey: !!streamKey,
          missing,
        })
      }

      return NextResponse.json(
        {
          code: "ENV_MISSING",
          error: "IVS env missing",
          missing,
          hint: "Aggiungi in .env.local e RIAVVIA il dev server",
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ingestEndpoint,
      streamKey,
    })
  } catch (error: any) {
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    console.error("[API Admin IVS Config] Error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

