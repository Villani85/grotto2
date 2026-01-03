"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { FiTrash2 } from "react-icons/fi"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"
import { useAuth } from "@/context/AuthContext"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Comment {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  text: string
  createdAt: string
}

interface CommentsListProps {
  postId: string
  onCommentDeleted?: () => void
}

export function CommentsList({ postId, onCommentDeleted }: CommentsListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useAuth()
  const { toast } = useToast()

  // Debug: log user admin status
  useEffect(() => {
    if (user) {
      console.log("[CommentsList] User info:", {
        uid: user.uid,
        isAdmin: user.isAdmin,
        nickname: user.nickname,
      })
    }
  }, [user])

  const fetchComments = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/posts/${postId}/comments?limit=50`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments || [])
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [postId])

  const handleDelete = async (commentId: string, authorId: string) => {
    if (!user) {
      return
    }

    // Only author or admin can delete
    const canDelete = user.uid === authorId || user.isAdmin
    if (!canDelete) {
      return
    }

    const confirmMessage = user.isAdmin && user.uid !== authorId
      ? "Sei sicuro di voler eliminare questo commento come amministratore?"
      : "Sei sicuro di voler eliminare questo commento?"

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Token non disponibile")
      }

      const response = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore nell'eliminare il commento")
      }

      toast({
        title: "Commento eliminato",
        description: "Il commento è stato eliminato con successo",
      })

      // Remove from local state
      setComments(comments.filter((c) => c.id !== commentId))
      onCommentDeleted?.()
    } catch (error: any) {
      console.error("Error deleting comment:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare il commento",
        variant: "destructive",
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: it,
      })
    } catch {
      return "poco fa"
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#005FD7] mx-auto"></div>
        <p className="text-sm text-muted-foreground mt-2">Caricamento commenti...</p>
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Nessun commento ancora. Sii il primo a commentare!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
          <Link href={`/u/${comment.authorId}`}>
            <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-[#005FD7]/50 transition-all">
              <AvatarImage src={comment.authorAvatarUrl || undefined} alt={comment.authorName} />
              <AvatarFallback>{getInitials(comment.authorName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Link href={`/u/${comment.authorId}`}>
                    <span className="font-semibold text-sm hover:text-[#005FD7] transition-colors cursor-pointer">
                      {comment.authorName}
                    </span>
                  </Link>
                  <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{comment.text}</p>
              </div>
              {user && (user.uid === comment.authorId || user.isAdmin) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(comment.id, comment.authorId)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  title={user.isAdmin && user.uid !== comment.authorId ? "Elimina come amministratore" : "Elimina commento"}
                >
                  <FiTrash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

