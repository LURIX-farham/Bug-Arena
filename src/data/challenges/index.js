import brokenFilter from './the-broken-filter.js'
import duplicateSignal from './duplicate-signal.js'
import priorityInversion from './priority-inversion.js'
import windowedAverage from './windowed-average.js'
import cacheKeyCollision from './cache-key-collision.js'
import boundaryWindow from './boundary-window.js'
import quotaGuard from './quota-guard.js'
import casefoldIndex from './casefold-index.js'
import mergeIntervals from './merge-intervals.js'
import frequencyRank from './frequency-rank.js'
import parseVersion from './parse-version.js'
import balancedBrackets from './balanced-brackets.js'
import normalizeEmail from './normalize-email.js'
import rollingErrors from './rolling-errors.js'
import priorityQueue from './priority-queue.js'

const challengeList = [
  brokenFilter,
  duplicateSignal,
  priorityInversion,
  windowedAverage,
  cacheKeyCollision,
  boundaryWindow, quotaGuard, casefoldIndex, mergeIntervals, frequencyRank, parseVersion,
  balancedBrackets, normalizeEmail, rollingErrors, priorityQueue,
]

export const challengeRegistry =
  Object.fromEntries(challengeList.map((challenge) => [challenge.id, challenge]))

export const challenges = challengeRegistry
export const allChallenges = [...challengeList]

export function getChallengeById(id) {
  return challengeRegistry[Number(id)] || null
}

export function getChallengeBySlug(slug) {
  return allChallenges.find((challenge) => challenge.slug === slug) || null
}

export function getPublishedChallenges() {
  return allChallenges.filter((challenge) => challenge.status === 'published')
}


/**
 * Merge authoritative challenge metadata/content from MySQL into the local
 * client catalog. The local bundle remains a safe offline fallback.
 * Called before the protected app becomes ready, so existing consumers keep
 * their simple synchronous API.
 */
export function mergeServerChallenges(serverChallenges) {
  if (!Array.isArray(serverChallenges)) return 0
  let merged = 0
  for (const serverChallenge of serverChallenges) {
    const id = Number(serverChallenge?.id)
    const local = challengeRegistry[id]
    if (!local || !serverChallenge) continue
    const mergedChallenge = {
      ...local,
      ...serverChallenge,
      id,
      hints: Array.isArray(serverChallenge.hints) ? serverChallenge.hints : local.hints,
      tags: Array.isArray(serverChallenge.tags) ? serverChallenge.tags : local.tags,
      skills: Array.isArray(serverChallenge.skills) ? serverChallenge.skills : local.skills,
      evaluation: {
        ...local.evaluation,
        functionName: serverChallenge.functionName || local.evaluation.functionName,
        tests: Array.isArray(serverChallenge.evaluationTests) && serverChallenge.evaluationTests.length
          ? serverChallenge.evaluationTests
          : local.evaluation.tests,
      },
      code: serverChallenge.code || local.code,
      timeLimit: Number(serverChallenge.timeLimit ?? local.timeLimit),
      baseScore: Number(serverChallenge.baseScore ?? local.baseScore),
      hardeningBonus: Number(serverChallenge.hardeningBonus ?? local.hardeningBonus),
      estimatedTime: Number(serverChallenge.estimatedTime ?? local.estimatedTime),
      version: Number(serverChallenge.version ?? local.version),
    }
    challengeRegistry[id] = mergedChallenge
    const index = allChallenges.findIndex((item) => item.id === id)
    if (index >= 0) allChallenges[index] = mergedChallenge
    merged += 1
  }
  return merged
}
