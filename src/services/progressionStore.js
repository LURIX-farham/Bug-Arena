import { getCompletedChallenges, getTotalScore } from './submissionStore'

export const LEVEL_XP_BASE = 250
export const LEVEL_XP_GROWTH = 1.35

export const RANKS = Object.freeze([
  { minLevel: 1, title: 'ROOKIE DEBUGGER' },
  { minLevel: 3, title: 'BUG HUNTER' },
  { minLevel: 5, title: 'CODE BREAKER' },
  { minLevel: 8, title: 'DEBUGGING ACE' },
  { minLevel: 12, title: 'ARENA VETERAN' },
  { minLevel: 16, title: 'BUG ARCHITECT' },
  { minLevel: 20, title: 'ARENA LEGEND' },
])

function toDateKey(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function dayDifference(a, b) {
  const first = new Date(`${a}T00:00:00Z`).getTime()
  const second = new Date(`${b}T00:00:00Z`).getTime()
  return Math.round(Math.abs(first - second) / 86400000)
}

function uniqueSubmissionDays(submissions) {
  return [...new Set(
    submissions
      .map((item) => toDateKey(item.submittedAt))
      .filter(Boolean),
  )].sort()
}

export function xpForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1))
  if (safeLevel === 1) return 0
  return Math.round(LEVEL_XP_BASE * Math.pow(safeLevel - 1, LEVEL_XP_GROWTH))
}

export function getLevelFromXp(xp) {
  const safeXp = Math.max(0, Number(xp) || 0)
  let level = 1
  while (xpForLevel(level + 1) <= safeXp && level < 100) level += 1
  return level
}

export function getLevelProgress(xp) {
  const level = getLevelFromXp(xp)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  const span = Math.max(1, nextLevelXp - currentLevelXp)
  const current = Math.max(0, xp - currentLevelXp)

  return {
    level,
    currentLevelXp,
    nextLevelXp,
    currentXp: current,
    remainingXp: Math.max(0, nextLevelXp - xp),
    percent: Math.min(100, Math.round((current / span) * 100)),
  }
}

export function getRankForLevel(level) {
  const safeLevel = Math.max(1, Number(level) || 1)
  return [...RANKS].reverse().find((rank) => safeLevel >= rank.minLevel) || RANKS[0]
}

export function getStreakStats(submissions = getCompletedChallenges()) {
  const days = uniqueSubmissionDays(submissions)
  if (days.length === 0) return { current: 0, best: 0, activeToday: false }

  let best = 1
  let run = 1
  for (let index = 1; index < days.length; index += 1) {
    if (dayDifference(days[index - 1], days[index]) === 1) {
      run += 1
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }

  const today = toDateKey(new Date())
  const latest = days[days.length - 1]
  const gap = today && latest ? dayDifference(today, latest) : Infinity

  if (gap > 1) return { current: 0, best, activeToday: false }

  let current = 1
  for (let index = days.length - 1; index > 0; index -= 1) {
    if (dayDifference(days[index - 1], days[index]) !== 1) break
    current += 1
  }

  return {
    current,
    best: Math.max(best, current),
    activeToday: gap === 0,
  }
}

export function getProgressionStats(submissions = getCompletedChallenges()) {
  const score = getTotalScore()
  const xp = score
  const levelData = getLevelProgress(xp)
  const streak = getStreakStats(submissions)
  const solved = submissions.length
  const hardened = submissions.filter((item) => item.hardened).length
  const cleanRuns = submissions.filter((item) => Number(item.attempts) === 1).length
  const attempts = submissions.reduce((total, item) => total + (Number(item.attempts) || 0), 0)
  const averageAttempts = solved ? Math.round((attempts / solved) * 10) / 10 : 0
  const averageScore = solved ? Math.round(score / solved) : 0
  const rank = getRankForLevel(levelData.level)

  return {
    xp,
    level: levelData.level,
    levelProgress: levelData,
    rank: rank.title,
    solved,
    hardened,
    cleanRuns,
    attempts,
    averageAttempts,
    averageScore,
    streak: streak.current,
    bestStreak: streak.best,
    activeToday: streak.activeToday,
  }
}
