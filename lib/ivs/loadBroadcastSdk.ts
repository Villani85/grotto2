/**
 * Client-only helper to load AWS IVS Broadcast SDK
 * Uses npm package import (primary) with fallback to CDN script (dev only)
 */

export async function loadBroadcastSdk(): Promise<any> {
  // Primary: npm import (works in all environments)
  try {
    const mod = await import("amazon-ivs-web-broadcast")
    
    // Check what the module exports
    // The package can export: default, AmazonIVSBroadcastClient, IVSBroadcastClient, or create
    const sdkModule = mod.default || mod.AmazonIVSBroadcastClient || mod.IVSBroadcastClient || mod
    
    if (!sdkModule) {
      throw new Error("SDK module is empty")
    }
    
    // Check if it has create method or is a constructor
    if (typeof sdkModule.create === "function" || typeof sdkModule === "function") {
      return sdkModule
    }
    
    // Try to find create in nested exports
    if (mod.AmazonIVSBroadcastClient && typeof mod.AmazonIVSBroadcastClient.create === "function") {
      return mod.AmazonIVSBroadcastClient
    }
    
    throw new Error("SDK module does not expose create method or constructor")
  } catch (npmError: any) {
    // Fallback: CDN script (dev only, for debugging)
    if (process.env.NODE_ENV === "development") {
      console.warn("[IVS] npm import failed, trying CDN fallback:", npmError.message)
      
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined") {
          reject(new Error("CDN fallback only works in browser"))
          return
        }
        
        // Check if already loaded
        if ((window as any).IVSBroadcastClient) {
          if (process.env.NODE_ENV === "development") {
            console.log("[IVS] SDK loaded from cache")
          }
          resolve((window as any).IVSBroadcastClient)
          return
        }
        
        const script = document.createElement("script")
        script.src = "https://web-broadcast.live-video.net/1.31.1/amazon-ivs-web-broadcast.min.js"
        script.async = true
        
        // Timeout for script loading (8s)
        const timeout = setTimeout(() => {
          script.remove()
          reject(new Error("SDK bloccato (CSP/adblock). Consenti web-broadcast.live-video.net"))
        }, 8000)
        
        script.onload = () => {
          clearTimeout(timeout)
          const client = (window as any).IVSBroadcastClient
          if (client && typeof client.create === "function") {
            if (process.env.NODE_ENV === "development") {
              console.log("[IVS] SDK loaded from CDN")
            }
            resolve(client)
          } else {
            reject(new Error("CDN script loaded but IVSBroadcastClient not found"))
          }
        }
        
        script.onerror = () => {
          clearTimeout(timeout)
          reject(new Error("SDK bloccato (CSP/adblock). Consenti web-broadcast.live-video.net"))
        }
        
        document.head.appendChild(script)
      })
    }
    
    throw npmError
  }
}

/**
 * Create a broadcast client from SDK module
 */
export function createBroadcastClient(
  sdkModule: any,
  ingestEndpoint: string,
  streamConfig?: any
): any {
  if (!sdkModule) {
    throw new Error("SDK module is required")
  }
  
  if (!ingestEndpoint || typeof ingestEndpoint !== "string" || !ingestEndpoint.startsWith("rtmps://")) {
    throw new Error("Invalid ingest endpoint")
  }
  
  // Default stream config (1280x720 @ 30fps, 2.5Mbps)
  const defaultStreamConfig = streamConfig || {
    width: 1280,
    height: 720,
    frameRate: 30,
    bitrate: 2500000,
  }
  
  // Try SDK presets first
  const config = 
    sdkModule.BASIC_LANDSCAPE ||
    sdkModule.STANDARD_LANDSCAPE ||
    defaultStreamConfig
  
  // Create client
  if (typeof sdkModule.create === "function") {
    return sdkModule.create({
      streamConfig: config,
      ingestEndpoint,
    })
  }
  
  if (typeof sdkModule === "function") {
    return new sdkModule({
      streamConfig: config,
      ingestEndpoint,
    })
  }
  
  throw new Error("SDK module does not support client creation")
}


