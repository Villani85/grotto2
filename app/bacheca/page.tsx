"use client"

import { useState, useEffect } from "react"
import { SubscriptionRequired } from "@/components/SubscriptionRequired"
import { Card, CardContent } from "@/components/ui/card"
import { PostComposerV2 } from "@/components/posts/PostComposerV2"
import { PostCardV2 } from "@/components/posts/PostCardV2"
import { CommentsThread } from "@/components/posts/CommentsThread"
import { LoadingSkeletonBacheca } from "@/components/posts/LoadingSkeletonBacheca"
import { BachecaFilters } from "@/components/posts/BachecaFilters"
import { BachecaMiniLeaderboard } from "@/components/posts/BachecaMiniLeaderboard"
import { Button } from "@/components/ui/button"
import type { PostType } from "@/components/posts/PostComposerV2"

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

export default function BachecaPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [selectedType, setSelectedType] = useState<PostType | "all">("all")

  const fetchPosts = async (cursor: string | null = null, append: boolean = false) => {
    try {
      if (cursor) {
        setIsLoadingMore(true)
      } else {
        setIsLoading(true)
      }

      const url = cursor
        ? `/api/posts?limit=20&cursor=${cursor}`
        : "/api/posts?limit=20"

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error("Failed to fetch posts")
      }

      const data = await response.json()

      if (append) {
        setPosts((prev) => [...prev, ...data.posts])
      } else {
        setPosts(data.posts)
      }

      setNextCursor(data.nextCursor)
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setIsLoading(false)
      setIsLoadingMore(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handlePostCreated = () => {
    // Refresh posts from the beginning
    fetchPosts(null, false)
  }

  const handleLikeChange = (postId: string, liked: boolean, newCount: number) => {
    setPosts((prev) =>
      prev.map((post) =>
        post.id === postId
          ? { ...post, likesCount: newCount }
          : post
      )
    )
  }

  // Filter posts by type
  const filteredPosts = selectedType === "all"
    ? posts
    : posts.filter((post) => (post.type || "insight") === selectedType)

  return (
    <SubscriptionRequired>
      <div className="py-6 md:py-8">
        <div className="grid grid-cols-12 gap-4 md:gap-6">
          {/* Left Sidebar - Filters & Quick Actions (Desktop: col-span-3, Mobile: hidden) */}
          <div className="hidden md:block md:col-span-3">
            <div className="sticky top-24 space-y-4">
              <BachecaFilters selectedType={selectedType} onTypeChange={setSelectedType} />
            </div>
          </div>

          {/* Center - Composer + Feed (Desktop: col-span-6, Mobile: col-span-12) */}
          <div className="col-span-12 md:col-span-6 space-y-4">
            {/* Post Composer */}
            <PostComposerV2 onPostCreated={handlePostCreated} />

            {/* Posts List */}
            {isLoading ? (
              <LoadingSkeletonBacheca />
            ) : filteredPosts.length === 0 ? (
              <Card className="border-2 border-dashed border-muted">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 bg-[#005FD7]/10 rounded-full flex items-center justify-center">
                    <span className="text-4xl">📝</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Nessun post ancora</h3>
                  <p className="text-muted-foreground mb-6">
                    {selectedType === "all"
                      ? "Sii il primo a condividere qualcosa con la community!"
                      : `Nessun post di tipo "${selectedType}" trovato.`}
                  </p>
                  {selectedType !== "all" && (
                    <Button
                      variant="outline"
                      onClick={() => setSelectedType("all")}
                      className="mb-4"
                    >
                      Mostra tutti i post
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredPosts.map((post, index) => (
                  <div
                    key={post.id}
                    className="opacity-0 animate-slide-up"
                    style={{
                      animationDelay: `${index * 50}ms`,
                      animationFillMode: "forwards",
                      animationDuration: "0.4s",
                    }}
                  >
                    <PostCardV2 post={post} onLikeChange={handleLikeChange} />
                  </div>
                ))}

                {nextCursor && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => fetchPosts(nextCursor, true)}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? "Caricamento..." : "Carica altri post"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar - Mini Leaderboard (Desktop: col-span-3, Mobile: hidden) */}
          <div className="hidden md:block md:col-span-3">
            <div className="sticky top-24 space-y-4">
              <BachecaMiniLeaderboard />
            </div>
          </div>
        </div>
      </div>
    </SubscriptionRequired>
  )
}

