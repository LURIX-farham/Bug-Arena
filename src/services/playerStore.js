import { getCompletedChallenges, getTotalScore } from './submissionStore.js'
import { getProgressionStats, getRankForLevel, getLevelProgress } from './progressionStore.js'
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
    serverStats: user.stats || null,
  })
}

function applyServerStats(stats) {
  if (!stats || typeof stats !== 'object' || !canUseStorage()) return false
  try {
    const player = JSON.parse(window.localStorage.getItem(PLAYER_KEY) || 'null')
    if (!player) return false
    // Merge rather than replace so a partial stats payload cannot wipe fields.
    const previous = player.serverStats && typeof player.serverStats === 'object'
      ? player.serverStats
      : {}
    return writeLocalPlayer({
      ...player,
      serverStats: { ...previous, ...stats },
    })
  } catch {
    return false
  }
}

/**
 * Optimistic bump of totalScore / xp after a local submission is accepted,
 * so the topbar updates immediately even before the server responds.
 */
export function bumpLocalServerStats({ scoreDelta = 0, xpDelta = 0 } = {}) {
  if (!canUseStorage() || (scoreDelta <= 0 && xpDelta <= 0)) return false
  try {
    const player = JSON.parse(window.localStorage.getItem(PLAYER_KEY) || 'null')
    if (!player) return false
    const prev = player.serverStats && typeof player.serverStats === 'object'
      ? player.serverStats
      : {}
    const next = {
      ...prev,
      totalScore: Math.max(0, (Number(prev.totalScore) || 0) + scoreDelta),
      xp: Math.max(0, (Number(prev.xp) || 0) + (xpDelta || scoreDelta)),
    }
    return writeLocalPlayer({ ...player, serverStats: next })
  } catch {
    return false
  }
}

if (typeof window !== 'undefined') {
  // submissionStore forwards the authoritative stats snapshot of every
  // accepted submission so XP updates without waiting for a page refresh.
  window.addEventListener('bug-arena:server-stats', (event) => {
    applyServerStats(event.detail)
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
  const localProgression = getProgressionStats(submissions)
  const competitive = getCompetitiveStats()
  const stored = getStoredPlayer()

  // Server statistics are preferred for XP/level, but total score must never
  // lag behind the locally accepted submissions. A successful server response
  // will raise serverStats; until then (or on offline/API failure) we take
  // the higher of the two so the topbar / profile stay live.
  const serverStats = stored.serverStats || stored.stats || null
  const localScore = getTotalScore()
  const serverScore = serverStats?.totalScore
  const score = serverScore != null
    ? Math.max(Number(serverScore) || 0, localScore)
    : localScore

  // XP is still server-first (it drives level/rank). When serverStats is
  // missing we fall back to local progression which uses score as XP.
  const xp = serverStats?.xp ?? localProgression.xp
  const level = serverStats?.level ?? localProgression.level

  return {
    ...stored,
    score,
    solved: Math.max(submissions.length, Number(serverStats?.solvedChallenges) || 0),
    attempts: localProgression.attempts,
    xp,
    level,
    levelProgress: getLevelProgress(xp),
    rank: getRankForLevel(level).title,
    streak: localProgression.streak,
    bestStreak: localProgression.bestStreak,
    rating: competitive.rating,
    wins: competitive.wins,
    losses: competitive.losses,
    winRate: competitive.winRate,
  }
}
