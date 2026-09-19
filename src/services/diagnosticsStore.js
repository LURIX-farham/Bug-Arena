import { challenges } from '../data/challenges.js'
import { getStorageHealth, getDataVersion, isBrowserOnline } from './dataProvider.js'
import { getSyncStats } from './syncQueue.js'
import { CURRENT_SCHEMA_VERSION } from './migrations.js'
import { getRecentArenaEvents } from './eventBus.js'
import { getReplaySessions } from './replayStore.js'
import { getCompetitiveMatches } from './competitiveStore.js'
import { getCompletedChallenges } from './submissionStore.js'
import { isAuthenticated } from './authStore.js'

export function getSystemDiagnostics() {
  const storage = getStorageHealth()
  const replays = getReplaySessions()
  const matches = getCompetitiveMatches()
  const submissions = getCompletedChallenges()
  const sync = getSyncStats()
  const events = getRecentArenaEvents(1)
  return {
    appVersion: '1.8.1',
    architectureVersion: CURRENT_SCHEMA_VERSION,
    provider: isAuthenticated() ? 'mysql + local-cache' : 'mysql (not authenticated)',
    online: isBrowserOnline(),
    storage,
    dataVersion: getDataVersion(),
    challenges: Object.keys(challenges).length,
    submissions: submissions.length,
    replays: replays.length,
    matches: matches.length,
    sync,
    lastEvent: events[0] || null,
    checkedAt: new Date().toISOString(),
  }
}
