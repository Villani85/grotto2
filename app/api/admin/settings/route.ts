import { type NextRequest, NextResponse } from "next/server"
import { AdminSettingsRepository } from "@/lib/repositories/admin-settings"
import { isDemoMode } from "@/lib/env"
import { requireAdmin } from "@/lib/auth-helpers"

// Get admin settings
export async function GET(request: NextRequest) {
  try {
    // Anyone can read public settings, but maybe we want to restrict full settings to admin?
    // For now assuming settings are public or contain only safe public config.
    // If sensitive, add requireAdmin(request) here too.
    const settings = await AdminSettingsRepository.get()
    return NextResponse.json(settings)
  } catch (error: any) {
    console.error("[API Admin Settings] Error fetching settings:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

// Update admin settings
export async function PATCH(request: NextRequest) {
  if (isDemoMode) {
    return NextResponse.json({ error: "Demo mode - Updates disabled" }, { status: 403 })
  }

  try {
    await requireAdmin(request)
    const body = await request.json()

    const success = await AdminSettingsRepository.update(body)

    if (!success) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    const updatedSettings = await AdminSettingsRepository.get()
    return NextResponse.json(updatedSettings)
  } catch (error: any) {
    console.error("[API Admin Settings] Error updating settings:", error)
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}
