import { emitArenaEvent, ARENA_EVENTS } from './eventBus.js'
import { enqueueSyncAction, removeSyncAction } from './syncQueue.js'
import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'

const STORAGE_KEY = 'bug-arena-competitive'
const START_RATING = 1000
const K_FACTOR = 32
const SEASON_LENGTH_DAYS = 28

export const COMPETITIVE_MODES = Object.freeze({
  ranked: { id: 'ranked', label: 'RANKED FIX', timeMultiplier: 1, rating: true },
  blitz: { id: 'blitz', label: 'BLITZ', timeMultiplier: 0.6, rating: true },
  survival: { id: 'survival', label: 'SURVIVAL', timeMultiplier: 0.85, rating: false },
})

export const COMPETITIVE_OPPONENTS = Object.freeze([
  { id: 'shadow', username: 'Shadow', rating: 1180, solveRate: 0.92 },
  { id: 'codehunter', username: 'CodeHunter', rating: 1120, solveRate: 0.86 },
  { id: 'bugslayer', username: 'BugSlayer', rating: 1060, solveRate: 0.78 },
  { id: 'nullpointer', username: 'NullPointer', rating: 990, solveRate: 0.68 },
  { id: 'bytemaster', username: 'ByteMaster', rating: 920, solveRate: 0.59 },
])

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readState() {
  if (!canUseStorage()) return { matches: [] }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    return parsed && Array.isArray(parsed.matches) ? parsed : { matches: [] }
  } catch {
    return { matches: [] }
  }
}

function writeState(state) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('bug-arena:competitive-updated'))
    return true
  } catch {
    return false
  }
}

function getSeasonBlock(timestamp = Date.now()) {
  const date = new Date(timestamp)
  const anchor = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date - anchor) / 86400000)
  return { anchor, block: Math.floor(days / SEASON_LENGTH_DAYS) }
}

function seasonStart(timestamp = Date.now()) {
  const { anchor, block } = getSeasonBlock(timestamp)
  return new Date(anchor.getTime() + block * SEASON_LENGTH_DAYS * 86400000).toISOString()
}

export function getCurrentSeason() {
  const { block } = getSeasonBlock()
  const start = new Date(seasonStart())
  const end = new Date(start.getTime() + SEASON_LENGTH_DAYS * 86400000)
  const now = Date.now()
  return {
    id: `S${start.getUTCFullYear()}-${String(block + 1).padStart(2, '0')}`,
    start: start.toISOString(),
    end: end.toISOString(),
    daysRemaining: Math.max(0, Math.ceil((end.getTime() - now) / 86400000)),
  }
}

function expectedScore(playerRating, opponentRating) {
  return 1 / (1 + (10 ** ((opponentRating - playerRating) / 400)))
}

function getRatingStats(matches) {
  let rating = START_RATING
  let wins = 0
  let losses = 0
  let draws = 0
  let bestStreak = 0
  let streak = 0

  for (const match of matches) {
    if (match.result === 'win') {
      wins += 1
      streak += 1
      bestStreak = Math.max(bestStreak, streak)
    } else if (match.result === 'loss') {
      losses += 1
      streak = 0
    } else {
      draws += 1
    }
    rating += Number(match.ratingDelta) || 0
  }

  const games = wins + losses + draws
  return {
    rating: Math.max(0, Math.round(rating)),
    wins,
    losses,
    draws,
    games,
    winRate: games ? Math.round((wins / games) * 100) : 0,
    streak,
    bestStreak,
  }
}

export function getCompetitiveStats() {
  const state = readState()
  return getRatingStats(state.matches)
}

export function getCompetitiveMatches() {
  return readState().matches.slice().sort((a, b) => new Date(b.playedAt) - new Date(a.playedAt))
}

export function getOpponent(id) {
  return COMPETITIVE_OPPONENTS.find((opponent) => opponent.id === id) || COMPETITIVE_OPPONENTS[2]
}

export function recordCompetitiveMatch({ mode = 'ranked', opponentId, challengeId, challengeTitle, challengeBaseScore = 350, playerScore, playerTimeLeft = 0, durationMs = 0 }) {
  const modeConfig = COMPETITIVE_MODES[mode] || COMPETITIVE_MODES.ranked
  const opponent = getOpponent(opponentId)
  const season = getCurrentSeason()
  const current = getCompetitiveStats()
  const challengeBaseline = Math.max(100, Number(challengeBaseScore) || 350)
  const opponentScore = Math.max(0, Math.round((challengeBaseline * (opponent.rating / 1000) * opponent.solveRate) * (mode === 'blitz' ? 0.72 : 1)))
  const normalizedPlayerScore = Math.max(0, Number(playerScore) || 0)
  const playerExpected = expectedScore(current.rating, opponent.rating)
  const result = normalizedPlayerScore > opponentScore + 20 ? 'win' : normalizedPlayerScore < opponentScore - 20 ? 'loss' : 'draw'
  const actual = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0
  const ratingDelta = modeConfig.rating
    ? Math.round(K_FACTOR * (actual - playerExpected))
    : 0

  const match = {
    id: `match-${Date.now()}-${challengeId}`,
    mode,
    opponentId: opponent.id,
    opponentName: opponent.username,
    opponentRating: opponent.rating,
    challengeId: Number(challengeId),
    challengeTitle: String(challengeTitle || 'Challenge'),
    playerScore: normalizedPlayerScore,
    opponentScore,
    playerTimeLeft: Math.max(0, Number(playerTimeLeft) || 0),
    result,
    ratingBefore: current.rating,
    ratingDelta,
    ratingAfter: Math.max(0, current.rating + ratingDelta),
    seasonId: season.id,
    playedAt: new Date().toISOString(),
  }

  const state = readState()
  state.matches = [...state.matches, match].slice(-100)
  writeState(state)
  emitArenaEvent(ARENA_EVENTS.MATCH_FINISHED, { matchId: match.id, result: match.result, mode: match.mode, ratingDelta: match.ratingDelta, ratingAfter: match.ratingAfter })
  if (match.ratingDelta !== 0) emitArenaEvent(ARENA_EVENTS.RATING_CHANGED, { matchId: match.id, delta: match.ratingDelta, rating: match.ratingAfter })
  const sync = enqueueSyncAction('MATCH_FINISHED', match)
  if (isAuthenticated()) {
    apiRequest('/competitive/matches', { method: 'POST', body: JSON.stringify({ ...match, durationMs: Math.max(0, Math.round(Number(durationMs) || 0)) }) })
      .then(() => removeSyncAction(sync.id))
      .catch(() => undefined)
  }
  return match
}

export async function hydrateCompetitiveFromServer() {
  if (!isAuthenticated()) return false
  try {
    const result = await apiRequest('/competitive/matches')
    if (!Array.isArray(result?.matches)) return false
    const matches = result.matches.map((match) => ({
      ...match,
      challengeTitle: match.challengeTitle || `Challenge #${match.challengeId}`,
      opponentName: getOpponent(match.opponentId).username,
      opponentRating: getOpponent(match.opponentId).rating,
      seasonId: getCurrentSeason().id,
      playerTimeLeft: 0,
    }))
    if (!canUseStorage()) return false
    writeState({ matches: matches.slice(-100) })
    return true
  } catch {
    return false
  }
}

export function clearCompetitiveData() {
  if (!canUseStorage()) return false
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('bug-arena:competitive-updated'))
    return true
  } catch {
    return false
  }
}
