"use client"

import { getFirebaseFirestore } from "./firebase-client"
import type { Post } from "./types"

/**
 * Client-side Firestore helper functions for Posts
 */

export async function getPostsFromFirestore(limit = 50): Promise<Post[]> {
  const separator = "=".repeat(80)
  console.log(separator)
  console.log("[Firestore] 🔍 DEBUG: Starting getPostsFromFirestore")
  console.log(separator)
  
  // Step 1: Check database initialization
  console.log("[Firestore] 📋 Step 1: Checking database initialization...")
  const db = getFirebaseFirestore()
  if (!db) {
    console.error("[Firestore] ❌ Step 1 FAILED: Database not initialized")
    console.error("[Firestore] 🔍 DEBUG: getFirebaseFirestore() returned null")
    console.error("[Firestore] 🔍 DEBUG: Check if Firebase is properly configured in .env.local")
    return []
  }
  console.log("[Firestore] ✅ Step 1 PASSED: Database initialized")
  console.log("[Firestore] 🔍 DEBUG: Database instance:", {
    type: typeof db,
    app: db?.app?.name || "unknown",
    projectId: db?.app?.options?.projectId || "unknown",
  })

  // Step 2: Check authentication
  console.log("[Firestore] 📋 Step 2: Checking authentication...")
  const { getFirebaseAuth } = await import("./firebase-client")
  const auth = getFirebaseAuth()
  console.log("[Firestore] 🔍 DEBUG: Auth instance:", {
    exists: !!auth,
    type: typeof auth,
    currentUser: auth?.currentUser ? {
      uid: auth.currentUser.uid,
      email: auth.currentUser.email,
      emailVerified: auth.currentUser.emailVerified,
    } : "null",
  })
  
  if (!auth) {
    console.error("[Firestore] ❌ Step 2 FAILED: Auth instance is null")
    console.error("[Firestore] 🔍 DEBUG: getFirebaseAuth() returned null")
    console.error("[Firestore] 🔍 DEBUG: Firebase Auth may not be initialized")
    return []
  }
  
  if (!auth.currentUser) {
    console.error("[Firestore] ❌ Step 2 FAILED: No current user")
    console.error("[Firestore] 🔍 DEBUG: auth.currentUser is null")
    console.error("[Firestore] 🔍 DEBUG: User is not logged in or session expired")
    console.error("[Firestore] 🔍 DEBUG: Make sure you are logged in (not in demo mode)")
    return []
  }
  
  console.log("[Firestore] ✅ Step 2 PASSED: User authenticated")
  console.log("[Firestore] 🔍 DEBUG: Current user:", {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    emailVerified: auth.currentUser.emailVerified,
    providerId: auth.currentUser.providerId,
  })
  
  // Step 3: Verify Firebase project configuration
  console.log("[Firestore] 📋 Step 3: Checking Firebase project configuration...")
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  
  console.log("[Firestore] 🔍 DEBUG: Environment variables:", {
    projectId: projectId ? `${projectId.substring(0, 10)}...` : "NOT SET",
    apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : "NOT SET",
    authDomain: authDomain || "NOT SET",
    hasAllVars: !!(projectId && apiKey && authDomain),
  })
  
  if (!projectId) {
    console.error("[Firestore] ❌ Step 3 FAILED: NEXT_PUBLIC_FIREBASE_PROJECT_ID not set")
    console.error("[Firestore] 🔍 DEBUG: Add NEXT_PUBLIC_FIREBASE_PROJECT_ID to .env.local")
    return []
  }
  
  console.log("[Firestore] ✅ Step 3 PASSED: Firebase project configured")
  console.log("[Firestore] 🔍 DEBUG: Project ID:", projectId)

  // Step 4: Import Firestore functions
  console.log("[Firestore] 📋 Step 4: Importing Firestore functions...")
  let collection, query, orderBy, limitQuery, getDocs, where
  try {
    const firestoreModule = await import("firebase/firestore")
    collection = firestoreModule.collection
    query = firestoreModule.query
    orderBy = firestoreModule.orderBy
    limitQuery = firestoreModule.limit
    getDocs = firestoreModule.getDocs
    where = firestoreModule.where
    console.log("[Firestore] ✅ Step 4 PASSED: Firestore functions imported")
  } catch (importError: any) {
    console.error("[Firestore] ❌ Step 4 FAILED: Cannot import Firestore functions")
    console.error("[Firestore] 🔍 DEBUG: Import error:", importError.message)
    return []
  }

  // Step 5: Create collection reference
  console.log("[Firestore] 📋 Step 5: Creating collection reference...")
  const postsRef = collection(db, "posts")
  console.log("[Firestore] ✅ Step 5 PASSED: Collection reference created")
  console.log("[Firestore] 🔍 DEBUG: Collection path:", postsRef.path)
  console.log("[Firestore] 🔍 DEBUG: Collection ID:", postsRef.id)
  console.log("[Firestore] 🔍 DEBUG: Collection type:", postsRef.type)
  
  console.log("[Firestore] 📥 Attempting to query posts collection...")
  
  try {
    // Step 6: Try to query with orderBy and published filter
    console.log("[Firestore] 📋 Step 6: Attempting query with where + orderBy...")
    let snapshot
    try {
      // Query only published posts, ordered by createdAt
      // Note: Firestore requires a composite index for where + orderBy on different fields
      console.log("[Firestore] 🔍 Query details:", {
        collection: "posts",
        filters: ["published == true"],
        orderBy: "createdAt desc",
        limit: limit,
      })
      const q = query(
        postsRef, 
        where("published", "==", true),
        orderBy("createdAt", "desc"), 
        limitQuery(limit)
      )
      console.log("[Firestore] 🔍 DEBUG: Query object created, executing...")
      snapshot = await getDocs(q)
      console.log("[Firestore] ✅ Step 6 PASSED: Query with where + orderBy successful")
      console.log("[Firestore] 🔍 DEBUG: Snapshot:", {
        size: snapshot.size,
        empty: snapshot.empty,
        metadata: {
          fromCache: snapshot.metadata.fromCache,
          hasPendingWrites: snapshot.metadata.hasPendingWrites,
        },
      })
    } catch (orderByError: any) {
      // Step 7: If orderBy fails, try without orderBy
      console.warn("[Firestore] ⚠️ Step 6 FAILED: orderBy query failed")
      console.warn("[Firestore] 🔍 DEBUG: Error code:", orderByError.code)
      console.warn("[Firestore] 🔍 DEBUG: Error message:", orderByError.message)
      console.warn("[Firestore] 🔍 DEBUG: Full error:", {
        code: orderByError.code,
        message: orderByError.message,
        stack: orderByError.stack?.substring(0, 500),
        name: orderByError.name,
      })
      
      console.log("[Firestore] 📋 Step 7: Retrying query with where only (no orderBy)...")
      try {
        console.log("[Firestore] 🔍 Query details:", {
          collection: "posts",
          filters: ["published == true"],
          orderBy: "none",
          limit: limit,
        })
        const q = query(
          postsRef,
          where("published", "==", true),
          limitQuery(limit)
        )
        console.log("[Firestore] 🔍 DEBUG: Query object created, executing...")
        snapshot = await getDocs(q)
        console.log("[Firestore] ✅ Step 7 PASSED: Query with where (no orderBy) successful")
        console.log("[Firestore] 🔍 DEBUG: Snapshot:", {
          size: snapshot.size,
          empty: snapshot.empty,
          metadata: {
            fromCache: snapshot.metadata.fromCache,
            hasPendingWrites: snapshot.metadata.hasPendingWrites,
          },
        })
      } catch (whereError: any) {
        // Step 8: If where also fails, query all posts and filter in memory
        console.warn("[Firestore] ⚠️ Step 7 FAILED: where query also failed")
        console.warn("[Firestore] 🔍 DEBUG: Error code:", whereError.code)
        console.warn("[Firestore] 🔍 DEBUG: Error message:", whereError.message)
        console.warn("[Firestore] 🔍 DEBUG: Full error:", {
          code: whereError.code,
          message: whereError.message,
          stack: whereError.stack?.substring(0, 500),
          name: whereError.name,
        })
        
        console.log("[Firestore] 📋 Step 8: Last attempt - query all posts (no filters)...")
        try {
          console.log("[Firestore] 🔍 Query details:", {
            collection: "posts",
            filters: "none",
            orderBy: "none",
            limit: limit * 2,
          })
          const q = query(postsRef, limitQuery(limit * 2)) // Get more to account for filtering
          console.log("[Firestore] 🔍 DEBUG: Query object created, executing...")
          snapshot = await getDocs(q)
          console.log("[Firestore] ✅ Step 8 PASSED: Query all posts successful")
          console.log("[Firestore] 🔍 DEBUG: Snapshot:", {
            size: snapshot.size,
            empty: snapshot.empty,
            metadata: {
              fromCache: snapshot.metadata.fromCache,
              hasPendingWrites: snapshot.metadata.hasPendingWrites,
            },
          })
        } catch (finalError: any) {
          // Step 9: All attempts failed - CRITICAL ERROR
          const errorSeparator = "=".repeat(80)
          console.error(errorSeparator)
          console.error("[Firestore] ❌❌❌ CRITICAL ERROR: ALL QUERY ATTEMPTS FAILED ❌❌❌")
          console.error(errorSeparator)
          console.error("[Firestore] ❌ Step 8 FAILED: Even simple query without filters failed")
          console.error("[Firestore] 🔍 DEBUG: Final error code:", finalError.code)
          console.error("[Firestore] 🔍 DEBUG: Final error message:", finalError.message)
          console.error("[Firestore] 🔍 DEBUG: Final error name:", finalError.name)
          console.error("[Firestore] 🔍 DEBUG: Full error object:", {
            code: finalError.code,
            message: finalError.message,
            name: finalError.name,
            stack: finalError.stack,
          })
          
          console.error("")
          console.error("[Firestore] 🚨 DIAGNOSIS: PERMISSION DENIED")
          console.error("[Firestore] 🚨 This means Firestore Security Rules are blocking the query")
          console.error("")
          
          console.error("[Firestore] 📋 COMPLETE DEBUG INFO:")
          console.error("[Firestore]   - Database initialized:", !!db)
          console.error("[Firestore]   - Auth instance exists:", !!auth)
          console.error("[Firestore]   - User authenticated:", !!auth?.currentUser)
          console.error("[Firestore]   - User UID:", auth?.currentUser?.uid || "null")
          console.error("[Firestore]   - User email:", auth?.currentUser?.email || "null")
          console.error("[Firestore]   - Project ID:", projectId || "NOT SET")
          console.error("[Firestore]   - Collection path:", postsRef.path)
          console.error("[Firestore]   - Query type:", "getDocs (list operation)")
          console.error("")
          
          console.error("[Firestore] 🔧 SOLUTION:")
          console.error("[Firestore]   1. Go to: https://console.firebase.google.com/")
          console.error("[Firestore]   2. Select project:", projectId || "v0-membership-prod")
          console.error("[Firestore]   3. Go to: Firestore Database → Rules")
          console.error("[Firestore]   4. Copy ALL content from: firestore.rules.test")
          console.error("[Firestore]   5. Paste and click PUBLISH")
          console.error("[Firestore]   6. Wait 30-60 seconds")
          console.error("[Firestore]   7. Reload this page")
          console.error("")
          
          console.error("[Firestore] 📄 Rules file location: firestore.rules.test")
          console.error("[Firestore] 📄 Rules content preview:")
          console.error("[Firestore]   match /posts/{postId} {")
          console.error("[Firestore]     allow read, write: if request.auth != null;")
          console.error("[Firestore]   }")
          console.error("")
          
          console.error(errorSeparator)
          // Don't throw - return empty array instead to prevent app crash
          console.warn("[Firestore] ⚠️ Returning empty array - posts will not be visible until rules are published")
          return []
        }
      }
    }

    // Helper to safely convert Firestore Timestamp to Date
    const toDate = (value: any): Date => {
      if (!value) return new Date()
      if (value instanceof Date) return value
      if (value && typeof value.toDate === "function") {
        try {
          return value.toDate()
        } catch (_e) {
          return new Date()
        }
      }
      if (typeof value === "string") {
        const date = new Date(value)
        return isNaN(date.getTime()) ? new Date() : date
      }
      if (typeof value === "number") {
        const date = value > 1000000000000 ? new Date(value) : new Date(value * 1000)
        return isNaN(date.getTime()) ? new Date() : date
      }
      return new Date()
    }

    const posts: Post[] = []
    snapshot.forEach((doc) => {
      const data = doc.data()
      
      // Only include published posts (or posts without published field, default to true)
      const isPublished = data.published !== false
      if (!isPublished) return // Skip unpublished posts
      
      posts.push({
        id: doc.id,
        userId: data.userId,
        userNickname: data.userNickname || "",
        userAvatar: data.userAvatar,
        title: data.title || "",
        content: data.content,
        imageUrl: data.imageUrl,
        published: true,
        scheduledAt: data.scheduledAt ? toDate(data.scheduledAt) : undefined,
        likesCount: data.likesCount || 0,
        commentsCount: data.commentsCount || 0,
        createdAt: toDate(data.createdAt),
        updatedAt: toDate(data.updatedAt),
      } as Post)
    })

    // Sort by createdAt descending if not already sorted by query
    posts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    console.log(`[Firestore] ✅ Loaded ${posts.length} published posts from Firestore`)
    return posts
  } catch (error: any) {
    console.error("[Firestore] ❌ Error fetching posts:", error.code, error.message)
    console.error("[Firestore] ❌ Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack?.substring(0, 300),
      authState: auth?.currentUser ? {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
      } : "not authenticated",
    })
    return []
  }
}

export async function createPostInFirestore(postData: Omit<Post, "id" | "createdAt" | "updatedAt">): Promise<Post | null> {
  const db = getFirebaseFirestore()
  if (!db) {
    console.warn("[Firestore] ❌ Database not initialized")
    return null
  }

  // Check authentication
  const { getFirebaseAuth } = await import("./firebase-client")
  const auth = getFirebaseAuth()
  if (!auth || !auth.currentUser) {
    console.error("[Firestore] ❌ User not authenticated - cannot create post")
    console.error("[Firestore] Auth state:", {
      authExists: !!auth,
      currentUser: auth?.currentUser?.uid || "null",
      email: auth?.currentUser?.email || "null",
    })
    return null
  }

  if (auth.currentUser.uid !== postData.userId) {
    console.error("[Firestore] ❌ User ID mismatch:", {
      currentUser: auth.currentUser.uid,
      postUserId: postData.userId,
    })
    return null
  }

  console.log("[Firestore] ✅ User authenticated for post creation:", {
    uid: auth.currentUser.uid,
    email: auth.currentUser.email,
    postUserId: postData.userId,
  })

  try {
    const { collection, addDoc, serverTimestamp } = await import("firebase/firestore")
    const postsRef = collection(db, "posts")
    
    const postDataToSave = {
      userId: postData.userId,
      userNickname: postData.userNickname,
      userAvatar: postData.userAvatar || null,
      title: postData.title || "",
      content: postData.content,
      imageUrl: postData.imageUrl || null,
      published: true,
      likesCount: 0,
      commentsCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    console.log("[Firestore] 📝 Attempting to create post with data:", {
      userId: postDataToSave.userId,
      title: postDataToSave.title.substring(0, 50),
      published: postDataToSave.published,
      hasContent: !!postDataToSave.content,
    })
    
    const docRef = await addDoc(postsRef, postDataToSave)

    console.log("[Firestore] ✅ Post created successfully:", docRef.id)
    
    return {
      ...postData,
      id: docRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  } catch (error: any) {
    console.error("[Firestore] ❌ Error creating post:", error.code, error.message)
    console.error("[Firestore] ❌ Error details:", {
      code: error.code,
      message: error.message,
      stack: error.stack?.substring(0, 300),
      userId: postData.userId,
      currentUser: auth?.currentUser?.uid,
    })
    return null
  }
}

export async function deletePostFromFirestore(postId: string): Promise<boolean> {
  const db = getFirebaseFirestore()
  if (!db) {
    console.warn("[Firestore] Database not initialized")
    return false
  }

  try {
    const { doc, deleteDoc } = await import("firebase/firestore")
    const postRef = doc(db, "posts", postId)
    await deleteDoc(postRef)
    console.log("[Firestore] Post deleted:", postId)
    return true
  } catch (error) {
    console.error("[Firestore] Error deleting post:", error)
    return false
  }
}

