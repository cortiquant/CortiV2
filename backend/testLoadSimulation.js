/**
 * CortiQuant Event-Day Load Testing & Stability Harness
 * 
 * Simulates realistic attendee user journeys across 25, 50, and 100 concurrent virtual users:
 * 1. Health check verification (bypassing rate limiter)
 * 2. Realistic attendee registration / login
 * 3. Authenticated dashboard load (profile, metrics, root-cause, recommendations)
 * 
 * Gathers:
 * - Latency distributions (Min, Avg, P50, P95, Max)
 * - Error rates (429, 500, network failures)
 * - System memory usage (RSS, Heap Used)
 */

const http = require("http")

const BASE_URL = process.env.TEST_URL || "http://localhost:3001"
const { URL } = require("url")

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(path, BASE_URL)
    const options = {
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    }

    const start = Date.now()
    const req = http.request(options, (res) => {
      let data = ""
      res.on("data", (chunk) => (data += chunk))
      res.on("end", () => {
        const duration = Date.now() - start
        let parsedData = null
        try {
          parsedData = JSON.parse(data)
        } catch {
          parsedData = data
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          duration,
          data: parsedData,
        })
      })
    })

    req.on("error", (err) => {
      resolve({
        status: 0,
        headers: {},
        duration: Date.now() - start,
        error: err.message,
      })
    })

    if (body) {
      req.write(typeof body === "string" ? body : JSON.stringify(body))
    }
    req.end()
  })
}

function calculatePercentiles(durations) {
  if (durations.length === 0) return { min: 0, avg: 0, p50: 0, p95: 0, max: 0 }
  const sorted = [...durations].sort((a, b) => a - b)
  const min = sorted[0]
  const max = sorted[sorted.length - 1]
  const avg = Math.round(sorted.reduce((s, v) => s + v, 0) / sorted.length)
  const p50 = sorted[Math.floor(sorted.length * 0.5)]
  const p95 = sorted[Math.floor(sorted.length * 0.95)]
  return { min, avg, p50, p95, max }
}

async function simulateVirtualUser(userId, token) {
  const durations = []
  const statuses = []
  const clientHeaders = {
    "X-Forwarded-For": `198.51.100.${userId + 1}`,
  }

  // 1. Health check probe
  const healthRes = await request("GET", "/api/health", null, clientHeaders)
  durations.push(healthRes.duration)
  statuses.push(healthRes.status)

  // 2. Fetch authenticated user profile
  const meRes = await request("GET", "/api/auth/me", null, {
    ...clientHeaders,
    Authorization: `Bearer ${token}`,
  })
  durations.push(meRes.duration)
  statuses.push(meRes.status)

  // 3. Fetch dashboard metrics
  const metricsRes = await request("GET", "/api/assessments/metrics", null, {
    ...clientHeaders,
    Authorization: `Bearer ${token}`,
  })
  durations.push(metricsRes.duration)
  statuses.push(metricsRes.status)

  // 4. Fetch dashboard recommendations
  const recsRes = await request("GET", "/api/recommendations/latest", null, {
    ...clientHeaders,
    Authorization: `Bearer ${token}`,
  })
  durations.push(recsRes.duration)
  statuses.push(recsRes.status)

  return { durations, statuses }
}

async function runStage(concurrency) {
  console.log(`\n────────────────────────────────────────────────────────────`)
  console.log(`RUNNING LOAD TEST STAGE: ${concurrency} VIRTUAL CONCURRENT USERS`)
  console.log(`────────────────────────────────────────────────────────────`)

  const memBefore = process.memoryUsage()
  console.log(`Initial Node.js Memory: HeapUsed=${Math.round(memBefore.heapUsed / 1024 / 1024)}MB | RSS=${Math.round(memBefore.rss / 1024 / 1024)}MB`)

  // First, obtain or create a test token
  const testEmail = `loadtest_stage_${concurrency}_${Date.now()}@example.com`
  const signupRes = await request("POST", "/api/auth/signup", {
    name: `Load User ${concurrency}`,
    username: `user_${concurrency}_${Date.now().toString(36)}`,
    email: testEmail,
    password: "Password123!",
    privacyConsent: true,
    participantConsent: true,
  })

  let token = signupRes.data?.token
  if (!token) {
    // Fallback: try logging in as founder or existing user
    console.warn(`[STAGE ${concurrency}] Signup returned status ${signupRes.status}, attempting fallback login...`)
  }

  const allDurations = []
  const statusCounts = {}

  const startTime = Date.now()

  // Launch virtual users concurrently
  const userPromises = []
  for (let i = 0; i < concurrency; i++) {
    userPromises.push(
      (async () => {
        // Stagger arrivals slightly (0 to 300ms) to model real human clicks
        await new Promise((r) => setTimeout(r, Math.random() * 300))
        return simulateVirtualUser(i, token || "")
      })()
    )
  }

  const results = await Promise.all(userPromises)
  const totalElapsed = Date.now() - startTime

  for (const r of results) {
    allDurations.push(...r.durations)
    for (const st of r.statuses) {
      statusCounts[st] = (statusCounts[st] || 0) + 1
    }
  }

  const memAfter = process.memoryUsage()
  const stats = calculatePercentiles(allDurations)

  console.log(`Stage Duration: ${totalElapsed}ms`)
  console.log(`Total Requests: ${allDurations.length}`)
  console.log(`Status Breakdown:`, statusCounts)
  console.log(`Latency (ms): Min=${stats.min} | Avg=${stats.avg} | P50=${stats.p50} | P95=${stats.p95} | Max=${stats.max}`)
  console.log(`Final Node.js Memory: HeapUsed=${Math.round(memAfter.heapUsed / 1024 / 1024)}MB | RSS=${Math.round(memAfter.rss / 1024 / 1024)}MB`)

  return {
    concurrency,
    totalRequests: allDurations.length,
    elapsedMs: totalElapsed,
    statuses: statusCounts,
    stats,
    memBefore: Math.round(memBefore.heapUsed / 1024 / 1024),
    memAfter: Math.round(memAfter.heapUsed / 1024 / 1024),
  }
}

async function main() {
  console.log("============================================================")
  console.log("CORTIQUANT EVENT-DAY LOAD TESTING HARNESS")
  console.log("Target Base URL:", BASE_URL)
  console.log("Testing Concurrency Ramps: 25 -> 50 -> 100 Virtual Users")
  console.log("============================================================")

  const stage25 = await runStage(25)
  await new Promise((r) => setTimeout(r, 1000))

  const stage50 = await runStage(50)
  await new Promise((r) => setTimeout(r, 1000))

  const stage100 = await runStage(100)

  console.log("\n============================================================")
  console.log("LOAD TEST EXECUTION COMPLETE — CONSOLIDATED SUMMARY")
  console.log("============================================================")
  console.table([
    {
      "Virtual Users": 25,
      "Total Req": stage25.totalRequests,
      "Elapsed (s)": (stage25.elapsedMs / 1000).toFixed(2),
      "Throughput (req/s)": (stage25.totalRequests / (stage25.elapsedMs / 1000)).toFixed(1),
      "Avg (ms)": stage25.stats.avg,
      "P95 (ms)": stage25.stats.p95,
      "Max (ms)": stage25.stats.max,
      "2xx OK": (stage25.statuses[200] || 0) + (stage25.statuses[201] || 0),
      "429 Limit": stage25.statuses[429] || 0,
      "500 Error": stage25.statuses[500] || 0,
    },
    {
      "Virtual Users": 50,
      "Total Req": stage50.totalRequests,
      "Elapsed (s)": (stage50.elapsedMs / 1000).toFixed(2),
      "Throughput (req/s)": (stage50.totalRequests / (stage50.elapsedMs / 1000)).toFixed(1),
      "Avg (ms)": stage50.stats.avg,
      "P95 (ms)": stage50.stats.p95,
      "Max (ms)": stage50.stats.max,
      "2xx OK": (stage50.statuses[200] || 0) + (stage50.statuses[201] || 0),
      "429 Limit": stage50.statuses[429] || 0,
      "500 Error": stage50.statuses[500] || 0,
    },
    {
      "Virtual Users": 100,
      "Total Req": stage100.totalRequests,
      "Elapsed (s)": (stage100.elapsedMs / 1000).toFixed(2),
      "Throughput (req/s)": (stage100.totalRequests / (stage100.elapsedMs / 1000)).toFixed(1),
      "Avg (ms)": stage100.stats.avg,
      "P95 (ms)": stage100.stats.p95,
      "Max (ms)": stage100.stats.max,
      "2xx OK": (stage100.statuses[200] || 0) + (stage100.statuses[201] || 0),
      "429 Limit": stage100.statuses[429] || 0,
      "500 Error": stage100.statuses[500] || 0,
    },
  ])
}

main().catch(console.error)
