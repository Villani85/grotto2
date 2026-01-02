"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { AdminRequired } from "@/components/AdminRequired"
import { DemoModeBanner } from "@/components/DemoModeBanner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getFirebaseIdToken } from "@/lib/api-helpers"
import { useAuth } from "@/context/AuthContext"
import { loadBroadcastSdk, createBroadcastClient } from "@/lib/ivs/loadBroadcastSdk"

export default function AdminLivePage() {
  const { user, isLoading: authLoading } = useAuth()
  const [status, setStatus] = useState<string>("Inizializzazione...")
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const [configReady, setConfigReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recordings, setRecordings] = useState<any[]>([])
  const [recordingsLoading, setRecordingsLoading] = useState(false)
  const [importingId, setImportingId] = useState<string | null>(null)
  const [recordingsError, setRecordingsError] = useState<string | null>(null)
  const [recordingsErrorCode, setRecordingsErrorCode] = useState<string | null>(null)
  const [recordingsConfig, setRecordingsConfig] = useState<any>(null)
  const [s3VerifyLoading, setS3VerifyLoading] = useState(false)
  const [s3VerifyResult, setS3VerifyResult] = useState<any>(null)
  const [sdkModule, setSdkModule] = useState<any>(null)
  const [isRequestingScreenShare, setIsRequestingScreenShare] = useState(false)
  const [activeEvent, setActiveEvent] = useState<{ id: string; title: string; slug: string } | null>(null)
  // Public active event state (for visibility check)
  const [publicActiveEvent, setPublicActiveEvent] = useState<{
    id: string
    title: string
    slug: string
    status: string
    playbackUrl?: string
    chatEnabled?: boolean
  } | null>(null)
  const [isLoadingPublicEvent, setIsLoadingPublicEvent] = useState(false)
  const [publicEventError, setPublicEventError] = useState<string | null>(null)
  // Diagnostic state
  const [manifestProbeStatus, setManifestProbeStatus] = useState<{
    status: number | null
    timestamp: string | null
    error: string | null
  } | null>(null)
  const [isProbingManifest, setIsProbingManifest] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clientRef = useRef<any>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const ingestEndpointRef = useRef<string | null>(null)
  const streamKeyRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  // Track component mount state to avoid setState after unmount
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Check HTTPS requirement
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
        setError("HTTPS richiesto per getUserMedia")
        setStatus("Errore: HTTPS richiesto")
      }
    }
  }, [])

  // Load active event (for metadata, with auth)
  const loadActiveEvent = async () => {
    try {
      const token = await getFirebaseIdToken()
      if (!token) return

      const res = await fetch("/api/live-events/active", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await res.json()
      if (data.success && data.event) {
        setActiveEvent({
          id: data.event.id,
          title: data.event.title,
          slug: data.event.slug,
        })
      } else {
        setActiveEvent(null)
      }
    } catch (err) {
      console.warn("[IVS] Error loading active event:", err)
      setActiveEvent(null)
    }
  }

  // Load public active event (no auth required, for visibility check)
  const loadPublicActiveEvent = async () => {
    setIsLoadingPublicEvent(true)
    setPublicEventError(null)

    try {
      const res = await fetch("/api/live-events/active", { cache: "no-store" })
      const text = await res.text()
      let data: any = null

      if (text && text.trim() !== "") {
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          console.error("[AdminLive] JSON parse error:", parseError)
          setPublicEventError("Risposta non valida dal server")
          setPublicActiveEvent(null)
          return
        }
      } else {
        setPublicActiveEvent(null)
        return
      }

      if (!res.ok || !data?.success) {
        setPublicEventError(data?.error || `Errore ${res.status}`)
        setPublicActiveEvent(null)
        return
      }

      if (data.event) {
        setPublicActiveEvent({
          id: data.event.id,
          title: data.event.title,
          slug: data.event.slug,
          status: data.event.status || "live",
          playbackUrl: data.event.playbackUrl,
          chatEnabled: data.event.chatEnabled,
        })
      } else {
        setPublicActiveEvent(null)
      }
    } catch (err: any) {
      console.error("[AdminLive] Error loading public active event:", err)
      setPublicEventError(err.message || "Errore di rete")
      setPublicActiveEvent(null)
    } finally {
      setIsLoadingPublicEvent(false)
    }
  }

  // Load public active event on mount
  useEffect(() => {
    loadPublicActiveEvent()
  }, [])

  // Probe manifest URL for diagnostics
  const probeManifest = async (playbackUrl: string) => {
    if (!playbackUrl) return

    setIsProbingManifest(true)
    setManifestProbeStatus(null)

    try {
      const res = await fetch(playbackUrl, {
        method: "HEAD",
        cache: "no-store",
        signal: AbortSignal.timeout(5000), // 5s timeout
      })

      const status = res.status
      setManifestProbeStatus({
        status,
        timestamp: new Date().toLocaleTimeString("it-IT"),
        error: null,
      })
      
      // If 404 and we're broadcasting, wait a bit and check again (ingest might be delayed)
      if (status === 404 && isBroadcasting) {
        setTimeout(async () => {
          try {
            const retryRes = await fetch(playbackUrl, {
              method: "HEAD",
              cache: "no-store",
              signal: AbortSignal.timeout(5000),
            })
            if (retryRes.status !== 404) {
              setManifestProbeStatus({
                status: retryRes.status,
                timestamp: new Date().toLocaleTimeString("it-IT"),
                error: null,
              })
            } else {
              // Still 404 after delay - likely ingest problem
              setManifestProbeStatus({
                status: 404,
                timestamp: new Date().toLocaleTimeString("it-IT"),
                error: "INGEST PROBLEM (stream non sta arrivando a IVS)",
              })
            }
          } catch {
            // Ignore retry errors
          }
        }, 10000) // 10s delay
      }
    } catch (err: any) {
      // Network errors, CORS, timeouts
      setManifestProbeStatus({
        status: null,
        timestamp: new Date().toLocaleTimeString("it-IT"),
        error: err.name === "AbortError" ? "Timeout" : err.message || "Errore di rete",
      })
    } finally {
      setIsProbingManifest(false)
    }
  }

  // Load IVS config (ingest endpoint + stream key)
  const loadConfig = async () => {
    if (authLoading || !user) return

    try {
      setStatus("Caricamento configurazione...")
      const token = await getFirebaseIdToken()
      if (!token) {
        setError("Token non disponibile")
        setStatus("Errore: Autenticazione richiesta")
        return
      }

      const res = await fetch("/api/admin/ivs/config", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: "Unknown error" }))
        if (errorData.code === "ENV_MISSING") {
          setError(`Configurazione IVS mancante: ${errorData.missing?.join(", ") || "variabili ambiente"}`)
          setStatus("Errore: Configurazione IVS mancante")
        } else {
          setError(errorData.error || `Errore ${res.status}`)
          setStatus(`Errore: ${res.status}`)
        }
        return
      }

      const data = await res.json()
      ingestEndpointRef.current = data.ingestEndpoint
      streamKeyRef.current = data.streamKey
      setConfigReady(true)
      setStatus("Config caricata. Caricamento SDK...")
    } catch (err: any) {
      console.error("[IVS] Error loading config:", err)
      setError(`Errore nel caricamento config: ${err.message}`)
      setStatus("Errore: Config non disponibile")
    }
  }

  // Load SDK after config is ready
  useEffect(() => {
    if (authLoading || !user || error) return
    if (sdkReady || sdkModule) return
    if (!configReady) return

    const loadSDK = async () => {
      try {
        setStatus("Config caricata. Carico SDK...")
        if (process.env.NODE_ENV === "development") {
          console.log("[IVS] Loading SDK...")
        }
        const module = await loadBroadcastSdk()
        if (process.env.NODE_ENV === "development") {
          console.log("[IVS] SDK loaded")
        }
        setSdkModule(module)
        setSdkReady(true)
        setStatus("SDK pronto. Inizializzazione...")
      } catch (err: any) {
        console.error("[IVS] Failed to load SDK:", err)
        const errorMsg = err.message || "Import fallito"
        setError(`Errore nel caricamento SDK IVS: ${errorMsg}`)
        setStatus("Errore: SDK non disponibile")
        // Show specific message for CSP/adblock
        if (errorMsg.includes("CSP") || errorMsg.includes("adblock")) {
          setError(`SDK bloccato: ${errorMsg}`)
        }
      }
    }

    loadSDK()
  }, [configReady, sdkReady, sdkModule, error, authLoading, user])

  // Initialize IVS client when everything is ready
  useEffect(() => {
    if (error && error.includes("env IVS")) return

    const hasConfig = configReady && ingestEndpointRef.current && streamKeyRef.current
    const hasSDK = sdkReady && sdkModule
    const hasCanvas = canvasRef.current

    if (!hasConfig || !hasSDK || !hasCanvas || error) {
      // Debug logging (dev only)
      if (process.env.NODE_ENV !== "production") {
        console.log("[IVS] Init gates:", {
          configReady: String(configReady),
          hasIngestEndpoint: String(!!ingestEndpointRef.current),
          hasStreamKey: String(!!streamKeyRef.current),
          sdkReady: String(sdkReady),
          hasSDKModule: String(!!sdkModule),
          hasCanvas: String(hasCanvas),
          error: error ? String(error) : "null",
        })
      }
      return
    }

    const initClient = async () => {
      try {
        if (!sdkModule) {
          throw new Error("SDK module not loaded")
        }

        const ingestEndpoint = ingestEndpointRef.current
        if (!ingestEndpoint) {
          throw new Error("Ingest endpoint not available")
        }

        // Create client using helper
        const client = createBroadcastClient(sdkModule, ingestEndpoint)
        client.attachPreview(canvasRef.current!)

        // Get camera + mic
        if (process.env.NODE_ENV === "development") {
          console.log("[IVS] Requesting camera/mic...")
        }
        const cameraStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })
        if (process.env.NODE_ENV === "development") {
          console.log("[IVS] Camera granted")
        }

        cameraStreamRef.current = cameraStream

        // Add video/audio with runtime compatibility
        // Try MediaStream first, fallback to MediaStreamTrack if needed
        try {
          client.addVideoInputDevice(cameraStream, "video1", { index: 0 })
        } catch (streamError: any) {
          // Fallback: try with MediaStreamTrack
          const videoTrack = cameraStream.getVideoTracks?.[0]
          if (videoTrack) {
            client.addVideoInputDevice(videoTrack, "video1", { index: 0 })
          } else {
            throw new Error("No video track available")
          }
        }

        // Add audio if available
        if (cameraStream.getAudioTracks && cameraStream.getAudioTracks().length > 0) {
          try {
            client.addAudioInputDevice(cameraStream, "audio1")
          } catch (streamError: any) {
            // Fallback: try with MediaStreamTrack
            const audioTrack = cameraStream.getAudioTracks()[0]
            if (audioTrack) {
              client.addAudioInputDevice(audioTrack, "audio1")
            }
          }
        } else {
          console.warn("[IVS] No audio tracks available, skipping audio input")
        }

        clientRef.current = client
        if (process.env.NODE_ENV === "development") {
          console.log("[IVS] Client created")
        }
        setStatus("Pronto (Camera attiva)")
      } catch (err: any) {
        console.error("Error initializing IVS client:", err)
        setError(err.message || "Errore nell'inizializzazione")
        setStatus("Errore: " + (err.message || "Inizializzazione fallita"))
      }
    }

    initClient()

    // Cleanup on unmount
    return () => {
      if (clientRef.current && isBroadcasting) {
        try {
          clientRef.current.stopBroadcast()
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [configReady, sdkReady, sdkModule, error])

  // Load config when auth is ready
  useEffect(() => {
    if (authLoading || !user) return
    if (configReady) return

    loadConfig()
  }, [error, authLoading, user, configReady])

  const startBroadcast = async () => {
    if (!clientRef.current || !streamKeyRef.current) {
      setError("Client o stream key non disponibili")
      return
    }

    try {
      await clientRef.current.startBroadcast(streamKeyRef.current)
      setIsBroadcasting(true)
      setStatus("🔴 IN ONDA!")

      // Save stream metadata to Firestore
      try {
        const token = await getFirebaseIdToken()
        if (token && user) {
          const res = await fetch("/api/admin/ivs/recordings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "start",
              streamKey: streamKeyRef.current,
              startedBy: user.uid,
              startedAt: new Date().toISOString(),
              ...(activeEvent && { eventSlug: activeEvent.slug }),
            }),
          })

          // Robust response handling
          const responseText = await res.text()
          try {
            const data = responseText ? JSON.parse(responseText) : {}
            if (!res.ok) {
              console.warn("[IVS] Failed to save start metadata:", data.error || data.message)
            }
          } catch (parseError) {
            console.warn("[IVS] Failed to parse start metadata response:", parseError)
          }
        }
      } catch (metadataError: any) {
        // Don't block broadcast if metadata save fails
        console.warn("[IVS] Failed to save stream metadata:", metadataError)
      }
    } catch (err: any) {
      console.error("[IVS] Error starting broadcast:", err)
      const errorMsg = err.message || "Errore nell'avvio broadcast"
      if (process.env.NODE_ENV === "development") {
        console.error("[IVS] Broadcast failed:", errorMsg)
      }
      setError(errorMsg)
      setStatus("Errore: " + errorMsg)
    }
  }

  const stopBroadcast = async () => {
    if (!clientRef.current) return

    try {
      clientRef.current.stopBroadcast()
      setIsBroadcasting(false)
      setStatus("Offline")

      // Save stream end metadata to Firestore (idempotent)
      try {
        const token = await getFirebaseIdToken()
        if (token && user) {
          const res = await fetch("/api/admin/ivs/recordings", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              action: "stop",
              streamKey: streamKeyRef.current,
              stoppedBy: user.uid,
              stoppedAt: new Date().toISOString(),
              ...(activeEvent && { eventSlug: activeEvent.slug }),
            }),
          })

          // Robust JSON parsing
          const responseText = await res.text()
          let data: any
          try {
            data = responseText ? JSON.parse(responseText) : {}
          } catch (parseError: any) {
            console.warn("[IVS] Failed to parse stop response:", parseError)
            data = {}
          }

          if (res.ok && data.success) {
            setStatus("STOP completato")
          } else {
            console.warn("[IVS] Stop metadata save warning:", data.error || data.message || "Unknown error")
          }
        }
      } catch (metadataError: any) {
        // Don't block stop if metadata save fails
        console.warn("[IVS] Failed to save stream end metadata:", metadataError)
      }
    } catch (err: any) {
      console.error("Error stopping broadcast:", err)
      setError(err.message || "Errore nello stop broadcast")
    }
  }

  // Helper to classify errors
  const isUserCancelledShare = (e: any) => e?.name === "NotAllowedError" || e?.name === "AbortError"
  const isNoSourceSelected = (e: any) => e?.name === "NotFoundError"

  // Safe restore camera helper (checks mount state)
  const safeRestoreCamera = async () => {
    if (!mountedRef.current) return
    await restoreCamera()
  }

  const restoreCamera = async () => {
    if (!clientRef.current || !cameraStreamRef.current) return

    try {
      // Stop and clean up screen stream if exists
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null
      }

      // Remove current video device
      if (typeof clientRef.current.removeVideoInputDevice === "function") {
        try {
          clientRef.current.removeVideoInputDevice("video1")
        } catch (e) {
          // Ignore if remove fails
        }
      }

      // Re-add camera stream with compatibility
      const cameraStream = cameraStreamRef.current
      try {
        await clientRef.current.addVideoInputDevice(cameraStream, "video1", { index: 0 })
      } catch (streamError: any) {
        // Fallback: try with MediaStreamTrack
        const videoTrack = cameraStream.getVideoTracks?.[0]
        if (videoTrack) {
          await clientRef.current.addVideoInputDevice(videoTrack, "video1", { index: 0 })
        } else {
          throw new Error("No video track available")
        }
      }

      if (mountedRef.current) {
        setIsScreenSharing(false)
        setStatus(isBroadcasting ? "🔴 IN ONDA!" : "Pronto (Camera attiva)")
      }
    } catch (err: any) {
      console.error("Error restoring camera:", err)
      if (mountedRef.current) {
        setError(err.message || "Errore nel ripristino camera")
      }
    }
  }

  const toggleScreenShare = async () => {
    // Guard clauses
    if (!clientRef.current) {
      if (mountedRef.current) {
        setStatus("⚠️ Client IVS non pronto")
      }
      return
    }

    if (isRequestingScreenShare) {
      return // Avoid double click
    }

    // If already sharing, stop and restore camera
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop())
        screenStreamRef.current = null
      }

      await restoreCamera()
      if (mountedRef.current) {
        setStatus("📷 Camera ripristinata")
      }
      return
    }

    // Start screen share: request permission
    setIsRequestingScreenShare(true)
    if (mountedRef.current) {
      setStatus("🖥️ Seleziona uno schermo/finestra da condividere…")
    }

    try {
      // Request screen share (this opens the popup)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      })

      // Validate that we have at least one video track
      if (!screenStream.getVideoTracks || screenStream.getVideoTracks().length === 0) {
        screenStream.getTracks().forEach((track) => track.stop())
        if (mountedRef.current) {
          setStatus("⚠️ Nessuna traccia video dallo schermo")
        }
        return
      }

      // Save screen stream BEFORE swapping
      screenStreamRef.current = screenStream

      // Attach onended handler BEFORE swapping (so it fires if user stops from Chrome)
      const screenTrack = screenStream.getVideoTracks()[0]
      screenTrack.onended = () => {
        if (!mountedRef.current) return
        safeRestoreCamera()
      }

      // NOW do the swap: remove camera, add screen
      if (typeof clientRef.current.removeVideoInputDevice === "function") {
        try {
          clientRef.current.removeVideoInputDevice("video1")
        } catch (e) {
          // Ignore if remove fails
        }
      }

      // Add screen stream with compatibility
      try {
        await clientRef.current.addVideoInputDevice(screenStream, "video1", { index: 0 })
      } catch (streamError: any) {
        // Fallback: try with MediaStreamTrack
        const videoTrack = screenStream.getVideoTracks?.[0]
        if (videoTrack) {
          await clientRef.current.addVideoInputDevice(videoTrack, "video1", { index: 0 })
        } else {
          throw new Error("No screen video track available")
        }
      }

      // Update state only after successful swap
      if (mountedRef.current) {
        setIsScreenSharing(true)
        setStatus("🖥️ Condivisione schermo attiva")
      }
    } catch (err: any) {
      // Handle errors gracefully
      if (isUserCancelledShare(err)) {
        // User cancelled or denied permission - no error, just status message
        if (mountedRef.current) {
          setStatus("🛑 Condivisione schermo annullata o permesso negato")
          setIsScreenSharing(false)
          // DO NOT touch video1 - camera must remain active
        }
        return
      }

      if (isNoSourceSelected(err)) {
        if (mountedRef.current) {
          setStatus("⚠️ Nessuna sorgente selezionata")
        }
        return
      }

      // Real errors: log but don't break UX
      console.error("Error toggling screen share:", err)
      if (mountedRef.current) {
        setStatus(`❌ Errore condivisione schermo: ${err?.name ?? "Unknown"}`)
        // DO NOT touch video1 - camera must remain active
      }
    } finally {
      // Always reset requesting state
      if (mountedRef.current) {
        setIsRequestingScreenShare(false)
      }
    }
  }

  // Disable buttons if config is missing or SDK not ready
  const isDisabled =
    !configReady ||
    !sdkReady ||
    !!error ||
    !clientRef.current ||
    !ingestEndpointRef.current ||
    !streamKeyRef.current

  // Load recordings from S3
  const loadRecordings = async () => {
    try {
      setRecordingsLoading(true)
      // Reset error states
      setRecordingsError(null)
      setRecordingsErrorCode(null)
      setRecordingsConfig(null)

      const token = await getFirebaseIdToken()
      if (!token) {
        console.warn("[IVS] No token available for loading recordings")
        return
      }

      const res = await fetch("/api/admin/ivs/recordings/list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Always parse JSON (even on error)
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        // Handle error response
        setRecordings([])
        setRecordingsError(data.error || "Errore caricamento registrazioni")
        setRecordingsErrorCode(data.errorCode || null)
        setRecordingsConfig(data.config || null)
        return
      }

      // Check for errorCode even in 200 response (extra safety)
      if (data.errorCode) {
        setRecordings([])
        setRecordingsError(data.error || "Errore configurazione")
        setRecordingsErrorCode(data.errorCode)
        setRecordingsConfig(data.config || null)
        return
      }

      // Success: set recordings
      setRecordings(data.recordings || [])
      // Set error if present but not blocking (informative)
      if (data.error) {
        setRecordingsError(data.error)
      }
    } catch (err: any) {
      console.error("[IVS] Error loading recordings:", err)
      setRecordings([])
      setRecordingsError(err.message || "Errore nel caricamento registrazioni")
    } finally {
      setRecordingsLoading(false)
    }
  }

  // Verify S3 configuration
  const verifyS3 = async () => {
    setS3VerifyLoading(true)
    setS3VerifyResult(null)

    try {
      const token = await getFirebaseIdToken()
      if (!token) {
        setS3VerifyResult({
          success: false,
          status: "ERROR",
          errorCode: "AUTH_ERROR",
          message: "Token non disponibile",
        })
        return
      }

      const res = await fetch("/api/admin/ivs/recordings/verify", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      // Always parse JSON (even on error)
      const data = await res.json().catch(() => ({}))

      setS3VerifyResult({
        httpOk: res.ok,
        httpStatus: res.status,
        ...data,
      })
    } catch (err: any) {
      console.error("[IVS] Error verifying S3:", err)
      setS3VerifyResult({
        success: false,
        status: "ERROR",
        errorCode: "NETWORK_ERROR",
        message: "Network error",
        error: {
          name: err?.name || "NetworkError",
          message: err?.message || "Failed to verify S3",
        },
      })
    } finally {
      setS3VerifyLoading(false)
    }
  }

  // Import recording
  const importRecording = async (recording: any) => {
    if (!recording.endedKey || !recording.prefix) {
      alert("Dati registrazione incompleti")
      return
    }

    const title = prompt("Inserisci un titolo per questa registrazione:", `Registrazione ${new Date(recording.endedAt || Date.now()).toLocaleString("it-IT")}`)
    if (!title) return

    try {
      setImportingId(recording.endedKey)
      const token = await getFirebaseIdToken()
      if (!token) {
        alert("Autenticazione non disponibile")
        return
      }

      const res = await fetch("/api/admin/ivs/recordings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          endedKey: recording.endedKey,
          prefix: recording.prefix,
        }),
      })

      // Robust JSON parsing
      const text = await res.text()
      let data: any = null
      if (text && text.trim() !== "") {
        try {
          data = JSON.parse(text)
        } catch (parseError) {
          console.error("[IVS] JSON parse error:", parseError)
          alert("Errore: risposta non valida dal server")
          return
        }
      }

      if (!res.ok) {
        // Handle specific case: recording already imported (409)
        if (res.status === 409 && data?.error === "Recording already imported") {
          const existingId = data.id || "sconosciuto"
          alert(`Questa registrazione è già stata importata.\nID: ${existingId}`)
          // Reload recordings to refresh list
          await loadRecordings()
          return
        }

        // Other errors
        const errorMessage = data?.error || `Errore ${res.status}`
        alert(`Errore nell'importazione: ${errorMessage}`)
        return
      }

      // Success
      if (data?.id) {
        alert(`Registrazione importata con successo! ID: ${data.id}`)
      } else {
        alert("Registrazione importata con successo!")
      }
      // Reload recordings to show updated list
      await loadRecordings()
    } catch (err: any) {
      // Network errors or other unexpected errors
      console.error("[IVS] Error importing recording:", err)
      alert(`Errore nell'importazione: ${err.message || "Errore di rete"}`)
    } finally {
      setImportingId(null)
    }
  }

  return (
    <AdminRequired>
      <div className="py-8">
        <DemoModeBanner />

        <Card>
          <CardHeader>
            <CardTitle>Studio Diretta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Public Active Event Status Box */}
            <div className="rounded-md border p-4 space-y-3">
              {isLoadingPublicEvent ? (
                <div className="text-sm text-muted-foreground">Carico evento attivo...</div>
              ) : publicEventError ? (
                <div className="space-y-2">
                  <p className="text-sm text-destructive">
                    ⚠️ Impossibile verificare evento attivo: {publicEventError}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadPublicActiveEvent}
                  >
                    Riprova
                  </Button>
                </div>
              ) : publicActiveEvent ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-green-700 dark:text-green-400">
                      ✅ Evento attivo pubblicato
                    </h3>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                      VISIBILE AGLI UTENTI ✅
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Titolo:</strong> {publicActiveEvent.title}
                    </p>
                    <p>
                      <strong>Slug:</strong> {publicActiveEvent.slug}
                    </p>
                    <p>
                      <strong>Status:</strong> {publicActiveEvent.status}
                    </p>
                  </div>

                  {/* Diagnostic Section */}
                  {publicActiveEvent.playbackUrl && (
                    <div className="mt-4 p-3 bg-muted rounded-md border space-y-2">
                      <div className="font-semibold text-xs mb-2">🔧 Diagnostica Playback</div>
                      
                      {/* Playback URLs Comparison */}
                      <div className="space-y-1 text-xs">
                        <div>
                          <strong>Event Playback URL:</strong>
                          <code className="block mt-1 p-1 bg-background rounded text-xs break-all">
                            {publicActiveEvent.playbackUrl}
                          </code>
                        </div>
                        {process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL && (
                          <>
                            <div>
                              <strong>Env Playback URL:</strong>
                              <code className="block mt-1 p-1 bg-background rounded text-xs break-all">
                                {process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL}
                              </code>
                            </div>
                            <div className="flex items-center gap-2">
                              <strong>Match:</strong>
                              {publicActiveEvent.playbackUrl === process.env.NEXT_PUBLIC_IVS_PLAYBACK_URL ? (
                                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                                  ✅ MATCH
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                                  ❌ MISMATCH
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Manifest Probe */}
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => probeManifest(publicActiveEvent.playbackUrl!)}
                          disabled={isProbingManifest}
                          className="text-xs"
                        >
                          {isProbingManifest ? "Probing..." : "🔍 Probe Manifest"}
                        </Button>

                        {manifestProbeStatus && (
                          <div className="space-y-1 text-xs">
                            {manifestProbeStatus.status !== null ? (
                              <>
                                <div className="flex items-center gap-2">
                                  <strong>Manifest Status:</strong>
                                  <span
                                    className={
                                      manifestProbeStatus.status === 200
                                        ? "text-green-600 font-semibold"
                                        : manifestProbeStatus.status === 404
                                        ? "text-muted-foreground font-semibold"
                                        : "text-yellow-600 font-semibold"
                                    }
                                  >
                                    {manifestProbeStatus.status}
                                  </span>
                                  <span className="text-muted-foreground">
                                    ({manifestProbeStatus.timestamp})
                                  </span>
                                </div>
                                {manifestProbeStatus.status === 404 && (
                                  <div className={`p-2 border rounded text-xs ${
                                    isBroadcasting
                                      ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200"
                                      : "bg-muted border-muted-foreground/20 text-muted-foreground"
                                  }`}>
                                    {isBroadcasting ? (
                                      <>
                                        ⚠️ <strong>INGEST PROBLEM</strong>: Stream non sta arrivando a IVS. Verifica endpoint/key o attendi 10-15s.
                                      </>
                                    ) : (
                                      <>
                                        ℹ️ <strong>OFFLINE</strong> (non in onda). Normale quando non stai trasmettendo.
                                      </>
                                    )}
                                  </div>
                                )}
                                {manifestProbeStatus.error && manifestProbeStatus.error.includes("INGEST PROBLEM") && (
                                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                                    ⚠️ <strong>INGEST PROBLEM</strong>: Stream non sta arrivando a IVS dopo 10s. Verifica endpoint/key/config.
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-red-600 text-xs">
                                <strong>Errore:</strong> {manifestProbeStatus.error || "Errore sconosciuto"}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    <Link href={`/live/${publicActiveEvent.slug}`} target="_blank">
                      <Button type="button" variant="outline" size="sm">
                        Apri pagina pubblica
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadPublicActiveEvent}
                    >
                      Aggiorna stato evento
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Gli utenti vedranno questo evento in /live
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-yellow-700 dark:text-yellow-400">
                      ⚠️ Nessun evento attivo pubblicato
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    La diretta può essere attiva, ma gli utenti vedranno "Nessuna diretta" finché non
                    pubblichi e attivi un evento.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Link href="/admin/live-events">
                      <Button type="button" variant="outline" size="sm">
                        Gestisci eventi
                      </Button>
                    </Link>
                    <Link href="/admin/live-events/new">
                      <Button type="button" variant="outline" size="sm">
                        Crea evento
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={loadPublicActiveEvent}
                    >
                      Aggiorna stato evento
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Info: Recording */}
            <div className="rounded-md border border-blue-500/50 bg-blue-500/10 p-3 text-sm">
              <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">📹 Registrazione Diretta</p>
              <p className="text-blue-600 dark:text-blue-300">
                La registrazione della diretta viene salvata automaticamente su AWS S3 tramite IVS Recording.
                I metadati (data, durata, playback URL) vengono salvati in Firestore.
              </p>
            </div>

            {/* Status */}
            <div className="text-center">
              <p className="text-lg font-semibold">{status}</p>
              {error && (
                <div className="mt-2 space-y-2">
                  <p className="text-sm text-destructive">{error}</p>
                  {(error.includes("Token non disponibile") || error.includes("env IVS")) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setError(null)
                        setStatus("Riprova...")
                        window.location.reload()
                      }}
                    >
                      Riprova
                    </Button>
                  )}
                </div>
              )}

              {/* Debug box (dev only) */}
              {process.env.NODE_ENV !== "production" &&
                (status.includes("attesa") || status.includes("Carico SDK") || status.includes("Inizializzazione")) &&
                !error && (
                  <div className="mt-4 p-3 bg-muted rounded-md text-left text-xs">
                    <p className="font-semibold mb-1">Debug Gates:</p>
                    <ul className="space-y-1">
                      <li>Config: {configReady ? "✅" : "❌"}</li>
                      <li>SDK: {sdkReady ? "✅" : "❌"}</li>
                      <li>SDK Module: {sdkModule ? "✅" : "❌"}</li>
                      <li>Ingest Endpoint: {ingestEndpointRef.current ? "✅" : "❌"}</li>
                      <li>Stream Key: {streamKeyRef.current ? "✅" : "❌"}</li>
                      <li>Canvas: {canvasRef.current ? "✅" : "❌"}</li>
                      <li>IVS Client: {clientRef.current ? "✅" : "❌"}</li>
                    </ul>
                  </div>
                )}
            </div>

            {/* Canvas Preview */}
            <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
              <canvas
                ref={canvasRef}
                className="w-full h-full bg-black rounded-lg"
                style={{ objectFit: "contain" }}
              />
            </div>

            {/* Controls */}
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                onClick={startBroadcast}
                disabled={isDisabled || isBroadcasting}
                variant="default"
                size="lg"
                className="bg-red-600 hover:bg-red-700"
              >
                🔴 VAI LIVE
              </Button>

              <Button
                onClick={toggleScreenShare}
                disabled={isDisabled || isRequestingScreenShare || !clientRef.current}
                variant="outline"
                size="lg"
              >
                🖥️ {isRequestingScreenShare ? "Attendi…" : isScreenSharing ? "Stop Schermo" : "Condividi Schermo"}
              </Button>

              <Button
                onClick={stopBroadcast}
                disabled={!isBroadcasting}
                variant="destructive"
                size="lg"
              >
                ⬛ STOP
              </Button>
            </div>

            {/* Recordings Section */}
            <div className="mt-8 pt-8 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Registrazioni da S3</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={verifyS3}
                    disabled={s3VerifyLoading}
                  >
                    {s3VerifyLoading ? "Verifica..." : "✅ Verifica S3"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadRecordings}
                    disabled={recordingsLoading}
                  >
                    {recordingsLoading ? "Caricamento..." : "🔄 Aggiorna elenco"}
                </Button>
                </div>
              </div>

              {/* S3 Verification Result */}
              {s3VerifyResult && (
                <div className="mb-4">
                  {s3VerifyResult.errorCode === "AWS_NOT_CONFIGURED" ? (
                    <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
                      <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                        ⚠️ AWS non configurato
                      </h4>
                      <p className="text-sm text-yellow-600 dark:text-yellow-300 mb-2">{s3VerifyResult.message}</p>
                      {s3VerifyResult.config && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1">
                          <p>
                            Access Key: {s3VerifyResult.config.hasAccessKey ? "✅" : "❌"} | Secret Key:{" "}
                            {s3VerifyResult.config.hasSecretKey ? "✅" : "❌"}
                          </p>
                          <p>Region: {s3VerifyResult.config.region}</p>
                          <p>Bucket: {s3VerifyResult.config.bucket || "(non configurato)"}</p>
                          <p>Prefix: {s3VerifyResult.config.prefix}</p>
                        </div>
                      )}
                    </div>
                  ) : s3VerifyResult.errorCode === "AWS_INVALID_CREDENTIALS" ? (
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                        ❌ Credenziali AWS non valide
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mb-2">{s3VerifyResult.message}</p>
                      {s3VerifyResult.error && (
                        <p className="text-xs text-red-500 dark:text-red-400 font-mono">
                          {s3VerifyResult.error.name} (HTTP {s3VerifyResult.error.httpStatus})
                        </p>
                      )}
                    </div>
                  ) : s3VerifyResult.errorCode === "AWS_ACCESS_DENIED" ? (
                    <div className="rounded-md border border-orange-500/50 bg-orange-500/10 p-4">
                      <h4 className="font-semibold text-orange-700 dark:text-orange-400 mb-2">
                        ⚠️ Permessi S3 insufficienti
                      </h4>
                      <p className="text-sm text-orange-600 dark:text-orange-300 mb-2">{s3VerifyResult.message}</p>
                      <p className="text-xs text-orange-500 dark:text-orange-400">
                        Verifica che l'utente AWS abbia permessi s3:ListBucket e s3:GetObject sul bucket.
                      </p>
                    </div>
                  ) : s3VerifyResult.errorCode === "AWS_BUCKET_NOT_FOUND" ? (
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">❌ Bucket non trovato</h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mb-2">{s3VerifyResult.message}</p>
                      {s3VerifyResult.config && (
                        <p className="text-xs text-red-500 dark:text-red-400 font-mono">
                          Bucket: {s3VerifyResult.config.bucket}
                        </p>
                      )}
                    </div>
                  ) : s3VerifyResult.errorCode === "AWS_REGION_MISMATCH" ? (
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                        ❌ Region mismatch / redirect
                      </h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mb-2">{s3VerifyResult.message}</p>
                      {s3VerifyResult.config && (
                        <p className="text-xs text-red-500 dark:text-red-400">
                          Verifica che AWS_REGION corrisponda alla region del bucket. Region configurata:{" "}
                          {s3VerifyResult.config.region}
                        </p>
                      )}
                    </div>
                  ) : s3VerifyResult.status === "OK_EMPTY_PREFIX" ? (
                    <div className="rounded-md border border-blue-500/50 bg-blue-500/10 p-4">
                      <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">ℹ️ S3 OK, ma prefix vuoto</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-300 mb-2">{s3VerifyResult.message}</p>
                      {s3VerifyResult.config && (
                        <div className="text-xs text-blue-500 dark:text-blue-400 space-y-1">
                          <p>Region: {s3VerifyResult.config.region}</p>
                          <p>Bucket: {s3VerifyResult.config.bucket}</p>
                          <p>Prefix: {s3VerifyResult.config.prefix}</p>
                        </div>
                      )}
                    </div>
                  ) : s3VerifyResult.status === "OK" ? (
                    <div className="rounded-md border border-green-500/50 bg-green-500/10 p-4">
                      <h4 className="font-semibold text-green-700 dark:text-green-400 mb-2">✅ S3 OK</h4>
                      <p className="text-sm text-green-600 dark:text-green-300 mb-2">{s3VerifyResult.message}</p>
                      {s3VerifyResult.config && (
                        <div className="text-xs text-green-600 dark:text-green-300 space-y-1 mb-2">
                          <p>Region: {s3VerifyResult.config.region}</p>
                          <p>Bucket: {s3VerifyResult.config.bucket}</p>
                          <p>Prefix: {s3VerifyResult.config.prefix}</p>
                          <p>Oggetti trovati: {s3VerifyResult.count}</p>
                          {s3VerifyResult.endedJsonCount !== undefined && (
                            <p>Recording-ended.json: {s3VerifyResult.endedJsonCount}</p>
                          )}
                        </div>
                      )}
                      {s3VerifyResult.sampleKeys && s3VerifyResult.sampleKeys.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1">
                            Prime chiavi trovate:
                          </p>
                          <ul className="text-xs font-mono text-green-600 dark:text-green-300 space-y-1 max-h-32 overflow-y-auto">
                            {s3VerifyResult.sampleKeys.slice(0, 5).map((key: string, idx: number) => (
                              <li key={idx} className="truncate">
                                {key}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-md border border-red-500/50 bg-red-500/10 p-4">
                      <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">❌ Errore verifica S3</h4>
                      <p className="text-sm text-red-600 dark:text-red-300 mb-2">
                        {s3VerifyResult.message || "Errore sconosciuto"}
                      </p>
                      {s3VerifyResult.error && (
                        <div className="text-xs text-red-500 dark:text-red-400 font-mono">
                          <p>
                            {s3VerifyResult.error.name} (HTTP {s3VerifyResult.error.httpStatus})
                          </p>
                          <p className="truncate">{s3VerifyResult.error.message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* AWS Not Configured State */}
              {recordingsErrorCode === "AWS_NOT_CONFIGURED" ? (
                <div className="rounded-md border border-yellow-500/50 bg-yellow-500/10 p-4">
                  <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                    ⚠️ AWS non configurato
                  </h4>
                  <p className="text-sm text-yellow-600 dark:text-yellow-300 mb-3">
                    Per leggere le registrazioni da S3 devi impostare le variabili d'ambiente AWS_* lato server.
                  </p>
                  <div className="space-y-2 mb-3">
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">Variabili richieste:</p>
                    <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1 ml-4 list-disc">
                      <li>
                        <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">AWS_ACCESS_KEY_ID</code>{" "}
                        {recordingsConfig?.hasAccessKey ? "✅" : "❌"}
                      </li>
                      <li>
                        <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">AWS_SECRET_ACCESS_KEY</code>{" "}
                        {recordingsConfig?.hasSecretKey ? "✅" : "❌"}
                      </li>
                      <li>
                        <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">AWS_REGION</code> (opzionale)
                      </li>
                      <li>
                        <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">AWS_S3_RECORDINGS_BUCKET</code> (opzionale)
                      </li>
                      <li>
                        <code className="bg-yellow-100 dark:bg-yellow-900/30 px-1 rounded">AWS_S3_RECORDINGS_PREFIX</code> (opzionale)
                      </li>
                    </ul>
                  </div>
                  {recordingsConfig && (
                    <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-xs font-mono text-yellow-700 dark:text-yellow-300">
                      <p className="font-semibold mb-1">Configurazione rilevata:</p>
                      <p>Region: {recordingsConfig.region}</p>
                      <p>Bucket: {recordingsConfig.bucket}</p>
                      <p>Prefix: {recordingsConfig.prefix}</p>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadRecordings}
                    disabled={recordingsLoading}
                    className="mt-3"
                  >
                    {recordingsLoading ? "Caricamento..." : "Ho configurato le env → Aggiorna elenco"}
                  </Button>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nessuna registrazione trovata in S3.</p>
                  <p className="text-sm mt-2">Clicca "Aggiorna elenco" per cercare nuove registrazioni.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recordings.map((recording, idx) => (
                    <div
                      key={recording.endedKey || idx}
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {recording.endedAt
                            ? new Date(recording.endedAt).toLocaleString("it-IT")
                            : "Data sconosciuta"}
                        </p>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          {recording.channelId && <span>Channel: {recording.channelId}</span>}
                          {recording.duration && <span>Durata: {Math.round(recording.duration / 60)}m</span>}
                          <span className={recording.hasMediaHls ? "text-green-600" : "text-yellow-600"}>
                            {recording.hasMediaHls ? "✅ HLS disponibile" : "⚠️ HLS non trovato"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 font-mono">{recording.prefix}</p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => importRecording(recording)}
                        disabled={importingId === recording.endedKey}
                      >
                        {importingId === recording.endedKey ? "Importazione..." : "📥 Importa"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminRequired>
  )
}
