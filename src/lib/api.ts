/**
 * Central API client for CortiQuant
 * Automatically attaches Authorization header with Bearer token from localStorage.
 * Uses relative URLs (e.g. /api/...) so requests flow through Vite proxy in dev
 * and work seamlessly in production.
 */

export function getAuthToken(): string | null {
  return localStorage.getItem("cq_token")
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = getAuthToken()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  })

  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  return {
    ok: res.ok,
    status: res.status,
    data,
  }
}
