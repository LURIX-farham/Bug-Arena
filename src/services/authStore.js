import { apiRequest, clearCsrfToken } from './apiClient.js'

let currentUser = null
let bootstrapped = false

function emit() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bug-arena:auth-updated'))
}

export async function registerAccount({ username, displayName, password }) {
  const result = await apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, displayName, password }),
  })
  currentUser = result.user
  bootstrapped = true
  emit()
  return currentUser
}

export async function loginAccount({ username, password }) {
  const result = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  currentUser = result.user
  bootstrapped = true
  emit()
  return currentUser
}

export async function bootstrapAuth() {
  if (bootstrapped) return currentUser
  try {
    const result = await apiRequest('/auth/me')
    currentUser = result.authenticated ? result.user : null
  } catch {
    currentUser = null
  }
  bootstrapped = true
  return currentUser
}

export async function logoutAccount() {
  try {
    await apiRequest('/auth/logout', { method: 'POST', body: '{}' })
  } finally {
    clearCsrfToken()
    currentUser = null
    bootstrapped = true
    emit()
  }
}

export function getAuthUser() {
  return currentUser
}

export function isAuthenticated() {
  return Boolean(currentUser)
}
