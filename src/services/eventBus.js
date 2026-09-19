import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'

const listeners = new Map()
const EVENT_LOG_KEY = 'bug-arena-event-log'
const MAX_LOG = 100

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function cleanEvent(type, payload) {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: String(type || 'UNKNOWN').slice(0, 80),
    at: new Date().toISOString(),
    payload: payload && typeof payload === 'object' ? payload : {},
  }
}

export const ARENA_EVENTS = Object.freeze({
  SESSION_STARTED: 'SESSION_STARTED',
  SESSION_ABANDONED: 'SESSION_ABANDONED',
  SESSION_FINISHED: 'SESSION_FINISHED',
  TEST_EXECUTED: 'TEST_EXECUTED',
  TEST_PASSED: 'TEST_PASSED',
  TEST_FAILED: 'TEST_FAILED',
  SUBMISSION_CREATED: 'SUBMISSION_CREATED',
  MATCH_STARTED: 'MATCH_STARTED',
  MATCH_FINISHED: 'MATCH_FINISHED',
  RATING_CHANGED: 'RATING_CHANGED',
  ACHIEVEMENT_UNLOCKED: 'ACHIEVEMENT_UNLOCKED',
  SEASON_CHANGED: 'SEASON_CHANGED',
  PLAYER_UPDATED: 'PLAYER_UPDATED',
})

export function emitArenaEvent(type, payload = {}) {
  const event = cleanEvent(type, payload)
  if (canUseStorage()) {
    try {
      const current = JSON.parse(window.localStorage.getItem(EVENT_LOG_KEY) || '[]')
      const events = Array.isArray(current) ? current : []
      window.localStorage.setItem(EVENT_LOG_KEY, JSON.stringify([...events, event].slice(-MAX_LOG)))
    } catch {
      // Event logging is diagnostic only and must never break gameplay.
    }
  }
  listeners.get(type)?.forEach((listener) => listener(event))
  listeners.get('*')?.forEach((listener) => listener(event))
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(`bug-arena:event:${type}`, { detail: event }))
  if (isAuthenticated()) {
    apiRequest('/events', { method: 'POST', body: JSON.stringify({ eventType: event.type, payload: event.payload }) }).catch(() => undefined)
  }
  return event
}

export function subscribeArenaEvent(type, listener) {
  if (!listeners.has(type)) listeners.set(type, new Set())
  listeners.get(type).add(listener)
  return () => listeners.get(type)?.delete(listener)
}

export function getRecentArenaEvents(limit = 25) {
  if (!canUseStorage()) return []
  try {
    const events = JSON.parse(window.localStorage.getItem(EVENT_LOG_KEY) || '[]')
    return (Array.isArray(events) ? events : []).slice(-Math.max(1, limit)).reverse()
  } catch {
    return []
  }
}

export function clearArenaEvents() {
  if (!canUseStorage()) return false
  try {
    window.localStorage.removeItem(EVENT_LOG_KEY)
    return true
  } catch {
    return false
  }
}
