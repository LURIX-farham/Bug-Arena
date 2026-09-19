import { getCompletedChallenges } from './submissionStore.js'
import { getProgressionStats } from './progressionStore.js'
import { apiRequest } from './apiClient.js'
import { isAuthenticated } from './authStore.js'

const STORAGE_KEY = 'bug-arena-achievements'

export const achievements = [
  { id: 'first-fix', title: 'FIRST FIX', description: 'Submit your first repaired challenge.', icon: '01', check: ({ solved }) => solved >= 1 },
  { id: 'three-down', title: 'THREE DOWN', description: 'Solve three different challenges.', icon: '03', check: ({ solved }) => solved >= 3 },
  { id: 'archive-half', title: 'HALF ARCHIVE', description: 'Solve at least half of the available challenges.', icon: '50', check: ({ solved, totalChallenges }) => totalChallenges > 0 && solved >= Math.ceil(totalChallenges / 2) },
  { id: 'full-archive', title: 'ARCHIVE CLEARED', description: 'Solve every available challenge.', icon: 'ALL', check: ({ solved, totalChallenges }) => totalChallenges > 0 && solved >= totalChallenges },
  { id: 'hardener', title: 'HARDENED', description: 'Pass hidden hardening tests.', icon: 'HD', check: ({ hardened }) => hardened >= 1 },
  { id: 'clean-run', title: 'CLEAN RUN', description: 'Solve a challenge with one test run.', icon: '1X', check: ({ cleanRuns }) => cleanRuns >= 1 },
  { id: 'high-score', title: 'FOUR DIGITS', description: 'Reach 1,000 total points.', icon: '1K', check: ({ totalScore }) => totalScore >= 1000 },
  { id: 'level-three', title: 'LEVEL THREE', description: 'Reach level 3.', icon: 'L3', check: ({ level }) => level >= 3 },
  { id: 'level-five', title: 'CODE BREAKER', description: 'Reach level 5.', icon: 'L5', check: ({ level }) => level >= 5 },
  { id: 'streak-three', title: 'THREE-DAY STREAK', description: 'Solve challenges on three consecutive days.', icon: '3D', check: ({ bestStreak }) => bestStreak >= 3 },
  { id: 'streak-seven', title: 'SEVEN-DAY STREAK', description: 'Maintain a seven-day debugging streak.', icon: '7D', check: ({ bestStreak }) => bestStreak >= 7 },
  { id: 'ten-solved', title: 'DOUBLE DIGITS', description: 'Solve ten different challenges.', icon: '10', check: ({ solved }) => solved >= 10 },
]

function readUnlocked() {
  if (typeof window === 'undefined') return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.map(String) : []
  } catch {
    return []
  }
}

function writeUnlocked(keys) {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(keys)]))
    return true
  } catch {
    return false
  }
}

export async function hydrateAchievementsFromServer() {
  if (!isAuthenticated()) return false
  try {
    const result = await apiRequest('/achievements')
    const keys = Array.isArray(result?.achievements) ? result.achievements.map((item) => String(item.achievementKey)) : []
    writeUnlocked(keys)
    return true
  } catch {
    return false
  }
}

export function getAchievementStats(totalChallenges) {
  const submissions = getCompletedChallenges()
  const progression = getProgressionStats(submissions)
  return { ...progression, totalChallenges, totalScore: progression.xp }
}

export function getAchievementProgress(totalChallenges) {
  const stats = getAchievementStats(totalChallenges)
  const unlocked = new Set(readUnlocked())
  return achievements.map((achievement) => ({
    ...achievement,
    unlocked: unlocked.has(achievement.id) || Boolean(achievement.check(stats)),
  }))
}

export function syncComputedAchievements() {
  if (!isAuthenticated()) return Promise.resolve([])
  return apiRequest('/achievements/evaluate', {
    method: 'POST',
    body: '{}',
  }).then((result) => {
    const keys = Array.isArray(result?.unlockedAchievements)
      ? result.unlockedAchievements.map((item) => String(item.achievementKey || item))
      : []
    if (keys.length) writeUnlocked(keys)
    return keys
  }).catch(() => [])
}

export function getUnlockedAchievementKeys() {
  return readUnlocked()
}
