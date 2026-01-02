/**
 * Helper per fare fetch con parsing JSON robusto
 * Gestisce errori di parsing e risposte non-JSON
 */

export interface FetchJsonOptions extends RequestInit {
  skipAuth?: boolean
}

export interface FetchJsonResponse<T = any> {
  success: boolean
  data: T | null
  error: string | null
  errorCode?: string
  status: number
  rawText?: string
}

/**
 * Esegue fetch e parsa la risposta JSON in modo robusto
 * Non crasha mai, ritorna sempre un oggetto con success/error
 */
export async function fetchJson<T = any>(
  url: string,
  options: FetchJsonOptions = {}
): Promise<FetchJsonResponse<T>> {
  const { skipAuth, ...fetchOptions } = options

  try {
    // Aggiungi headers se non presenti
    const headers = new Headers(fetchOptions.headers)
    if (!headers.has("Content-Type") && fetchOptions.body) {
      headers.set("Content-Type", "application/json")
    }

    // Se serve autenticazione, aggiungi token
    if (!skipAuth) {
      try {
        const { getFirebaseIdToken } = await import("./api-helpers")
        const token = await getFirebaseIdToken()
        if (token) {
          headers.set("Authorization", `Bearer ${token}`)
        }
      } catch (authError) {
        // Ignora errori di autenticazione, lascia che l'API risponda
        console.warn("[fetchJson] Could not get auth token:", authError)
      }
    }

    // Esegui fetch
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    })

    // Leggi il body come testo (non come JSON direttamente)
    const text = await response.text()

    // Prova a parsare JSON
    let data: T | null = null
    let parseError: Error | null = null

    if (text && text.trim() !== "") {
      try {
        data = JSON.parse(text) as T
      } catch (jsonError: any) {
        parseError = jsonError
        console.error("[fetchJson] JSON parse error:", {
          url,
          status: response.status,
          statusText: response.statusText,
          textPreview: text.substring(0, 200),
        })
      }
    }

    // Se la risposta non è OK, ritorna errore
    if (!response.ok) {
      const errorMessage =
        (data && typeof data === "object" && "error" in data && typeof data.error === "string"
          ? data.error
          : null) || response.statusText || `HTTP ${response.status}`

      const errorCode =
        (data && typeof data === "object" && "errorCode" in data && typeof data.errorCode === "string"
          ? data.errorCode
          : null) || undefined

      return {
        success: false,
        data: null,
        error: errorMessage,
        errorCode,
        status: response.status,
        rawText: parseError ? text : undefined,
      }
    }

    // Se c'è stato un errore di parsing ma la risposta è OK, è strano ma gestiamolo
    if (parseError) {
      return {
        success: false,
        data: null,
        error: `Invalid JSON response: ${parseError.message}`,
        errorCode: "PARSE_ERROR",
        status: response.status,
        rawText: text,
      }
    }

    // Successo
    return {
      success: true,
      data,
      error: null,
      status: response.status,
    }
  } catch (networkError: any) {
    // Errore di rete o fetch fallito
    console.error("[fetchJson] Network error:", networkError)
    return {
      success: false,
      data: null,
      error: networkError.message || "Network error",
      errorCode: "NETWORK_ERROR",
      status: 0,
    }
  }
}

