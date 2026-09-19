const configuredApiBase = import.meta.env?.VITE_API_BASE_URL
let csrfToken = ''

// Fallback matches the WAMP document-root layout for this release folder.
// Prefer VITE_API_BASE_URL (see .env.example) when the folder name differs.
const API_BASE = (configuredApiBase || 'http://localhost/BugArena-v1.9.0/backend/public').replace(/\/$/, '')

export async function apiRequest(path, options = {}) {
  let response

  const method = String(options.method || 'GET').toUpperCase()
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) {
    headers['X-CSRF-Token'] = csrfToken
  }

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch (error) {
    const networkError = new Error(
      `Cannot reach Bug Arena API at ${API_BASE}. ${error?.message || 'Network request failed.'}`,
    )

    networkError.code = 'api_unreachable'
    networkError.cause = error
    throw networkError
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
    const error = new Error(
      data?.error ||
      `API request failed with HTTP ${response.status}.`,
    )

    error.status = response.status
    error.data = data

    throw error
  }

  return data
}

export function clearCsrfToken() {
  csrfToken = ''
}

export function getApiBaseUrl() {
  return API_BASE
}