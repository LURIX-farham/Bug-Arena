import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'

let leaderboardCache = []
let loaded = false

export async function hydrateLeaderboardFromServer() {
  if (!isAuthenticated()) return false
  try {
    const result = await apiRequest('/leaderboard')
    if (!Array.isArray(result?.players)) return false
    leaderboardCache = result.players.map((player) => ({
      ...player,
      level: 1,
      score: 0,
      solved: 0,
    }))
    loaded = true
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bug-arena:leaderboard-updated'))
    return true
  } catch {
    return false
  }
}

export function getLeaderboard() {
  return leaderboardCache.slice()
}

export function isLeaderboardLoaded() {
  return loaded
}
