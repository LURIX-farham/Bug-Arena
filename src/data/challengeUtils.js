export const DIFFICULTIES = ['ALL', 'EASY', 'MEDIUM', 'HARD', 'EXPERT']
export const SORT_OPTIONS = ['DEFAULT', 'DIFFICULTY', 'SCORE', 'TIME']

const difficultyWeight = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
}

export function filterChallenges(challenges, { difficulty = 'ALL', query = '', tag = 'ALL' } = {}) {
  const normalizedQuery = query.trim().toLowerCase()

  return challenges.filter((challenge) => {
    const matchesDifficulty = difficulty === 'ALL' || challenge.difficulty.toUpperCase() === difficulty
    const matchesTag = tag === 'ALL' || challenge.tags.includes(tag)
    const searchable = [
      challenge.title,
      challenge.description,
      challenge.category,
      ...challenge.tags,
    ].join(' ').toLowerCase()

    return matchesDifficulty && matchesTag && (!normalizedQuery || searchable.includes(normalizedQuery))
  })
}

export function sortChallenges(challenges, sort = 'DEFAULT') {
  const result = [...challenges]

  if (sort === 'DIFFICULTY') {
    return result.sort((a, b) => difficultyWeight[a.difficulty] - difficultyWeight[b.difficulty] || a.id - b.id)
  }

  if (sort === 'SCORE') {
    return result.sort((a, b) => b.baseScore - a.baseScore || a.id - b.id)
  }

  if (sort === 'TIME') {
    return result.sort((a, b) => a.timeLimit - b.timeLimit || a.id - b.id)
  }

  return result
}

export function getChallengeTags(challenges) {
  return ['ALL', ...new Set(challenges.flatMap((challenge) => challenge.tags))]
}

export function getChallengeStats(challenge) {
  const tests = challenge.evaluation?.tests || []
  return {
    totalTests: tests.length,
    coreTests: tests.filter((test) => test.type === 'core').length,
    hiddenTests: tests.filter((test) => test.type === 'hidden').length,
  }
}

export function getChallengeBugTypes(challenges) {
  return ['ALL', ...new Set(challenges.map((challenge) => challenge.bugType).filter(Boolean))]
}

export function getChallengeSkills(challenges) {
  return ['ALL', ...new Set(challenges.flatMap((challenge) => challenge.skills || []))]
}
