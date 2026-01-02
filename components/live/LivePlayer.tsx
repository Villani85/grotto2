"use client"

import { useEffect, useRef, useState } from "react"
import Script from "next/script"

declare global {
  interface Window {
    IVSPlayer: any
  }
}

interface LivePlayerProps {
  playbackUrl: string
  className?: string
  onError?: (error: string) => void
}

export function LivePlayer({ playbackUrl, className = "", onError }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)
  const [playerError, setPlayerError] = useState<string | null>(null)

  useEffect(() => {
    // Reset error when playbackUrl changes
    setPlayerError(null)
    
    if (!playbackUrl) {
      console.error("[LivePlayer] playbackUrl not provided")
      return
    }

    // Initialize player when SDK is ready
    const initPlayer = () => {
      if (!window.IVSPlayer || !videoRef.current) return

      try {
        const player = window.IVSPlayer.create()
        player.attachHTMLVideoElement(videoRef.current)
        
        // Listen for errors
        player.addEventListener(window.IVSPlayer.PlayerEventType.ERROR, (error: any) => {
          const errorCode = error.error?.code
          const errorMsg = error.error?.message || "Unknown player error"
          console.error("[LivePlayer] Player error:", errorCode, errorMsg)
          
          // Map error codes to user-friendly messages
          let userMessage = errorMsg
          if (errorCode === "NotAuthorized" || errorCode === 403) {
            userMessage = "Diretta privata / autorizzazione mancante"
          } else if (errorCode === "NotFound" || errorCode === 404 || errorMsg.includes("404")) {
            userMessage = "Diretta offline"
          }
          
          setPlayerError(userMessage)
          if (onError) {
            onError(userMessage)
          }
        })
        
        player.load(playbackUrl)
        playerRef.current = player
      } catch (err: any) {
        console.error("[LivePlayer] Error initializing IVS player:", err)
        if (onError) {
          onError(err.message || "Failed to initialize player")
        }
      }
    }

    // Check if SDK is already loaded
    if (window.IVSPlayer) {
      initPlayer()
    } else {
      // Wait for SDK to load
      const checkInterval = setInterval(() => {
        if (window.IVSPlayer) {
          clearInterval(checkInterval)
          initPlayer()
        }
      }, 100)

      // Cleanup
      return () => {
        clearInterval(checkInterval)
        if (playerRef.current) {
          try {
            playerRef.current.delete()
          } catch (e) {
            // Ignore cleanup errors
          }
        }
      }
    }
  }, [playbackUrl, onError])

  if (!playbackUrl) {
    return (
      <div className={`flex items-center justify-center bg-black rounded-lg ${className}`} style={{ aspectRatio: "16/9" }}>
        <p className="text-white">Stream non disponibile</p>
      </div>
    )
  }

  if (playerError) {
    return (
      <div className={`flex items-center justify-center bg-black rounded-lg ${className}`} style={{ aspectRatio: "16/9" }}>
        <div className="text-center space-y-2">
          <p className="text-white text-lg font-semibold">{playerError}</p>
          {playerError === "Diretta offline" && (
            <p className="text-gray-400 text-sm">La diretta non è attualmente disponibile.</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://player.live-video.net/1.4.1/amazon-ivs-player.min.js"
        strategy="afterInteractive"
      />
      <div className={`relative w-full bg-black rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
          controls
        />
      </div>
    </>
  )
}


