const STORAGE_KEY = 'bug-arena-sync-queue'
const MAX_QUEUE = 200
const MAX_ATTEMPTS = 8

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function read() {
  if (!canUseStorage()) return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(items) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-MAX_QUEUE)))
    window.dispatchEvent(new CustomEvent('bug-arena:sync-updated'))
    return true
  } catch {
    return false
  }
}

export function enqueueSyncAction(type, payload = {}) {
  const item = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: String(type || 'UNKNOWN').slice(0, 80),
    payload: payload && typeof payload === 'object' ? payload : {},
    createdAt: new Date().toISOString(),
    status: 'pending',
    attempts: 0,
  }
  write([...read(), item])
  return item
}

export function getSyncQueue() {
  return read()
}

export function getSyncStats() {
  const items = read()
  return {
    pending: items.filter((item) => item.status === 'pending').length,
    syncing: items.filter((item) => item.status === 'syncing').length,
    failed: items.filter((item) => item.status === 'failed').length,
    total: items.length,
    lastQueuedAt: items.at(-1)?.createdAt || null,
  }
}

export function markSyncAttempt(id) {
  const items = read()
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return false
  items[index] = { ...items[index], status: 'syncing', attempts: (items[index].attempts || 0) + 1, lastAttemptAt: new Date().toISOString() }
  return write(items)
}

export function markSyncFailed(id) {
  const items = read()
  const index = items.findIndex((item) => item.id === id)
  if (index < 0) return false
  items[index] = { ...items[index], status: 'failed', lastAttemptAt: new Date().toISOString() }
  return write(items)
}

export function removeSyncAction(id) {
  return write(read().filter((item) => item.id !== id))
}

export function clearSyncQueue() {
  return write([])
}

/**
 * Per-type senders registered by the feature stores. Each sender receives the
 * stored payload and must reject on failure; apiClient errors expose
 * `status`, used below to decide retryability.
 */
const senders = new Map()

export function registerSyncSender(type, sender) {
  senders.set(String(type), sender)
}

function backoffMs(attempts) {
  return Math.min(5 * 60_000, 5_000 * 2 ** Math.max(0, (attempts || 0) - 1))
}

let flushing = false

/**
 * Process every queueable action. Idempotency comes from stable client ids:
 * submissions upsert per (user, challenge), matches/replays dedupe by their
 * public id, and the /sync batch endpoint records sync_actions by action id.
 */
export async function flushSyncQueue() {
  if (flushing) return { skipped: true, applied: 0, failed: 0 }
  flushing = true
  let applied = 0
  let failed = 0
  try {
    for (const item of read()) {
      const sender = senders.get(item.type)
      if (!sender) continue
      if ((item.attempts || 0) >= MAX_ATTEMPTS) continue // poison action: keep for diagnostics
      const lastAttempt = item.lastAttemptAt ? new Date(item.lastAttemptAt).getTime() : 0
      if (item.status === 'failed' && Date.now() - lastAttempt < backoffMs(item.attempts)) continue

      markSyncAttempt(item.id)
      try {
        await sender(item.payload)
        removeSyncAction(item.id)
        applied += 1
      } catch (error) {
        failed += 1
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 429) {
          // The server permanently rejected this action (validation, 409
          // not_better, missing resource). Retrying cannot help.
          removeSyncAction(item.id)
        } else {
          markSyncFailed(item.id)
        }
      }
    }
  } finally {
    flushing = false
  }
  return { skipped: false, applied, failed }
}
