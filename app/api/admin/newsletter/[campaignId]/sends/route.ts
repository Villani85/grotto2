import { type NextRequest, NextResponse } from "next/server"
import { NewsletterSendsRepository } from "@/lib/repositories/newsletter-sends"
import { isDemoMode } from "@/lib/env"

// Get all sends for a specific campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params

  try {
    // TODO: Add admin auth check here
    
    const sends = await NewsletterSendsRepository.getByCampaignId(campaignId)
    
    return NextResponse.json({
      campaignId,
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




