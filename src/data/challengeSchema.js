export const VALID_DIFFICULTIES = Object.freeze(['Easy', 'Medium', 'Hard', 'Expert'])
export const VALID_STATUSES = Object.freeze(['draft', 'published', 'archived'])
export const VALID_TEST_TYPES = Object.freeze(['core', 'hidden'])

export function validateChallenge(challenge) {
  const errors = []

  if (!Number.isInteger(challenge?.id)) errors.push('id must be an integer')
  if (!challenge?.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(challenge.slug)) errors.push('slug must be kebab-case')
  if (!challenge?.title?.trim()) errors.push('title is required')
  if (!challenge?.description?.trim()) errors.push('description is required')
  if (challenge?.language !== 'Python') errors.push('language must be Python')
  if (!VALID_DIFFICULTIES.includes(challenge?.difficulty)) errors.push(`difficulty must be one of ${VALID_DIFFICULTIES.join(', ')}`)
  if (!challenge?.category?.trim()) errors.push('category is required')
  if (!VALID_STATUSES.includes(challenge?.status)) errors.push(`status must be one of ${VALID_STATUSES.join(', ')}`)
  if (!Number.isFinite(challenge?.timeLimit) || challenge.timeLimit <= 0) errors.push('timeLimit must be positive')
  if (!Number.isFinite(challenge?.baseScore) || challenge.baseScore <= 0) errors.push('baseScore must be positive')
  if (!Array.isArray(challenge?.tags) || challenge.tags.length === 0) errors.push('at least one tag is required')
  if (!challenge?.bugType?.trim()) errors.push('bugType is required')
  if (!Array.isArray(challenge?.skills) || challenge.skills.length === 0) errors.push('at least one skill is required')
  if (!Number.isFinite(challenge?.estimatedTime) || challenge.estimatedTime <= 0) errors.push('estimatedTime must be positive')
  if (!Number.isInteger(challenge?.version) || challenge.version < 1) errors.push('version must be a positive integer')
  if (!Array.isArray(challenge?.hints) || challenge.hints.length < 1) errors.push('at least one hint is required')
  if (!challenge?.explanation?.trim()) errors.push('explanation is required')
  if (challenge?.evaluation?.type !== 'python') errors.push('evaluation.type must be python')
  if (!challenge?.evaluation?.functionName?.trim()) errors.push('evaluation.functionName is required')
  if (!challenge?.code?.trim()) errors.push('starter code is required')

  const tests = challenge?.evaluation?.tests
  if (!Array.isArray(tests) || tests.length === 0) {
    errors.push('at least one test is required')
  } else {
    const ids = new Set()
    for (const test of tests) {
      if (ids.has(test.id)) errors.push(`duplicate test id ${test.id}`)
      ids.add(test.id)
      if (!Number.isInteger(test.id)) errors.push('every test id must be an integer')
      if (!test.name?.trim()) errors.push(`test ${test.id} needs a name`)
      if (!VALID_TEST_TYPES.includes(test.type)) errors.push(`test ${test.id} has invalid type`)
      if (!Array.isArray(test.args)) errors.push(`test ${test.id} args must be an array`)
      if (!Object.prototype.hasOwnProperty.call(test, 'expected')) errors.push(`test ${test.id} needs expected output`)
    }

    if (!tests.some((test) => test.type === 'core')) errors.push('at least one core test is required')
    if (!tests.some((test) => test.type === 'hidden')) errors.push('at least one hidden test is required')
  }

  return errors
}
