import { type NextRequest, NextResponse } from "next/server"
import { NewsletterSendsRepository } from "@/lib/repositories/newsletter-sends"
import { isDemoMode } from "@/lib/env"

// Get all newsletter sends (admin only)
export async function GET(request: NextRequest) {
  try {
    // TODO: Add admin auth check here
    
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get("limit") || "100")
    const campaignId = url.searchParams.get("campaignId")
    
    let sends
    
    if (campaignId) {
      sends = await NewsletterSendsRepository.getByCampaignId(campaignId, limit)
    } else {
      sends = await NewsletterSendsRepository.getAll(limit)
    }
    
    return NextResponse.json({
      total: sends.length,
      sent: sends.filter(s => s.status === "sent").length,
      failed: sends.filter(s => s.status === "failed").length,
      pending: sends.filter(s => s.status === "pending").length,
      sends: sends,
    })
  } catch (error: any) {
    console.error("[API Admin Newsletter Sends] Error fetching sends:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}




