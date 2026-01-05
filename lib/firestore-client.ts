"use client"

import { getFirebaseFirestore } from "./firebase-client"
import type { User } from "./types"

/**
 * Client-side Firestore helper functions
 * These can be used in client components to read/write Firestore data
 * Note: For server-side API routes, use firebase-admin (not available in v0)
 */

export async function getUserFromFirestore(uid: string): Promise<User | null> {
  const db = getFirebaseFirestore()
  if (!db) {
    console.warn("[Firestore] Database not initialized")
    return null
  }

  try {
    const { doc, getDoc } = await import("firebase/firestore")
    const userDoc = await getDoc(doc(db, "users", uid))

    if (!userDoc.exists()) {
      console.log("[Firestore] User not found:", uid)
      return null
    }

    const data = userDoc.data()
    
    // Helper to safely convert Firestore Timestamp to Date
    const toDate = (value: any): Date | undefined => {
      if (!value) return undefined
      if (value instanceof Date) return value
      if (value && typeof value.toDate === "function") {
        // Firestore Timestamp
        try {
          return value.toDate()
        } catch (e) {
          console.warn("[Firestore] Error converting Timestamp to Date:", e)
          return undefined
        }
      }
      if (typeof value === "string") {
        // ISO string
        const date = new Date(value)
        return isNaN(date.getTime()) ? undefined : date
      }
      if (typeof value === "number") {
        // Unix timestamp (seconds or milliseconds)
        const date = value > 1000000000000 ? new Date(value) : new Date(value * 1000)
        return isNaN(date.getTime()) ? undefined : date
      }
      return undefined
    }

    return {
      uid: userDoc.id,
      email: data.email || "",
      nickname: data.nickname || "",
      avatarUrl: data.avatarUrl,
      pointsTotal: data.pointsTotal || 0,
      subscriptionStatus: data.subscriptionStatus || "none",
      subscriptionEnd: toDate(data.subscriptionEnd),
      isManualSubscription: data.isManualSubscription || false,
      isAdmin: data.isAdmin || false, // Important: Read from Firestore
      marketingOptIn: data.marketingOptIn || false,
      createdAt: toDate(data.createdAt) || new Date(),
      updatedAt: toDate(data.updatedAt) || new Date(),
    } as User
  } catch (error) {
    console.error("[Firestore] Error fetching user:", error)
    return null
  }
}

export async function updateUserInFirestore(uid: string, updates: Partial<User>): Promise<boolean> {
  const db = getFirebaseFirestore()
  if (!db) {
    console.warn("[Firestore] Database not initialized")
    return false
  }

  try {
    const { doc, updateDoc } = await import("firebase/firestore")
    const userRef = doc(db, "users", uid)
    
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date(),
    })

    console.log("[Firestore] User updated:", uid)
    return true
  } catch (error) {
    console.error("[Firestore] Error updating user:", error)
    return false
  }
}

export async function createUserInFirestore(userData: Omit<User, "createdAt" | "updatedAt">): Promise<User | null> {
  const db = getFirebaseFirestore()
  if (!db) {
    console.warn("[Firestore] Database not initialized")
    return null
  }

  try {
    const { doc, setDoc, getDoc, serverTimestamp } = await import("firebase/firestore")
    const userRef = doc(db, "users", userData.uid)
    
    // Check if user already exists
    const existingDoc = await getDoc(userRef)
    if (existingDoc.exists()) {
      console.log("[Firestore] User already exists, returning existing data")
      const existingData = existingDoc.data()
      const toDate = (value: any): Date | undefined => {
        if (!value) return undefined
        if (value instanceof Date) return value
        if (value && typeof value.toDate === "function") {
          try {
            return value.toDate()
          } catch (_e) {
            return undefined
          }
        }
        if (typeof value === "string") {
          const date = new Date(value)
          return isNaN(date.getTime()) ? undefined : date
        }
        if (typeof value === "number") {
          const date = value > 1000000000000 ? new Date(value) : new Date(value * 1000)
          return isNaN(date.getTime()) ? undefined : date
        }
        return undefined
      }
      
      return {
        uid: userData.uid,
        email: existingData.email || userData.email,
        nickname: existingData.nickname || userData.nickname,
        avatarUrl: existingData.avatarUrl || userData.avatarUrl,
        pointsTotal: existingData.pointsTotal ?? userData.pointsTotal,
        subscriptionStatus: existingData.subscriptionStatus || userData.subscriptionStatus,
        subscriptionEnd: toDate(existingData.subscriptionEnd) || userData.subscriptionEnd,
        isManualSubscription: existingData.isManualSubscription ?? userData.isManualSubscription,
        isAdmin: existingData.isAdmin ?? userData.isAdmin,
        marketingOptIn: existingData.marketingOptIn ?? userData.marketingOptIn,
        createdAt: toDate(existingData.createdAt) || new Date(),
        updatedAt: toDate(existingData.updatedAt) || new Date(),
      } as User
    }

    // Create new user document
    const now = new Date()
    await setDoc(userRef, {
      email: userData.email,
      nickname: userData.nickname,
      avatarUrl: userData.avatarUrl || null,
      pointsTotal: userData.pointsTotal,
      subscriptionStatus: userData.subscriptionStatus,
      subscriptionEnd: userData.subscriptionEnd || null,
      isManualSubscription: userData.isManualSubscription,
      isAdmin: userData.isAdmin,
      marketingOptIn: userData.marketingOptIn,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log("[Firestore] User created successfully:", userData.uid)
    
    const newUser: User = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    }
    return newUser
  } catch (error) {
    console.error("[Firestore] Error creating user:", error)
    return null
  }
}

