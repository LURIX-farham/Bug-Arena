import { allChallenges } from '../src/data/challenges/index.js'
import { validateChallenge } from '../src/data/challengeSchema.js'

const failures = []
const ids = new Set()
const slugs = new Set()

if (allChallenges.length < 15) {
  failures.push(`Expected at least 15 published challenges, found ${allChallenges.length}.`)
}

for (const challenge of allChallenges) {
  if (ids.has(challenge.id)) failures.push(`Duplicate challenge id: ${challenge.id}`)
  if (slugs.has(challenge.slug)) failures.push(`Duplicate challenge slug: ${challenge.slug}`)
  ids.add(challenge.id)
  slugs.add(challenge.slug)

  const errors = validateChallenge(challenge)
  if (errors.length) failures.push(`#${challenge.id} ${challenge.title}: ${errors.join('; ')}`)

  if (challenge.status !== 'published') failures.push(`#${challenge.id} must be published for the active archive.`)
}

if (failures.length) {
  console.error('Challenge schema QA failed:\n- ' + failures.join('\n- '))
  process.exit(1)
}

console.log(`Challenge schema QA passed: ${allChallenges.length} published challenges validated.`)
