import { bootstrapAuth } from './authStore.js'
import { apiRequest } from './apiClient.js'
import { hydratePlayerFromServer } from './playerStore.js'
import { getLocalSubmissionsForMigration, hydrateSubmissionsFromServer } from './submissionStore.js'
import { getReplaySessions, hydrateReplaysFromServer } from './replayStore.js'
import { getCompetitiveMatches, hydrateCompetitiveFromServer } from './competitiveStore.js'
import { getUnlockedAchievementKeys, hydrateAchievementsFromServer } from './achievementStore.js'
import { hydrateLeaderboardFromServer } from './leaderboardStore.js'
import { mergeServerChallenges } from '../data/challenges/index.js'
import { registerSyncSender, flushSyncQueue } from './syncQueue.js'

const OWNER_KEY = 'bug-arena-local-owner'
const MIGRATION_KEY = 'bug-arena-db-migration-version'
const MIGRATION_VERSION = 1

let syncSendersRegistered = false

function registerDatabaseSyncSenders() {
  if (syncSendersRegistered) return
  syncSendersRegistered = true

  registerSyncSender('PLAYER_UPDATED', (payload) =>
    apiRequest('/player', { method: 'PUT', body: JSON.stringify(payload) }))
  registerSyncSender('SUBMISSION_CREATED', (payload) =>
    apiRequest('/submissions', { method: 'POST', body: JSON.stringify(payload) }))
  registerSyncSender('REPLAY_FINISHED', (payload) =>
    apiRequest(`/replays/${encodeURIComponent(payload.sessionId)}/finish`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }))
  registerSyncSender('MATCH_FINISHED', (payload) =>
    apiRequest('/competitive/matches', { method: 'POST', body: JSON.stringify(payload) }))
}

registerDatabaseSyncSenders()

function read(key, fallback = null) {
  if (typeof window === 'undefined') return fallback
  try {
    const value = window.localStorage.getItem(key)
    return value === null ? fallback : JSON.parse(value)
  } catch {
    return fallback
  }
}

function write(key, value) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

function clearUserScopedLocalData() {
  if (typeof window === 'undefined') return
  const keys = [
    'bug-arena-player',
    'bug-arena-submissions',
    'bug-arena-replays',
    'bug-arena-competitive',
    'bug-arena-achievements',
  ]
  keys.forEach((key) => window.localStorage.removeItem(key))
}


async function hydrateChallengesFromServer() {
  try {
    const result = await apiRequest('/challenges?limit=100')
    return mergeServerChallenges(result?.challenges) > 0
  } catch {
    return false
  }
}

async function migrateLocalData(user) {
  if (!user?.id) return { migrated: false, reason: 'no_user' }
  const owner = read(OWNER_KEY, null)
  const migrations = read(MIGRATION_KEY, 0)

  if (owner && owner !== user.id) {
    clearUserScopedLocalData()
    write(OWNER_KEY, user.id)
    write(MIGRATION_KEY, MIGRATION_VERSION)
    return { migrated: false, reason: 'different_user' }
  }

  if (migrations >= MIGRATION_VERSION && owner === user.id) return { migrated: false, reason: 'already_migrated' }

  const submissions = getLocalSubmissionsForMigration()
  const replays = getReplaySessions()
  const matches = getCompetitiveMatches()
  const achievements = getUnlockedAchievementKeys()

  const requests = []
  for (const submission of submissions) {
    requests.push(apiRequest('/submissions', { method: 'POST', body: JSON.stringify(submission) }))
  }
  for (const session of replays.filter((item) => !String(item.id).startsWith('legacy-'))) {
    requests.push(apiRequest('/replays', { method: 'POST', body: JSON.stringify(session) }))
    if (Array.isArray(session.events) && session.events.length) {
      requests.push(apiRequest(`/replays/${encodeURIComponent(session.id)}/events`, { method: 'POST', body: JSON.stringify({ events: session.events }) }))
    }
    if (session.status && session.status !== 'active') {
      requests.push(apiRequest(`/replays/${encodeURIComponent(session.id)}/finish`, { method: 'POST', body: JSON.stringify({
        status: session.status,
        score: session.finalScore,
        attempts: session.attempts,
        hardened: session.hardened,
        timeLeft: session.timeLeft,
        code: session.code,
        finishedAt: session.finishedAt,
      }) }))
    }
  }
  for (const match of matches) {
    requests.push(apiRequest('/competitive/matches', { method: 'POST', body: JSON.stringify(match) }))
  }
  if (achievements.length) {
    // Achievement keys are never trusted from the client. The server evaluates
    // the catalog against authoritative statistics.
    requests.push(apiRequest('/achievements/evaluate', { method: 'POST', body: '{}' }))
  }

  const results = requests.length ? await Promise.allSettled(requests) : []
  const complete = results.every((result) => result.status === 'fulfilled')
  if (complete) {
    write(OWNER_KEY, user.id)
    write(MIGRATION_KEY, MIGRATION_VERSION)
  }
  return { migrated: requests.length > 0, complete, count: requests.length }
}

export async function bootstrapDatabase() {
  const user = await bootstrapAuth()
  if (!user) return { authenticated: false, migrated: false }

  await flushSyncQueue()
  const migration = await migrateLocalData(user)
  if (!migration.complete && migration.migrated) return { authenticated: true, migrated: true, migration }
  await Promise.allSettled([
    hydrateChallengesFromServer(),
    hydratePlayerFromServer(),
    hydrateSubmissionsFromServer(),
    hydrateReplaysFromServer(),
    hydrateCompetitiveFromServer(),
    hydrateAchievementsFromServer(),
    hydrateLeaderboardFromServer(),
  ])

  return { authenticated: true, migrated: migration.migrated, migration }
}

export async function refreshDatabase() {
  const user = await bootstrapAuth()
  if (!user) return false
  await flushSyncQueue()
  await Promise.allSettled([
    hydrateChallengesFromServer(),
    hydratePlayerFromServer(),
    hydrateSubmissionsFromServer(),
    hydrateReplaysFromServer(),
    hydrateCompetitiveFromServer(),
    hydrateAchievementsFromServer(),
    hydrateLeaderboardFromServer(),
  ])
  return true
}

export async function postArenaEvent(eventType, payload = {}) {
  try {
    await apiRequest('/events', {
      method: 'POST',
      body: JSON.stringify({ eventType, payload }),
    })
    return true
  } catch {
    return false
  }
}
