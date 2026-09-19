import { readData, writeData, removeData } from './dataProvider.js'

const STORAGE_KEY = 'bug-arena-identity'
const DEFAULT_USERNAME = 'programmer'

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `player-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function sanitizeUsername(value) {
  return String(value || DEFAULT_USERNAME).trim().replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 20) || DEFAULT_USERNAME
}

function createIdentity() {
  const now = new Date().toISOString()
  return { id: createId(), username: DEFAULT_USERNAME, createdAt: now, lastActiveAt: now, schemaVersion: 1 }
}

export function getIdentity() {
  const stored = readData(STORAGE_KEY, null)
  if (!stored?.id) {
    const identity = createIdentity()
    writeData(STORAGE_KEY, identity, { event: 'bug-arena:identity-updated' })
    return identity
  }
  return { ...createIdentity(), ...stored, username: sanitizeUsername(stored.username) }
}

export function touchIdentity() {
  const identity = getIdentity()
  const updated = { ...identity, lastActiveAt: new Date().toISOString() }
  writeData(STORAGE_KEY, updated, { event: 'bug-arena:identity-updated' })
  return updated
}

export function updateIdentity({ username, id } = {}) {
  const identity = getIdentity()
  const updated = { ...identity, id: id || identity.id, username: sanitizeUsername(username || identity.username), lastActiveAt: new Date().toISOString() }
  writeData(STORAGE_KEY, updated, { event: 'bug-arena:identity-updated' })
  return updated
}

export function resetIdentity() {
  return removeData(STORAGE_KEY, { event: 'bug-arena:identity-updated' })
}
