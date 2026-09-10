/**
 * Centralized Application Configuration
 *
 * Provides single-source-of-truth configuration for Frontend URLs,
 * invitation link generation, CORS origins, and server endpoints.
 */

// Centralized frontend URL resolver
// Priority:
// 1. FRONTEND_URL environment variable (e.g., https://cortiquant.online)
// 2. APP_URL environment variable
// 3. Fallback to production in NODE_ENV=production or localhost:8443 in dev
function getFrontendUrl() {
  const envUrl = process.env.FRONTEND_URL || process.env.APP_URL
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, "")
  }

  if (process.env.NODE_ENV === "production") {
    return "https://cortiquant.online"
  }

  return "http://localhost:8443"
}

/**
 * Builds a clean, fully-qualified frontend link with route and query parameters
 * @param {string} route - The route path (e.g., "/listener/accept-invite" or "hr/accept-invitation")
 * @param {Object} [params] - Optional query parameters (e.g., { token: "abc" })
 * @returns {string} Fully-qualified frontend URL
 */
function buildFrontendUrl(route, params = {}) {
  const baseUrl = getFrontendUrl()
  const cleanRoute = route.startsWith("/") ? route : `/${route}`
  const url = new URL(`${baseUrl}${cleanRoute}`)

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      url.searchParams.set(key, String(val))
    }
  })

  return url.toString()
}

module.exports = {
  getFrontendUrl,
  buildFrontendUrl,
}
