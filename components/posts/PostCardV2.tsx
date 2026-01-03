"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LikeButton } from "./LikeButton"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"
import { MessageCircle, Share2, MoreVertical } from "lucide-react"
import Link from "next/link"
import type { PostType } from "./PostComposerV2"

interface Post {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  text: string
  createdAt: string
  likesCount: number
  commentsCount: number
  type?: PostType
}

interface PostCardV2Props {
  post: Post
  onLikeChange?: (postId: string, liked: boolean, newCount: number) => void
}

export function PostCardV2({ post, onLikeChange }: PostCardV2Props) {
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

  const postType = post.type || "insight"
  const typeConfig = {
    insight: { label: "Insight", color: "bg-blue-500", borderColor: "border-l-blue-500" },
    challenge: { label: "Challenge", color: "bg-purple-500", borderColor: "border-l-purple-500" },
    domanda: { label: "Domanda", color: "bg-orange-500", borderColor: "border-l-orange-500" },
  }

  const config = typeConfig[postType]

  return (
    <Card className={`border-l-4 ${config.borderColor} border shadow-sm hover:shadow-md transition-all duration-200`}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 pb-3 border-b">
          <div className="flex items-start gap-3">
            <Link href={`/u/${post.authorId}`}>
              <Avatar className="h-10 w-10 cursor-pointer hover:ring-2 ring-primary/50 transition-all">
                <AvatarImage src={post.authorAvatarUrl || undefined} alt={post.authorName} />
                <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/u/${post.authorId}`}>
                    <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer truncate">
                      {post.authorName}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-muted-foreground">{formatDate(post.createdAt)}</p>
                    <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">
                      {config.label}
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{post.text}</p>
        </div>

        {/* Footer Actions */}
        <div className="px-4 pb-4 pt-2 border-t">
          <div className="flex items-center gap-4">
            <LikeButton
              postId={post.id}
              authorId={post.authorId}
              initialLikesCount={post.likesCount}
              onLikeChange={(liked, newCount) => onLikeChange?.(post.id, liked, newCount)}
            />
            <Link href={`/bacheca/${post.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{post.commentsCount}</span>
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            {/* Micro Badge */}
            <div className="ml-auto">
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5 bg-green-500/10 text-green-600 dark:text-green-400">
                +2
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
