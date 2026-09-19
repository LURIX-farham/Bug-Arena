// Backwards-compatible entry point. New code should import from ./challenges/index.js.
export {
  challenges,
  allChallenges,
  challengeRegistry,
  getChallengeById,
  getChallengeBySlug,
  getPublishedChallenges,
} from './challenges/index.js'
