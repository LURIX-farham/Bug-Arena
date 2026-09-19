const DATA_VERSION_KEY = 'bug-arena:data-version'
const DEFAULT_VERSION = 1

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function emit(type, detail = {}) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(type, { detail }))
}

export function readData(key, fallback = null) {
  if (!canUseStorage()) return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeData(key, value, { event = 'bug-arena:data-updated', queue = null } = {}) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    emit(event, { key, queue })
    emit('bug-arena:data-updated', { key, event })
    return true
  } catch {
    return false
  }
}

export function removeData(key, { event = 'bug-arena:data-updated' } = {}) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.removeItem(key)
    emit(event, { key, removed: true })
    emit('bug-arena:data-updated', { key, removed: true })
    return true
  } catch {
    return false
  }
}

export function getStorageHealth() {
  if (!canUseStorage()) {
    return { available: false, readable: false, writable: false, usedBytes: 0, keys: 0 }
  }
  let readable = false
  let writable = false
  let usedBytes = 0
  let keys = 0
  try {
    keys = window.localStorage.length
    readable = true
    for (let index = 0; index < keys; index += 1) {
      const key = window.localStorage.key(index)
      if (key) usedBytes += (window.localStorage.getItem(key) || '').length + key.length
    }
    const probe = '__bug_arena_storage_probe__'
    window.localStorage.setItem(probe, '1')
    window.localStorage.removeItem(probe)
    writable = true
  } catch {
    // Storage may be readable but blocked for writes.
  }
  return { available: true, readable, writable, usedBytes, keys }
}

export function getDataVersion() {
  const value = Number(readData(DATA_VERSION_KEY, DEFAULT_VERSION))
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_VERSION
}

export function setDataVersion(version) {
  return writeData(DATA_VERSION_KEY, Math.max(1, Number(version) || DEFAULT_VERSION))
}

export function isBrowserOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false
}
