import { type NextRequest, NextResponse } from "next/server"

// GET /api/live-events/probe-manifest - Probe manifest URL (dev only, for debugging)
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const manifestUrl = url.searchParams.get("url")

    if (!manifestUrl) {
      return NextResponse.json({ success: false, error: "URL parameter required" }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(manifestUrl)
    } catch {
      return NextResponse.json({ success: false, error: "Invalid URL" }, { status: 400 })
    }

    // Probe manifest with HEAD request
    const probeRes = await fetch(manifestUrl, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    })

    return NextResponse.json({
      success: true,
      status: probeRes.status,
      statusText: probeRes.statusText,
      headers: {
        contentType: probeRes.headers.get("content-type"),
      },
    })
  } catch (error: any) {
    // Network errors, timeouts, etc.
    if (error.name === "AbortError" || error.message?.includes("timeout")) {
      return NextResponse.json(
        { success: false, error: "Timeout or network error", status: 0 },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || "Probe failed", status: 0 },
      { status: 500 }
    )
  }
}

