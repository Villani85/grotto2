import { mockPointsTransactions } from "@/lib/mock/data"
import type { PointsTransaction } from "@/lib/types"

export class PointsRepository {
  static async getByUserId(userId: string): Promise<PointsTransaction[]> {
    return mockPointsTransactions.filter((tx) => tx.userId === userId)
  }

  static async create(transaction: Omit<PointsTransaction, "id" | "createdAt">): Promise<PointsTransaction> {
    const newTransaction: PointsTransaction = {
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    }
    console.log("[PointsRepository] Mock mode - transaction created:", newTransaction)
    return newTransaction
  }

  static async getTotalByUserId(userId: string): Promise<number> {
    const transactions = await this.getByUserId(userId)
    return transactions.reduce((sum, tx) => sum + tx.amount, 0)
  }

  static async checkIdempotency(
    userId: string,
    type: PointsTransaction["type"],
    referenceId?: string
  ): Promise<boolean> {
    // In mock mode, we allow duplicates for simplicity
    // In production, this would check Firestore for existing transactions
    return false
  }
}





