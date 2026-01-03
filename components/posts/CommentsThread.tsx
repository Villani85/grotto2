"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"
import { useAuth } from "@/context/AuthContext"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useToast } from "@/hooks/use-toast"
import { Send } from "lucide-react"
import Link from "next/link"

interface Comment {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  text: string
  createdAt: string
}

interface CommentsThreadProps {
  postId: string
  maxVisible?: number
  onCommentAdded?: () => void
}

export function CommentsThread({ postId, maxVisible = 2, onCommentAdded }: CommentsThreadProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

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

  useEffect(() => {
    fetchComments()
  }, [postId])

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!commentText.trim()) {
      return
    }

    if (!user) {
      toast({
        title: "Errore",
        description: "Devi essere autenticato per commentare",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = await getFirebaseIdToken()
      if (!token) {
        throw new Error("Token non disponibile")
      }

      const response = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentText.trim() }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore nel creare il commento")
      }

      setCommentText("")
      toast({
        title: "Commento pubblicato",
        description: "Il tuo commento è stato pubblicato con successo",
      })

      fetchComments()
      onCommentAdded?.()
    } catch (error: any) {
      console.error("Error creating comment:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile pubblicare il commento",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const visibleComments = showAll ? comments : comments.slice(0, maxVisible)
  const hasMore = comments.length > maxVisible

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">Caricamento commenti...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-3 border-t">
      {/* Comments List */}
      {visibleComments.length > 0 && (
        <div className="space-y-3">
          {visibleComments.map((comment) => (
            <div key={comment.id} className="flex gap-3 group">
              {/* Thread Line */}
              <div className="flex flex-col items-center pt-1">
                <div className="w-0.5 h-full bg-border min-h-[20px]" />
              </div>
              {/* Comment Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-1">
                  <Link href={`/u/${comment.authorId}`}>
                    <Avatar className="h-7 w-7 cursor-pointer hover:ring-2 ring-primary/50 transition-all">
                      <AvatarImage src={comment.authorAvatarUrl || undefined} alt={comment.authorName} />
                      <AvatarFallback className="text-xs">{getInitials(comment.authorName)}</AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/u/${comment.authorId}`}>
                        <span className="text-xs font-semibold hover:text-primary transition-colors cursor-pointer">
                          {comment.authorName}
                        </span>
                      </Link>
                      <span className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap break-words">
                      {comment.text}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show More Button */}
      {hasMore && !showAll && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(true)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Mostra altri {comments.length - maxVisible} commenti
        </Button>
      )}

      {/* Comment Composer */}
      {user && (
        <form onSubmit={handleSubmit} className="flex gap-2 pt-2">
          <Avatar className="h-7 w-7 flex-shrink-0">
            <AvatarImage src={user.avatarUrl || undefined} alt={user.nickname || "User"} />
            <AvatarFallback className="text-xs">{user ? getInitials(user.nickname) : "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 flex gap-2">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Scrivi un commento..."
              className="min-h-[60px] resize-none text-sm"
              maxLength={2000}
              disabled={isSubmitting}
            />
            <Button
              type="submit"
              size="sm"
              disabled={!commentText.trim() || isSubmitting}
              className="self-end"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
