import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'
import { hydrateLeaderboardFromServer } from './leaderboardStore.js'

// 1v1 duel client: thin wrappers over the poll-based duel API plus a small
// reusable poller. Every consumer owns its poller and must stop() it on
// unmount — the service deliberately keeps no global timers of its own.

export const DUEL_DIFFICULTIES = ['any', 'Easy', 'Medium', 'Hard']

export function heartbeat() {
  return apiRequest('/duel/heartbeat', { method: 'POST', body: '{}' })
    .then((data) => data?.online ?? [])
}

export function createDuel({ difficulty = 'any', bugType = 'any' } = {}) {
  return apiRequest('/duel/invitations', {
    method: 'POST',
    body: JSON.stringify({ difficulty, bugType }),
  })
}

export function fetchInvitations() {
  return apiRequest('/duel/invitations')
    .then((data) => data?.invitations ?? [])
}

export function acceptInvitation(invitationId) {
  return apiRequest(`/duel/invitations/${invitationId}/accept`, { method: 'POST', body: '{}' })
}

export function declineInvitation(invitationId) {
  return apiRequest(`/duel/invitations/${invitationId}/decline`, { method: 'POST', body: '{}' })
}

export function fetchMatch(matchId) {
  return apiRequest(`/duel/matches/${matchId}`)
    .then((data) => {
      if (data?.stats && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('bug-arena:server-stats', { detail: data.stats }))
        hydrateLeaderboardFromServer().catch(() => undefined)
      }
      return data?.match ?? null
    })
}

export function submitDuelResult(matchId, payload) {
  return apiRequest(`/duel/matches/${matchId}/result`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((data) => {
    // Authoritative stats arrive once the duel is finished (both sides in).
    if (data?.stats && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bug-arena:server-stats', { detail: data.stats }))
      hydrateLeaderboardFromServer().catch(() => undefined)
    }
    return data?.match ?? null
  })
}

export function cancelDuel(matchId) {
  return apiRequest(`/duel/matches/${matchId}/cancel`, { method: 'POST', body: '{}' })
}

/**
 * Interval poller with overlap protection (a slow request never stacks on
 * the next tick) and silent failure (poll endpoints are best-effort).
 *
 * @param {() => Promise<any>} fn async action executed each tick
 * @param {number} intervalMs delay between completed ticks
 * @returns {{ stop: () => void }}
 */
export function createPoller(fn, intervalMs) {
  let stopped = false
  let timer = null

  const tick = async () => {
    if (stopped) return
    try {
      await fn()
    } catch {
      // Polling errors are expected while offline / logged out.
    }
    if (!stopped) {
      timer = setTimeout(tick, intervalMs)
    }
  }

  tick()

  return {
    stop() {
      stopped = true
      if (timer) clearTimeout(timer)
    },
  }
}

/** Heartbeat + invitation polling is pointless unless signed in. */
export function canDuel() {
  return isAuthenticated()
}
