"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LikeButton } from "./LikeButton"
import { formatDistanceToNow } from "date-fns"
import { it } from "date-fns/locale"
import Link from "next/link"

interface Post {
  id: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  text: string
  createdAt: string
  likesCount: number
  commentsCount: number
}

interface PostCardProps {
  post: Post
  onLikeChange?: (postId: string, liked: boolean, newCount: number) => void
}

export function PostCard({ post, onLikeChange }: PostCardProps) {
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

  return (
    <Card className="hover:border-[#005FD7]/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 animate-post-appear">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Link href={`/u/${post.authorId}`}>
            <Avatar className="cursor-pointer hover:ring-2 ring-primary/50 transition-all motion-safe:hover:scale-105">
              <AvatarImage src={post.authorAvatarUrl || undefined} alt={post.authorName} />
              <AvatarFallback>{getInitials(post.authorName)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Link href={`/u/${post.authorId}`}>
                  <h3 className="font-semibold hover:text-primary transition-colors cursor-pointer">
                    {post.authorName}
                  </h3>
                </Link>
                <p className="text-sm text-muted-foreground">{formatDate(post.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="whitespace-pre-wrap break-words">{post.text}</p>
        </div>
        <div className="flex items-center gap-4 pt-4 border-t">
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
              className="motion-safe:active:scale-[0.98] transition-transform motion-reduce:transition-none"
            >
              <span className="mr-2">💬</span>
              {post.commentsCount}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

