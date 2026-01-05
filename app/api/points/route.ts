import { type NextRequest, NextResponse } from "next/server"
import { PointsRepository } from "@/lib/repositories/points"
import type { PointsTransaction } from "@/lib/types"

// POST /api/points - Event Processor XP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, type, amount, description, referenceId } = body

    if (!userId || !type || !amount || !description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: userId, type, amount, description" },
        { status: 400 }
      )
    }

    // Check idempotency
    const isDuplicate = await PointsRepository.checkIdempotency(userId, type, referenceId)
    if (isDuplicate) {
      return NextResponse.json({ success: false, error: "Duplicate transaction" }, { status: 409 })
    }

    // Create transaction
    const transaction: Omit<PointsTransaction, "id" | "createdAt"> = {
      userId,
      amount: Number(amount),
      type,
      description,
      referenceId,
    }

    const newTransaction = await PointsRepository.create(transaction)

    // Get updated total
    const totalPoints = await PointsRepository.getTotalByUserId(userId)

    return NextResponse.json(
      {
        success: true,
        data: {
          transaction: newTransaction,
          totalPoints,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[API] Error processing points:", error)
    return NextResponse.json({ success: false, error: "Failed to process points" }, { status: 500 })
  }
}

// GET /api/points?userId=xxx - Get user points transactions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 })
    }

    const transactions = await PointsRepository.getByUserId(userId)
    const totalPoints = await PointsRepository.getTotalByUserId(userId)

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        totalPoints,
      },
    })
  } catch (error) {
    console.error("[API] Error fetching points:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch points" }, { status: 500 })
  }
}





