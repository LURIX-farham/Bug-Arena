import {
  COMPETITIVE_MODES,
  COMPETITIVE_OPPONENTS,
  getCompetitiveStats,
  getCurrentSeason,
  getOpponent,
} from '../src/services/competitiveStore.js'

if (COMPETITIVE_OPPONENTS.length < 5) throw new Error('Competitive opponent pool is too small.')
if (!COMPETITIVE_MODES.ranked?.rating || !COMPETITIVE_MODES.blitz?.rating) throw new Error('Rated competitive modes are missing.')
if (COMPETITIVE_MODES.survival?.rating) throw new Error('Survival must not affect rating.')
if (getOpponent('missing').id !== COMPETITIVE_OPPONENTS[2].id) throw new Error('Opponent fallback is invalid.')
const stats = getCompetitiveStats()
if (stats.rating !== 1000 || stats.games !== 0) throw new Error('Fresh competitive profile is invalid.')
const season = getCurrentSeason()
if (!/^S\d{4}-\d{2}$/.test(season.id) || season.daysRemaining < 0) throw new Error('Season metadata is invalid.')

console.log(`Competitive QA passed: ${COMPETITIVE_OPPONENTS.length} opponents, ${Object.keys(COMPETITIVE_MODES).length} modes, season ${season.id}.`)
