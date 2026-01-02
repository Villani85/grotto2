/**
 * Helper per ottenere il token Firebase ID dal client
 * Usa questo helper per aggiungere il token alle richieste API
 */
export async function getFirebaseIdToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const { getFirebaseAuth } = await import("./firebase-client")
    const auth = getFirebaseAuth()
    
    if (!auth || !auth.currentUser) {
      return null
    }

    const { getIdToken } = await import("firebase/auth")
    const token = await getIdToken(auth.currentUser)
    return token
  } catch (error) {
    console.error("[API Helper] Error getting Firebase ID token:", error)
    return null
  }
}

/**
 * Helper per fare fetch con autenticazione Firebase
 * Aggiunge automaticamente il token Firebase ID all'header Authorization
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getFirebaseIdToken()
  
  const headers = new Headers(options.headers)
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    headers,
  })
}




