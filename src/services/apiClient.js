const configuredApiBase = import.meta.env?.VITE_API_BASE_URL
let csrfToken = ''

const REQUEST_TIMEOUT_MS = 15000

/**
 * API base resolution:
 *  1. VITE_API_BASE_URL (set at build time) always wins.
 *  2. Dev server (localhost / 127.0.0.1): the local WAMP/XAMPP backend.
 *  3. Anywhere else: same-origin `/api` — matches the shared-hosting layout
 *     (public_html + public_html/api) so a build made without the variable
 *     no longer points a production site at "localhost".
 */
function resolveApiBase() {
  if (configuredApiBase) return String(configuredApiBase).replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocal = host === 'localhost' || host === '127.0.0.1'
    if (!isLocal) return `${window.location.origin}/api`
  }
  return 'http://localhost/BugArena/backend/public'
}

const API_BASE = resolveApiBase()

function makeError(message, extra = {}) {
  const error = new Error(message)
  Object.assign(error, extra)
  return error
}

/**
 * Fetch with a hard timeout (so a hung server can never freeze the boot
 * screen) and one automatic retry for idempotent GETs.
 */
async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

export async function apiRequest(path, options = {}) {
  const method = String(options.method || 'GET').toUpperCase()
  const isRead = method === 'GET' || method === 'HEAD'
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchOptions } = options
  const init = { ...fetchOptions, credentials: 'include', headers }

  let response
  let lastError
  for (let attempt = 0; attempt < (isRead ? 2 : 1); attempt += 1) {
    try {
      response = await fetchWithTimeout(`${API_BASE}${path}`, init, timeoutMs)
      lastError = null
      break
    } catch (error) {
      lastError = error
      if (attempt === 0 && isRead) await new Promise((resolve) => setTimeout(resolve, 400))
    }
  }

  if (!response) {
    const timedOut = lastError?.name === 'AbortError'
    throw makeError(
      timedOut
        ? `Bug Arena API did not respond within ${Math.round(timeoutMs / 1000)}s.`
        : `Cannot reach Bug Arena API at ${API_BASE}. ${lastError?.message || 'Network request failed.'}`,
      { code: timedOut ? 'api_timeout' : 'api_unreachable', cause: lastError },
    )
  }

  let data
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    try {
      data = await response.json()
    } catch {
      data = { raw: null }
    }
  } else {
    const text = await response.text()
    data = text ? { raw: text } : null
  }

  if (data?.csrfToken) csrfToken = String(data.csrfToken)

  if (!response.ok) {
    throw makeError(data?.error || `API request failed with HTTP ${response.status}.`, {
      status: response.status,
      data,
    })
  }

  return data
}

export function clearCsrfToken() {
  csrfToken = ''
}

export function getApiBaseUrl() {
  return API_BASE
}
