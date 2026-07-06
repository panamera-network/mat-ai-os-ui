export const API_BASE_URL = 'http://localhost:8000'

// Shared secret sent with every request once the backend's MAT_API_KEY is set (see
// main.py) — blank here matches the backend's own "auth disabled" default, so local-only
// use needs no setup. Vite only exposes env vars prefixed VITE_ to client code; set
// VITE_MAT_API_KEY in a local .env (gitignored) to the same value as the backend's
// MAT_API_KEY once this app is used beyond localhost.
export const API_KEY: string = import.meta.env.VITE_MAT_API_KEY ?? ''

export const WS_URL = `ws://localhost:8000/ws${API_KEY ? `?api_key=${encodeURIComponent(API_KEY)}` : ''}`

// Every fetch() call in this app targets API_BASE_URL via a template literal
// (`${API_BASE_URL}/...`) — patched here once instead of touching the 60+ call sites
// individually. Only requests to API_BASE_URL get the header; anything else (e.g. a
// media file served from a third-party URL) passes through untouched.
if (API_KEY) {
  const originalFetch = window.fetch.bind(window)
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    if (!url.startsWith(API_BASE_URL)) return originalFetch(input, init)
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
    headers.set('X-API-Key', API_KEY)
    return originalFetch(input, { ...init, headers })
  }
}
