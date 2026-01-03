"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { SubscriptionRequired } from "@/components/SubscriptionRequired"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PostComposerMagnetic, type PostComposerMagneticRef } from "@/components/posts/PostComposerMagnetic"
import { PostCard } from "@/components/posts/PostCard"
import { PostListSkeleton } from "@/components/posts/PostListSkeleton"
import { FiUsers, FiStar, FiTrendingUp } from "react-icons/fi"

// Interface matching /api/posts response (same as bacheca)
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

export default function CommunityPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(false)
  const [communityVisibility, setCommunityVisibility] = useState<"subscribers_only" | "authenticated">("authenticated")
  const composerRef = useRef<PostComposerMagneticRef>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login")
    }
  }, [user, isLoading, router])

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/public")
      if (res.ok) {
        const data = await res.json()
        setCommunityVisibility(data.data?.communityVisibility || "authenticated")
      }
    } catch (error) {
      console.error("Error loading settings:", error)
    }
  }, [])

  const loadPosts = useCallback(async () => {
    try {
      setLoading(true)
      
      if (!user) {
        console.warn("[Community] ⚠️ No user - cannot load posts")
        setPosts([])
        setLoading(false)
        return
      }

      console.log("[Community] 🔍 Loading posts from /api/posts...")
      
      // Use the same API as bacheca
      const response = await fetch("/api/posts?limit=20")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch posts`)
      }

      const data = await response.json()
      console.log("[Community] 📦 API Response:", { postsCount: data.posts?.length, hasNextCursor: !!data.nextCursor })
      
      setPosts(data.posts || [])
      
      console.log("[Community] ✅ Loaded posts:", data.posts?.length || 0)
    } catch (error: any) {
      console.error("[Community] ❌ Error loading posts:", error)
      setPosts([])
    } finally {
      console.log("[Community] 🏁 Setting loading to false")
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadSettings()
      loadPosts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]) // Only depend on user, functions are stable with useCallback

  const handlePostCreated = () => {
    // Refresh posts from the beginning
    loadPosts()
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

  const checkAccess = () => {
    // Admins have access to everything regardless of settings
    if (user?.isAdmin) {
      return true
    }
    
    if (communityVisibility === "subscribers_only") {
      return user?.subscriptionStatus === "active"
    }
    return true // authenticated allows all logged in users
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-[#005FD7] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-[#005FD7]/30 rounded-full animate-spin mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-gray-400 animate-pulse">Caricamento community...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!checkAccess()) {
    return (
      <div className="py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Accesso Riservato</h2>
            <p className="text-muted-foreground mb-6">
              La community è riservata agli abbonati attivi. Abbonati per accedere e connetterti con altri membri!
            </p>
            <Button onClick={() => router.push("/abbonamento")}>Vedi Piani Abbonamento</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <SubscriptionRequired>
    <div className="py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#005FD7]/20 via-[#005FD7]/10 to-transparent border border-[#005FD7]/20 p-8 backdrop-blur-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(0,95,215,0.1),transparent_50%)]"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 rounded-xl bg-[#005FD7]/20 backdrop-blur-sm border border-[#005FD7]/30">
              <FiUsers className="h-6 w-6 text-[#005FD7]" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Community
            </h1>
          </div>
          <p className="text-gray-300 text-lg">Condividi idee, fai domande e connettiti con altri membri</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FiTrendingUp className="h-4 w-4" />
              <span>{posts.length} post{posts.length !== 1 ? 's' : ''} attivi</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FiStar className="h-4 w-4" />
              <span>Comunità in crescita</span>
            </div>
          </div>
        </div>
      </div>

        {/* Create Post - Using PostComposerMagnetic (same as bacheca) */}
        <div id="post-composer">
          <PostComposerMagnetic ref={composerRef} onPostCreated={handlePostCreated} />
            </div>

        {/* Posts Feed - Using PostCard (same as bacheca) */}
        <div className="space-y-6">
          {posts.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-700 hover:border-[#005FD7]/30 transition-all">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-[#005FD7]/20 to-[#005FD7]/10 rounded-full flex items-center justify-center border-2 border-[#005FD7]/30 animate-pulse">
                  <FiStar className="h-10 w-10 text-[#005FD7]" />
            </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Nessun post ancora</h3>
                <p className="text-gray-400 mb-6 text-lg">Sii il primo a condividere qualcosa con la community!</p>
                <Button
                  onClick={() => {
                    composerRef.current?.expand()
                    window.scrollTo({ top: 0, behavior: "smooth" })
                  }}
                  className="bg-gradient-to-r from-[#005FD7] to-[#0066ff] hover:from-[#0051b8] hover:to-[#005FD7] shadow-lg hover:shadow-xl transition-all"
                >
                  <FiStar className="mr-2" />
                  Crea il Primo Post
                </Button>
            </CardContent>
          </Card>
        ) : (
            posts.map((post) => (
              <PostCard
              key={post.id}
                post={post}
                onLikeChange={handleLikeChange}
              />
          ))
        )}
      </div>
    </div>
    </SubscriptionRequired>
  )
}
