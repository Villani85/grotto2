"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useAuth } from "@/context/AuthContext"

export type PostType = "insight" | "challenge" | "domanda"

interface PostComposerV2Props {
  onPostCreated?: () => void
}

export function PostComposerV2({ onPostCreated }: PostComposerV2Props) {
  const [text, setText] = useState("")
  const [postType, setPostType] = useState<PostType>("insight")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!text.trim()) {
      toast({
        title: "Errore",
        description: "Il testo del post è obbligatorio",
        variant: "destructive",
      })
      return
    }

    if (text.length > 5000) {
      toast({
        title: "Errore",
        description: "Il post non può superare i 5000 caratteri",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const token = await getFirebaseIdToken()
      if (!token) {
        toast({
          title: "Errore",
          description: "Devi essere autenticato per creare un post",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: text.trim(), type: postType }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Errore nel creare il post")
      }

      setText("")
      setIsExpanded(false)
      toast({
        title: "Post pubblicato",
        description: "Il tuo post è stato pubblicato con successo",
      })

      if (typeof window !== "undefined" && window.location.pathname === "/neurocredits") {
        window.dispatchEvent(new CustomEvent("refreshNeuroCredits"))
      }

      onPostCreated?.()
    } catch (error: any) {
      console.error("Error creating post:", error)
      toast({
        title: "Errore",
        description: error.message || "Impossibile pubblicare il post",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setText("")
    setIsExpanded(false)
  }

  const postTypeConfig = {
    insight: { label: "Insight", color: "bg-blue-500", credits: "+2" },
    challenge: { label: "Challenge", color: "bg-purple-500", credits: "+2" },
    domanda: { label: "Domanda", color: "bg-orange-500", credits: "+2" },
  }

  return (
    <Card className="border shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Avatar */}
          <Avatar className="h-10 w-10 flex-shrink-0">
            <AvatarImage src={user?.avatarUrl || undefined} alt={user?.nickname || "User"} />
            <AvatarFallback>{user ? getInitials(user.nickname) : "U"}</AvatarFallback>
          </Avatar>

          {/* Composer */}
          <div className="flex-1 space-y-3">
            {!isExpanded ? (
              <div
                onClick={() => setIsExpanded(true)}
                className="cursor-text"
                onFocus={() => setIsExpanded(true)}
              >
                <Textarea
                  placeholder="Condividi un'idea, una riflessione o una domanda..."
                  readOnly
                  className="cursor-text resize-none min-h-[60px] bg-muted/50"
                  onClick={() => setIsExpanded(true)}
                />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Condividi un'idea, una riflessione o una domanda..."
                  className="min-h-[120px] resize-none"
                  maxLength={5000}
                  disabled={isSubmitting}
                  autoFocus
                />

                {/* Post Type Chips */}
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(postTypeConfig).map(([key, config]) => (
                    <Badge
                      key={key}
                      variant={postType === key ? "default" : "outline"}
                      className={`cursor-pointer transition-colors ${
                        postType === key ? config.color : "hover:bg-muted"
                      }`}
                      onClick={() => setPostType(key as PostType)}
                    >
                      {config.label}
                    </Badge>
                  ))}
                </div>

                {/* Hint */}
                <p className="text-xs text-muted-foreground">
                  Pubblicare assegna {postTypeConfig[postType].credits} NeuroCredits
                </p>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {text.length}/5000 caratteri
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Annulla
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!text.trim() || isSubmitting}
                      className="bg-[#005FD7] hover:bg-[#0051b8]"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? "Pubblicazione..." : "Pubblica"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
