import { emitArenaEvent, ARENA_EVENTS } from './eventBus.js'
import { enqueueSyncAction, removeSyncAction } from './syncQueue.js'
import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'

const STORAGE_KEY = 'bug-arena-submissions'
const MAX_CODE_LENGTH = 200_000

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function read() {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && Number.isInteger(Number(item.challengeId))).map(normalizeSubmission)
  } catch {
    return []
  }
}

function write(submissions) {
  if (!canUseStorage()) return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
    return true
  } catch {
    return false
  }
}

function emitUpdate() {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bug-arena:submission-updated'))
}

function normalizeSubmission(submission) {
  return {
    challengeId: Number(submission.challengeId),
    challengeTitle: String(submission.challengeTitle || 'Challenge').trim().slice(0, 160),
    score: Math.max(0, Number(submission.score) || 0),
    baseScore: Math.max(0, Number(submission.baseScore) || 0),
    speedBonus: Math.max(0, Number(submission.speedBonus) || 0),
    attemptBonus: Math.max(0, Number(submission.attemptBonus) || 0),
    hardeningBonus: Math.max(0, Number(submission.hardeningBonus) || 0),
    attempts: Math.max(1, Number(submission.attempts) || 1),
    hardened: Boolean(submission.hardened),
    timeLeft: Math.max(0, Number(submission.timeLeft) || 0),
    code: typeof submission.code === 'string' ? submission.code.slice(0, MAX_CODE_LENGTH) : '',
    submittedAt: typeof submission.submittedAt === 'string' ? submission.submittedAt : new Date().toISOString(),
  }
}

function isValidSubmission(submission) {
  return Number.isInteger(submission.challengeId) && submission.challengeId > 0 && Number.isFinite(submission.score) && submission.score >= 0 && submission.code.length <= MAX_CODE_LENGTH
}

export async function hydrateSubmissionsFromServer() {
  if (!isAuthenticated()) return false
  try {
    const result = await apiRequest('/submissions')
    if (!Array.isArray(result?.submissions)) return false
    const normalized = result.submissions.map(normalizeSubmission)
    write(normalized)
    emitUpdate()
    return true
  } catch {
    return false
  }
}

export function saveSubmission(submission) {
  const incoming = normalizeSubmission(submission)
  if (!isValidSubmission(incoming)) return { saved: false, reason: 'invalid_submission', submission: incoming }

  const submissions = read()
  const index = submissions.findIndex((item) => Number(item.challengeId) === incoming.challengeId)
  if (index >= 0) {
    const existing = normalizeSubmission(submissions[index])
    if (incoming.score <= existing.score) return { saved: false, reason: 'not_better', submission: existing }
    submissions[index] = { ...incoming, previousBest: existing.score }
  } else {
    submissions.push(incoming)
  }

  const saved = write(submissions)
  if (!saved) return { saved: false, reason: 'storage_error', submission: incoming }

  emitUpdate()
  emitArenaEvent(ARENA_EVENTS.SUBMISSION_CREATED, { challengeId: incoming.challengeId, score: incoming.score, attempts: incoming.attempts, hardened: incoming.hardened })

  if (isAuthenticated()) {
    const sync = enqueueSyncAction('SUBMISSION_CREATED', incoming)
    apiRequest('/submissions', { method: 'POST', body: JSON.stringify(incoming) })
      .then(() => removeSyncAction(sync.id))
      .catch(() => undefined)
  }

  return { saved: true, reason: 'saved', submission: incoming }
}

export function getSubmission(challengeId) {
  return read().find((item) => Number(item.challengeId) === Number(challengeId)) || null
}

export function isChallengeCompleted(challengeId) {
  return Boolean(getSubmission(challengeId))
}

export function getCompletedChallenges() {
  return read()
}

export function getTotalScore() {
  return read().reduce((total, item) => total + (Number(item.score) || 0), 0)
}

export function clearAllSubmissions() {
  if (!canUseStorage()) return false
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    emitUpdate()
    return true
  } catch {
    return false
  }
}

export function getLocalSubmissionsForMigration() {
  return read()
}
