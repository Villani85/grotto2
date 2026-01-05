import { mockMessages, mockConversations } from "@/lib/mock/data"
import type { Message, Conversation } from "@/lib/types"

export class MessagesRepository {
  static async getConversationsByUserId(userId: string): Promise<Conversation[]> {
    return mockConversations.filter((conv) => conv.participantIds.includes(userId))
  }

  static async getConversationById(conversationId: string): Promise<Conversation | null> {
    return mockConversations.find((conv) => conv.id === conversationId) || null
  }

  static async getOrCreateConversation(userId1: string, userId2: string): Promise<Conversation> {
    // Find existing conversation
    const existing = mockConversations.find(
      (conv) =>
        conv.participantIds.includes(userId1) && conv.participantIds.includes(userId2) && conv.participantIds.length === 2
    )

    if (existing) {
      console.log("[MessagesRepository] Found existing conversation:", existing.id)
      return existing
    }

    // Create new conversation
    const newConv: Conversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      participantIds: [userId1, userId2],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    console.log("[MessagesRepository] Mock mode - conversation created:", newConv.id)
    // IMPORTANT: Add to mock array so it can be found later
    mockConversations.push(newConv)
    return newConv
  }

  static async getMessagesByConversationId(conversationId: string): Promise<Message[]> {
    return mockMessages.filter((msg) => msg.conversationId === conversationId).sort((a, b) => {
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
  }

  static async createMessage(
    message: Omit<Message, "id" | "createdAt" | "read">
  ): Promise<Message> {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      createdAt: new Date(),
    }
    console.log("[MessagesRepository] Mock mode - message created:", newMessage.id)
    // IMPORTANT: Add to mock array so it can be retrieved later
    mockMessages.push(newMessage)
    return newMessage
  }

  static async markAsRead(messageId: string, _userId: string): Promise<boolean> {
    console.log("[MessagesRepository] Mock mode - message marked as read:", messageId)
    return true
  }
}

