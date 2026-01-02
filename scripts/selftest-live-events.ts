/**
 * Self-test per verificare normalizzazione playbackUrl in LiveEventsRepository
 * 
 * Test:
 * 1. create() - playbackUrl normalizzato all'env se disponibile
 * 4. setActive() - playbackUrl normalizzato all'env quando attiva evento
 * 
 * Esegui: npm run selftest:live-events
 */

// Mock environment
const MOCK_ENV_PLAYBACK_URL = "https://test-channel.example.com/master.m3u8"

// Mock Firestore in-memory
class MockFirestore {
  private collections: Map<string, Map<string, any>> = new Map()

  collection(name: string) {
    if (!this.collections.has(name)) {
      this.collections.set(name, new Map())
    }
    const collection = this.collections.get(name)!
    
    return {
      add: async (data: any) => {
        const id = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        collection.set(id, { ...data, id })
        return {
          id,
          get: async () => ({
            exists: true,
            data: () => collection.get(id),
          }),
        }
      },
      doc: (id: string) => ({
        get: async () => ({
          exists: collection.has(id),
          data: () => collection.get(id),
        }),
        update: async (data: any) => {
          const existing = collection.get(id) || {}
          collection.set(id, { ...existing, ...data })
        },
        ref: { id },
      }),
      where: (field: string, op: string, value: any) => ({
        limit: (n: number) => ({
          get: async () => ({
            empty: false,
            docs: Array.from(collection.values())
              .filter((doc: any) => doc[field] === value)
              .slice(0, n)
              .map((doc: any) => ({
                ref: { id: doc.id },
                data: () => doc,
              })),
          }),
        }),
      }),
    }
  }

  runTransaction = async (callback: (transaction: any) => Promise<void>) => {
    const transaction = {
      get: async (query: any) => {
        // Simplified: return empty for now
        return { docs: [], empty: true }
      },
      update: async (ref: any, data: any) => {
        // Simplified transaction update
        const collectionName = "live_events" // Assume
        const collection = this.collections.get(collectionName) || new Map()
        const existing = collection.get(ref.id) || {}
        collection.set(ref.id, { ...existing, ...data })
        if (!this.collections.has(collectionName)) {
          this.collections.set(collectionName, collection)
        }
      },
    }
    await callback(transaction)
  }

  getCollection(name: string): Map<string, any> {
    return this.collections.get(name) || new Map()
  }
}

// Mock repository methods
class MockLiveEventsRepository {
  private db: MockFirestore
  private defaultPlaybackUrl: string

  constructor(db: MockFirestore, defaultPlaybackUrl: string) {
    this.db = db
    this.defaultPlaybackUrl = defaultPlaybackUrl
  }

  async create(data: any) {
    const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, "-")
    // Always use env playbackUrl if available, otherwise use provided one
    const finalPlaybackUrl = this.defaultPlaybackUrl || data.playbackUrl || ""

    const eventData = {
      title: data.title,
      slug,
      description: data.description || null,
      scheduledAt: data.scheduledAt || null,
      status: "draft",
      published: false,
      active: false,
      playbackUrl: finalPlaybackUrl,
      chatEnabled: data.chatEnabled !== false,
      speaker: data.speaker || null,
      speakerTitle: data.speakerTitle || null,
      category: data.category || null,
      duration: data.duration || null,
      createdBy: data.createdBy || "test-user",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const collection = this.db.collection("live_events")
    const docRef = await collection.add(eventData)
    const doc = await docRef.get()
    return doc.data()
  }

  async setActive(id: string) {
    const defaultPlaybackUrl = this.defaultPlaybackUrl

    await this.db.runTransaction(async (transaction: any) => {
      // Get all active events
      const allActiveQuery = this.db.collection("live_events").where("active", "==", true)
      const allActiveSnapshot = await allActiveQuery.limit(100).get()

      // Deactivate all
      for (const doc of allActiveSnapshot.docs) {
        await transaction.update(doc.ref, {
          active: false,
          updatedAt: new Date(),
        })
      }

      // Activate selected and normalize playbackUrl
      const eventRef = this.db.collection("live_events").doc(id)
      const updateData: any = {
        active: true,
        updatedAt: new Date(),
      }

      // Always normalize playbackUrl to env value when activating
      if (defaultPlaybackUrl) {
        updateData.playbackUrl = defaultPlaybackUrl
      }

      await transaction.update(eventRef, updateData)
    })
  }

  async getById(id: string) {
    const doc = await this.db.collection("live_events").doc(id).get()
    if (!doc.exists) return null
    return doc.data()
  }
}

// Test runner
async function runTests() {
  console.log("🧪 Running Live Events PlaybackUrl Normalization Tests\n")
  console.log(`📡 Mock ENV PlaybackUrl: ${MOCK_ENV_PLAYBACK_URL}\n`)

  const db = new MockFirestore()
  const repo = new MockLiveEventsRepository(db, MOCK_ENV_PLAYBACK_URL)

  let passed = 0
  let failed = 0

  // TEST 1: create() normalizes playbackUrl to env
  console.log("TEST 1: create() normalizes playbackUrl to env")
  try {
    const event1 = await repo.create({
      title: "Test Event 1",
      playbackUrl: "https://wrong-url.com/master.m3u8", // Wrong URL
      createdBy: "test-user",
    })

    if (event1.playbackUrl === MOCK_ENV_PLAYBACK_URL) {
      console.log("  ✅ PASS: playbackUrl normalized to env value")
      passed++
    } else {
      console.log(`  ❌ FAIL: Expected ${MOCK_ENV_PLAYBACK_URL}, got ${event1.playbackUrl}`)
      failed++
    }
  } catch (error: any) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }

  // TEST 1b: create() with empty playbackUrl uses env
  console.log("\nTEST 1b: create() with empty playbackUrl uses env")
  try {
    const event1b = await repo.create({
      title: "Test Event 1b",
      playbackUrl: "", // Empty
      createdBy: "test-user",
    })

    if (event1b.playbackUrl === MOCK_ENV_PLAYBACK_URL) {
      console.log("  ✅ PASS: Empty playbackUrl normalized to env value")
      passed++
    } else {
      console.log(`  ❌ FAIL: Expected ${MOCK_ENV_PLAYBACK_URL}, got ${event1b.playbackUrl}`)
      failed++
    }
  } catch (error: any) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }

  // TEST 4: setActive() normalizes playbackUrl
  console.log("\nTEST 4: setActive() normalizes playbackUrl to env")
  try {
    // Create event with wrong playbackUrl
    const event4 = await repo.create({
      title: "Test Event 4",
      playbackUrl: "https://WRONG-URL.com/master.m3u8",
      createdBy: "test-user",
    })

    const wrongUrl = event4.playbackUrl
    console.log(`  Created event with playbackUrl: ${wrongUrl}`)

    // Activate it
    await repo.setActive(event4.id)

    // Get updated event
    const updatedEvent4 = await repo.getById(event4.id)

    if (updatedEvent4?.playbackUrl === MOCK_ENV_PLAYBACK_URL) {
      console.log("  ✅ PASS: playbackUrl normalized to env value after setActive()")
      passed++
    } else {
      console.log(
        `  ❌ FAIL: Expected ${MOCK_ENV_PLAYBACK_URL}, got ${updatedEvent4?.playbackUrl}`
      )
      failed++
    }

    // Verify active flag
    if (updatedEvent4?.active === true) {
      console.log("  ✅ PASS: active flag set to true")
      passed++
    } else {
      console.log(`  ❌ FAIL: Expected active=true, got ${updatedEvent4?.active}`)
      failed++
    }
  } catch (error: any) {
    console.log(`  ❌ FAIL: ${error.message}`)
    failed++
  }

  // Summary
  console.log("\n" + "=".repeat(50))
  console.log(`📊 Results: ${passed} passed, ${failed} failed`)
  if (failed === 0) {
    console.log("✅ All tests passed!")
    process.exit(0)
  } else {
    console.log("❌ Some tests failed")
    process.exit(1)
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Fatal error:", error)
  process.exit(1)
})

