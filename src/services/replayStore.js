import { emitArenaEvent, ARENA_EVENTS } from './eventBus.js'
import { enqueueSyncAction, removeSyncAction } from './syncQueue.js'
import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'

const STORAGE_KEY = 'bug-arena-replays'
const MAX_SESSIONS = 100
const MAX_EVENTS = 80
const MAX_CODE_LENGTH = 200_000

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readState() {
  if (!canUseStorage()) return { sessions: [] }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null')
    return parsed && Array.isArray(parsed.sessions) ? parsed : { sessions: [] }
  } catch {
    return { sessions: [] }
  }
}

function writeState(state) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    window.dispatchEvent(new CustomEvent('bug-arena:replay-updated'))
    return true
  } catch {
    return false
  }
}

function cleanCode(code) {
  return typeof code === 'string' ? code.slice(0, MAX_CODE_LENGTH) : ''
}

function cleanEvent(event) {
  return {
    type: String(event.type || 'event').slice(0, 40),
    at: String(event.at || new Date().toISOString()),
    elapsedMs: Math.max(0, Number(event.elapsedMs) || 0),
    payload: event.payload && typeof event.payload === 'object' ? event.payload : {},
  }
}

export function startReplaySession({ challengeId, challengeTitle, difficulty, timeLimit, mode = 'practice', opponentId = null }) {
  const startedAt = new Date().toISOString()
  const session = {
    id: `replay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    challengeId: Number(challengeId),
    challengeTitle: String(challengeTitle || 'Challenge').slice(0, 160),
    difficulty: String(difficulty || 'unknown').slice(0, 40),
    timeLimit: Math.max(0, Number(timeLimit) || 0),
    mode: String(mode || 'practice').slice(0, 40),
    opponentId: opponentId ? String(opponentId).slice(0, 60) : null,
    startedAt,
    finishedAt: null,
    durationMs: null,
    status: 'active',
    finalScore: 0,
    attempts: 0,
    hardened: false,
    timeLeft: 0,
    code: '',
    events: [{ type: 'session_started', at: startedAt, elapsedMs: 0, payload: {} }],
  }

  const state = readState()
  state.sessions = [...state.sessions, session].slice(-MAX_SESSIONS)
  writeState(state)
  if (isAuthenticated()) {
    apiRequest('/replays', { method: 'POST', body: JSON.stringify(session) }).catch(() => undefined)
  }
  emitArenaEvent(ARENA_EVENTS.SESSION_STARTED, { sessionId: session.id, challengeId: session.challengeId, mode: session.mode })
  return session.id
}

export function recordReplayEvent(sessionId, event) {
  if (!sessionId) return false
  const state = readState()
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session || session.status === 'finished') return false

  session.events = [...session.events, cleanEvent(event)].slice(-MAX_EVENTS)
  const saved = writeState(state)
  if (saved) {
    emitArenaEvent(ARENA_EVENTS.TEST_EXECUTED, { sessionId, type: event?.type || 'event' })
    if (isAuthenticated()) {
      apiRequest(`/replays/${encodeURIComponent(sessionId)}/events`, { method: 'POST', body: JSON.stringify(cleanEvent(event)) }).catch(() => undefined)
    }
  }
  return saved
}

export function finishReplaySession(sessionId, result = {}) {
  if (!sessionId) return false
  const state = readState()
  const session = state.sessions.find((item) => item.id === sessionId)
  if (!session) return false

  const finishedAt = new Date().toISOString()
  const startedTime = new Date(session.startedAt).getTime()
  const finishedTime = new Date(finishedAt).getTime()

  session.finishedAt = finishedAt
  session.durationMs = Math.max(0, finishedTime - (Number.isNaN(startedTime) ? finishedTime : startedTime))
  session.status = String(result.status || 'completed')
  session.finalScore = Math.max(0, Number(result.score) || 0)
  session.attempts = Math.max(0, Number(result.attempts) || 0)
  session.hardened = Boolean(result.hardened)
  session.timeLeft = Math.max(0, Number(result.timeLeft) || 0)
  session.code = cleanCode(result.code)
  session.events = [...session.events, cleanEvent({
    type: 'session_finished',
    payload: {
      status: session.status,
      score: session.finalScore,
      attempts: session.attempts,
      hardened: session.hardened,
      timeLeft: session.timeLeft,
    },
  })].slice(-MAX_EVENTS)

  const saved = writeState(state)
  if (saved) {
    const eventType = session.status === 'completed' ? ARENA_EVENTS.SESSION_FINISHED : ARENA_EVENTS.SESSION_ABANDONED
    emitArenaEvent(eventType, { sessionId, status: session.status, score: session.finalScore })
    const sync = enqueueSyncAction('REPLAY_FINISHED', { sessionId, status: session.status, score: session.finalScore, attempts: session.attempts })
    if (isAuthenticated()) {
      apiRequest(`/replays/${encodeURIComponent(sessionId)}/finish`, { method: 'POST', body: JSON.stringify({ status: session.status, score: session.finalScore, attempts: session.attempts, hardened: session.hardened, timeLeft: session.timeLeft, code: session.code, finishedAt }) })
        .then(() => removeSyncAction(sync.id))
        .catch(() => undefined)
    }
  }
  return saved
}

export function abandonReplaySession(sessionId, reason = 'abandoned') {
  return finishReplaySession(sessionId, { status: reason })
}

export async function hydrateReplaysFromServer() {
  if (!isAuthenticated()) return false
  try {
    const result = await apiRequest('/replays')
    if (!Array.isArray(result?.sessions) || !canUseStorage()) return false
    const sessions = result.sessions.map((session) => ({
      ...session,
      id: session.id || session.public_id,
      code: session.code || session.finalCode || '',
      timeLeft: Number(session.timeLeft) || 0,
      events: Array.isArray(session.events) ? session.events : [],
    }))
    writeState({ sessions: sessions.slice(-MAX_SESSIONS) })
    window.dispatchEvent(new CustomEvent('bug-arena:replay-updated'))
    return true
  } catch {
    return false
  }
}

export function getReplaySessions() {
  const sessions = readState().sessions.slice()
  try {
    const raw = window.localStorage.getItem('bug-arena-submissions')
    const submissions = raw ? JSON.parse(raw) : []
    for (const submission of Array.isArray(submissions) ? submissions : []) {
      const exists = sessions.some((session) => Number(session.challengeId) === Number(submission.challengeId) && session.status === 'completed')
      if (exists) continue
      const submittedAt = typeof submission.submittedAt === 'string' ? submission.submittedAt : new Date().toISOString()
      sessions.push({
        id: `legacy-${submission.challengeId}-${submittedAt}`,
        challengeId: Number(submission.challengeId),
        challengeTitle: String(submission.challengeTitle || 'Challenge'),
        difficulty: 'legacy',
        timeLimit: 0,
        mode: 'legacy',
        opponentId: null,
        startedAt: submittedAt,
        finishedAt: submittedAt,
        durationMs: 0,
        status: 'completed',
        finalScore: Math.max(0, Number(submission.score) || 0),
        attempts: Math.max(1, Number(submission.attempts) || 1),
        hardened: Boolean(submission.hardened),
        timeLeft: Math.max(0, Number(submission.timeLeft) || 0),
        code: cleanCode(submission.code),
        events: [{ type: 'legacy_submission', at: submittedAt, elapsedMs: 0, payload: { source: 'pre-phase-5' } }],
      })
    }
  } catch {
    // Legacy replay migration is best-effort.
  }
  return sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
}

export function getReplaySession(sessionId) {
  return readState().sessions.find((item) => item.id === sessionId) || null
}

export function getReplayAnalytics() {
  const sessions = getReplaySessions().filter((session) => session.status !== 'active')
  if (!sessions.length) {
    return {
      sessions: 0,
      completed: 0,
      abandoned: 0,
      averageDurationMs: 0,
      averageAttempts: 0,
      averageScore: 0,
      hardeningRate: 0,
      averageSpeedPercent: 0,
      fastestMs: 0,
      bestScore: 0,
      bestChallenge: null,
      difficultyBreakdown: {},
      modeBreakdown: {},
      eventCounts: {},
    }
  }

  const completed = sessions.filter((session) => session.status === 'completed')
  const durations = completed.map((session) => Number(session.durationMs) || 0).filter(Boolean)
  const totalAttempts = completed.reduce((sum, session) => sum + (Number(session.attempts) || 0), 0)
  const totalScore = completed.reduce((sum, session) => sum + (Number(session.finalScore) || 0), 0)
  const hardened = completed.filter((session) => session.hardened).length
  const speedValues = completed
    .filter((session) => Number(session.timeLimit) > 0)
    .map((session) => Math.min(100, Math.round(((Number(session.timeLimit) - Number(session.timeLeft || 0)) / Number(session.timeLimit)) * 100)))

  const difficultyBreakdown = {}
  const modeBreakdown = {}
  const eventCounts = {}
  for (const session of sessions) {
    difficultyBreakdown[session.difficulty] = (difficultyBreakdown[session.difficulty] || 0) + 1
    modeBreakdown[session.mode] = (modeBreakdown[session.mode] || 0) + 1
    for (const event of session.events || []) {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1
    }
  }

  const bestSession = completed.slice().sort((a, b) => (Number(b.finalScore) || 0) - (Number(a.finalScore) || 0))[0] || null

  return {
    sessions: sessions.length,
    completed: completed.length,
    abandoned: sessions.length - completed.length,
    averageDurationMs: durations.length ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
    averageAttempts: completed.length ? Math.round((totalAttempts / completed.length) * 10) / 10 : 0,
    averageScore: completed.length ? Math.round(totalScore / completed.length) : 0,
    hardeningRate: completed.length ? Math.round((hardened / completed.length) * 100) : 0,
    averageSpeedPercent: speedValues.length ? Math.round(speedValues.reduce((a, b) => a + b, 0) / speedValues.length) : 0,
    fastestMs: durations.length ? Math.min(...durations) : 0,
    bestScore: bestSession ? Number(bestSession.finalScore) || 0 : 0,
    bestChallenge: bestSession ? bestSession.challengeTitle : null,
    difficultyBreakdown,
    modeBreakdown,
    eventCounts,
  }
}

export function clearReplayData() {
  if (!canUseStorage()) return false
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent('bug-arena:replay-updated'))
    return true
  } catch {
    return false
  }
}
