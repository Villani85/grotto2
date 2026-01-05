"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { SubscriptionRequired } from "@/components/SubscriptionRequired"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { FiSend, FiHeart, FiMessageCircle, FiImage, FiEye, FiEyeOff, FiUsers, FiStar, FiTrendingUp } from "react-icons/fi"
import { markdownToHTML } from "@/lib/markdown"
import type { Post, PostComment } from "@/lib/types"

// Add custom styles for animations
const styles = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.5s ease-out forwards;
  }
  .animate-fade-in-up-delayed {
    animation: fadeInUp 0.5s ease-out forwards;
  }
`

export default function CommunityPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  // Inject custom styles
  useEffect(() => {
    const styleSheet = document.createElement("style")
    styleSheet.textContent = styles
    document.head.appendChild(styleSheet)
    return () => {
      document.head.removeChild(styleSheet)
    }
  }, [])

  // Debug: Log user state
  useEffect(() => {
    if (user) {
      console.log("[Community] Current user:", {
        uid: user.uid,
        nickname: user.nickname,
        email: user.email,
        isDemo: user.uid === "demo-user",
        isAdmin: user.isAdmin,
      })
    } else {
      console.log("[Community] No user loaded")
    }
  }, [user])
  const [posts, setPosts] = useState<Post[]>([])
  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostContent, setNewPostContent] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [communityVisibility, setCommunityVisibility] = useState<"subscribers_only" | "authenticated">("authenticated")
  const [loading, setLoading] = useState(true)

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
      
      // Check authentication first
      if (!user) {
        console.warn("[Community] ⚠️ No user - cannot load posts")
        setPosts([])
        setLoading(false)
        return
      }

      console.log("[Community] 🔍 Loading posts for user:", {
        uid: user.uid,
        email: user.email,
        isAdmin: user.isAdmin,
      })
      
      // Always try to load from Firestore first (real data only)
      try {
        const { getPostsFromFirestore } = await import("@/lib/firestore-posts")
        console.log("[Community] 📥 Calling getPostsFromFirestore...")
        const firestorePosts = await getPostsFromFirestore()
        console.log("[Community] ✅ Loaded posts from Firestore:", firestorePosts.length)
        
        // Always use Firestore data (even if empty, it's real data)
        setPosts(firestorePosts)
        
        // Also get settings
        const settingsRes = await fetch("/api/admin/settings/public")
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json()
          setCommunityVisibility(settingsData.data?.communityVisibility || "authenticated")
        }
        
        setLoading(false)
        return
      } catch (firestoreError: any) {
        console.error("[Community] ❌ Firestore load failed:", firestoreError.code, firestoreError.message)
        console.error("[Community] ❌ Error details:", {
          code: firestoreError.code,
          message: firestoreError.message,
          user: user ? { uid: user.uid, email: user.email } : "null",
        })
        
        // Show user-friendly error message
        if (firestoreError.code === "permission-denied") {
          console.error("[Community] 🚨 PERMISSION DENIED - Firestore rules need to be updated!")
          console.error("[Community] 📋 Action required:")
          console.error("[Community]    1. Open Firebase Console → Firestore → Rules")
          console.error("[Community]    2. Copy content from firestore.rules.development")
          console.error("[Community]    3. Paste and Publish")
          console.error("[Community]    4. Wait 30 seconds and reload")
        }
        
        // If Firestore fails, show empty array (no mock data)
        setPosts([])
        setLoading(false)
        return
      }
    } catch (error) {
      console.error("Error loading posts:", error)
      setPosts([]) // Show empty instead of mock data
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (user) {
      loadPosts()
      loadSettings()
    }
  }, [user, loadPosts, loadSettings])

  const handleCreatePost = async () => {
    if (!newPostTitle.trim() || !newPostContent.trim() || isCreating || !user) return

    // Prevent creating posts in demo mode
    if (user.uid === "demo-user") {
      alert("⚠️ Modalità Demo: Accedi con un account reale per creare post.")
      return
    }

    console.log("[Community] Creating post with user:", {
      uid: user.uid,
      nickname: user.nickname,
      email: user.email,
      isDemo: user.uid === "demo-user",
    })

    setIsCreating(true)
    try {
      // Try to create in Firestore first
      try {
        const { createPostInFirestore } = await import("@/lib/firestore-posts")
        const newPost = await createPostInFirestore({
          userId: user.uid,
          userNickname: user.nickname || user.email || "User",
          userAvatar: user.avatarUrl,
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          published: true,
          likesCount: 0,
          commentsCount: 0,
        })

        if (newPost) {
          console.log("[Community] Post created in Firestore:", newPost.id)
          setPosts([newPost, ...posts])
          setNewPostTitle("")
          setNewPostContent("")
          setShowPreview(false)
          // Award points for post creation
          await fetch("/api/points", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.uid,
              type: "post_created",
              amount: 10,
              description: "Post creato nella community",
              referenceId: newPost.id,
            }),
          })
          return
        } else {
          console.warn("[Community] ⚠️ createPostInFirestore returned null")
        }
      } catch (firestoreError: any) {
        console.error("[Community] ❌ Firestore creation failed:", firestoreError.code, firestoreError.message)
        console.error("[Community] ❌ Error details:", {
          code: firestoreError.code,
          message: firestoreError.message,
          userId: user.uid,
          stack: firestoreError.stack?.substring(0, 300),
        })
        console.log("[Community] 🔄 Falling back to API...")
      }

      // Fallback to API
      const res = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newPostTitle.trim(),
          content: newPostContent.trim(),
          userId: user.uid,
          userNickname: user.nickname || user.email || "User",
          userAvatar: user.avatarUrl,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setPosts([data.data, ...posts])
        setNewPostTitle("")
        setNewPostContent("")
        setShowPreview(false)
        // Award points for post creation
        await fetch("/api/points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.uid,
            type: "post_created",
            amount: 10,
            description: "Post creato nella community",
            referenceId: data.data.id,
          }),
        })
      } else {
        const errorData = await res.json()
        console.error("Error creating post:", errorData.error)
        alert(`Errore: ${errorData.error || "Impossibile creare il post"}`)
      }
    } catch (error) {
      console.error("Error creating post:", error)
      alert("Errore durante la creazione del post")
    } finally {
      setIsCreating(false)
    }
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

      {/* Create Post */}
      <Card className="border-[#005FD7]/20 shadow-xl hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gradient-to-b from-[#005FD7] to-[#005FD7]/50 rounded-full"></div>
              <h2 className="text-xl font-semibold">Crea un nuovo post</h2>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-gray-300">Oggetto</label>
              <Input
                placeholder="Dai un titolo al tuo post..."
                value={newPostTitle}
                onChange={(e) => setNewPostTitle(e.target.value)}
                className="bg-gray-800/50 border-gray-700 focus:border-[#005FD7] focus:ring-[#005FD7]/20 transition-all"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Contenuto</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="hover:bg-[#005FD7]/10 transition-colors"
                >
                  {showPreview ? (
                    <>
                      <FiEyeOff className="h-4 w-4 mr-2" />
                      Nascondi Preview
                    </>
                  ) : (
                    <>
                      <FiEye className="h-4 w-4 mr-2" />
                      Mostra Preview
                    </>
                  )}
                </Button>
              </div>
              {showPreview ? (
                <div className="border border-gray-700 rounded-lg p-4 bg-gray-900/50 min-h-[200px] backdrop-blur-sm">
                  <div 
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: markdownToHTML(newPostContent) 
                    }} 
                  />
                </div>
              ) : (
                <Textarea
                  placeholder="Scrivi il contenuto del tuo post qui...

Puoi usare Markdown:
- **testo** per grassetto
- *testo* per corsivo
- # Titolo principale
- ## Sottotitolo
- ### Sottotitolo 3"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm bg-gray-800/50 border-gray-700 focus:border-[#005FD7] focus:ring-[#005FD7]/20 transition-all"
                />
              )}
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <FiStar className="h-3 w-3" />
                Supporta formattazione Markdown: **grassetto**, *corsivo*, # titoli
              </p>
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled className="opacity-50 cursor-not-allowed">
                  <FiImage className="h-4 w-4 mr-2" />
                  Immagine
                </Button>
              </div>
              <Button 
                onClick={handleCreatePost} 
                disabled={!newPostTitle.trim() || !newPostContent.trim() || isCreating}
                className="bg-gradient-to-r from-[#005FD7] to-[#005FD7]/80 hover:from-[#005FD7]/90 hover:to-[#005FD7] transition-all shadow-lg shadow-[#005FD7]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiSend className="h-4 w-4 mr-2" />
                {isCreating ? "Pubblicazione..." : "Pubblica"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.length === 0 ? (
          <Card className="border-gray-800 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#005FD7]/20 to-[#005FD7]/10 flex items-center justify-center border border-[#005FD7]/30">
                <FiStar className="h-8 w-8 text-[#005FD7]" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Nessun post ancora</h3>
              <p className="text-gray-400 mb-4">Sii il primo a condividere qualcosa con la community!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post, index) => (
            <div 
              key={post.id}
              className="opacity-0 animate-fade-in-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <PostCard post={post} currentUserId={user.uid} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function PostCard({ post, currentUserId }: { post: Post; currentUserId: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [comments, setComments] = useState<PostComment[]>([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isLiked, setIsLiked] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLiking, setIsLiking] = useState(false)

  const loadComments = async () => {
    try {
      const res = await fetch(`/api/comments?postId=${post.id}`)
      if (res.ok) {
        const data = await res.json()
        setComments(data.data || [])
      }
    } catch (error) {
      console.error("Error loading comments:", error)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: post.id,
          content: newComment,
          userId: currentUserId,
          userNickname: "DemoUser", // TODO: Get from auth context
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setComments([...comments, data.data])
        setNewComment("")
        // Award points
        await fetch("/api/points", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: currentUserId,
            type: "comment_posted",
            amount: 5,
            description: "Commento pubblicato",
            referenceId: data.data.id,
          }),
        })
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const handleDeletePost = async () => {
    if (!user?.isAdmin || !confirm("Sei sicuro di voler eliminare questo post?")) return

    setIsDeleting(true)
    try {
      // Try Firestore first
      try {
        const { deletePostFromFirestore } = await import("@/lib/firestore-posts")
        const deleted = await deletePostFromFirestore(post.id)
        if (deleted) {
          console.log("[Community] Post deleted from Firestore")
          router.refresh() // Refresh to reload posts
          return
        }
      } catch (firestoreError) {
        console.log("[Community] Firestore delete failed, using API fallback")
      }

      // Fallback to API
      const res = await fetch(`/api/community/posts?id=${post.id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        router.refresh() // Refresh to reload posts
      } else {
        alert("Errore durante l'eliminazione del post")
      }
    } catch (error) {
      console.error("Error deleting post:", error)
      alert("Errore durante l'eliminazione del post")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleLike = async () => {
    if (isLiking) return
    setIsLiking(true)
    setIsLiked(!isLiked)
    // TODO: Implement actual like API call
    setTimeout(() => setIsLiking(false), 300)
  }

  return (
    <Card className="group border-gray-800/50 bg-gradient-to-br from-gray-900/50 to-gray-900/30 backdrop-blur-sm hover:border-[#005FD7]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#005FD7]/10">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-5">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#005FD7]/30 to-[#005FD7]/10 flex items-center justify-center border-2 border-[#005FD7]/30 shadow-lg shadow-[#005FD7]/10 group-hover:scale-110 transition-transform duration-300">
              {post.userAvatar ? (
                <img src={post.userAvatar} alt={post.userNickname} className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-base font-bold text-[#005FD7]">{post.userNickname.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-gray-900"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <a
                  href={`/members/${post.userId}`}
                  className="font-semibold text-white hover:text-[#005FD7] transition-colors cursor-pointer block truncate"
                >
                  {post.userNickname}
                </a>
                <div className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                  <span>{new Date(post.createdAt).toLocaleDateString("it-IT", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span>
                </div>
              </div>
              {user?.isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeletePost}
                  disabled={isDeleting}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  {isDeleting ? "Eliminazione..." : "Elimina"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold mb-4 text-white group-hover:text-[#005FD7] transition-colors">
          {post.title || "Senza titolo"}
        </h3>

        {/* Content */}
        <div 
          className="mb-5 prose prose-invert max-w-none prose-headings:text-white prose-p:text-gray-300 prose-a:text-[#005FD7] prose-strong:text-white prose-code:text-[#005FD7] prose-pre:bg-gray-800/50"
          dangerouslySetInnerHTML={{ 
            __html: markdownToHTML(post.content) 
          }} 
        />

        {/* Image */}
        {post.imageUrl && (
          <div className="mb-5 rounded-xl overflow-hidden border border-gray-800 shadow-lg group-hover:shadow-xl transition-shadow">
            <img src={post.imageUrl} alt="Post image" className="w-full h-auto object-cover" />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-6 pt-4 border-t border-gray-800/50">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
              isLiked 
                ? "text-red-500 bg-red-500/10 hover:bg-red-500/20" 
                : "text-gray-400 hover:text-red-500 hover:bg-red-500/10"
            } ${isLiking ? "animate-pulse" : ""}`}
          >
            <FiHeart className={`h-5 w-5 transition-transform ${isLiked ? "fill-current scale-110" : ""}`} />
            <span className="font-medium">{post.likesCount + (isLiked ? 1 : 0)}</span>
          </button>
          <button
            onClick={() => {
              setShowComments(!showComments)
              if (!showComments) loadComments()
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
              showComments 
                ? "text-[#005FD7] bg-[#005FD7]/10" 
                : "text-gray-400 hover:text-[#005FD7] hover:bg-[#005FD7]/10"
            }`}
          >
            <FiMessageCircle className="h-5 w-5" />
            <span className="font-medium">{post.commentsCount}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-5 pt-5 border-t border-gray-800/50 opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FiMessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nessun commento ancora. Sii il primo a commentare!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#005FD7]/30 to-[#005FD7]/10 flex items-center justify-center flex-shrink-0 border border-[#005FD7]/30">
                      {comment.userAvatar ? (
                        <img src={comment.userAvatar} alt={comment.userNickname} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-[#005FD7]">{comment.userNickname.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white mb-1">{comment.userNickname}</div>
                      <div className="text-sm text-gray-300 leading-relaxed">{comment.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                placeholder="Scrivi un commento..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[80px] bg-gray-800/50 border-gray-700 focus:border-[#005FD7] focus:ring-[#005FD7]/20 transition-all flex-1"
              />
              <Button 
                onClick={handleAddComment} 
                disabled={!newComment.trim()}
                className="bg-gradient-to-r from-[#005FD7] to-[#005FD7]/80 hover:from-[#005FD7]/90 hover:to-[#005FD7] transition-all shadow-lg shadow-[#005FD7]/20 disabled:opacity-50"
              >
                <FiSend className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

