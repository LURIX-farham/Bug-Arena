import { getCompletedChallenges, getTotalScore } from './submissionStore.js'
import { getProgressionStats } from './progressionStore.js'
import { getCompetitiveStats } from './competitiveStore.js'
import { getIdentity, updateIdentity, resetIdentity } from './identityStore.js'
import { emitArenaEvent, ARENA_EVENTS } from './eventBus.js'
import { enqueueSyncAction, removeSyncAction } from './syncQueue.js'
import { apiRequest } from './apiClient.js'
import { getAuthUser } from './authStore.js'

const PLAYER_KEY = 'bug-arena-player'
const DEFAULT_PLAYER = Object.freeze({
  id: 'current-player',
  username: 'programmer',
  displayName: 'PROGRAMMER',
})

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function writeLocalPlayer(player) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(PLAYER_KEY, JSON.stringify(player))
    window.dispatchEvent(new CustomEvent('bug-arena:player-updated'))
    return true
  } catch {
    return false
  }
}

export function getStoredPlayer() {
  const identity = getIdentity()
  const authUser = getAuthUser()
  if (!canUseStorage()) return { ...DEFAULT_PLAYER, ...identity, ...authUser }

  try {
    const player = JSON.parse(window.localStorage.getItem(PLAYER_KEY) || 'null')
    return player?.username
      ? { ...DEFAULT_PLAYER, ...identity, ...player, ...authUser, id: authUser?.id || identity.id }
      : { ...DEFAULT_PLAYER, ...identity, ...authUser }
  } catch {
    return { ...DEFAULT_PLAYER, ...identity, ...authUser }
  }
}

export async function savePlayer({ username, displayName }) {
  const cleanUsername = String(username || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 20)
  const cleanDisplayName = String(displayName || cleanUsername || 'PROGRAMMER')
    .trim()
    .slice(0, 24)

  if (!cleanUsername || !canUseStorage()) return false

  const identity = updateIdentity({ username: cleanUsername })
  const localPlayer = {
    ...DEFAULT_PLAYER,
    ...identity,
    username: cleanUsername,
    displayName: cleanDisplayName.toUpperCase(),
  }
  writeLocalPlayer(localPlayer)

  if (getAuthUser()) {
    const sync = enqueueSyncAction('PLAYER_UPDATED', { username: cleanUsername, displayName: cleanDisplayName.toUpperCase() })
    try {
      const result = await apiRequest('/player', {
        method: 'PUT',
        body: JSON.stringify({ username: cleanUsername, displayName: cleanDisplayName }),
      })
      if (result?.user) hydrateLocalUser(result.user)
      removeSyncAction(sync.id)
    } catch {
      return true
    }
  }

  emitArenaEvent(ARENA_EVENTS.PLAYER_UPDATED, { playerId: identity.id, username: cleanUsername })
  return true
}

function hydrateLocalUser(user) {
  if (!user) return false
  updateIdentity({ username: user.username, id: user.id })
  return writeLocalPlayer({
    ...DEFAULT_PLAYER,
    id: user.id,
    username: user.username,
    displayName: user.displayName,
  })
}

export async function hydratePlayerFromServer() {
  try {
    const result = await apiRequest('/player')
    return hydrateLocalUser(result?.user)
  } catch {
    return false
  }
}

export function clearLocalPlayer() {
  if (!canUseStorage()) return false
  try {
    window.localStorage.removeItem(PLAYER_KEY)
    resetIdentity()
    window.dispatchEvent(new CustomEvent('bug-arena:player-updated'))
    return true
  } catch {
    return false
  }
}

export function resetPlayer() {
  const saved = clearLocalPlayer()
  emitArenaEvent(ARENA_EVENTS.PLAYER_UPDATED, { reset: true })
  return saved
}

export function getCurrentPlayer() {
  const submissions = getCompletedChallenges()
  const progression = getProgressionStats(submissions)
  const competitive = getCompetitiveStats()

  return {
    ...getStoredPlayer(),
    score: getTotalScore(),
    solved: submissions.length,
    attempts: progression.attempts,
    xp: progression.xp,
    level: progression.level,
    rank: progression.rank,
    streak: progression.streak,
    bestStreak: progression.bestStreak,
    rating: competitive.rating,
    wins: competitive.wins,
    losses: competitive.losses,
    winRate: competitive.winRate,
  }
}
