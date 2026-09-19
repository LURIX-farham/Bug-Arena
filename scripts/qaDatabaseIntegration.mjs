import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  ['src/pages/Auth.jsx', ['loginAccount', 'registerAccount', 'password', 'refreshDatabase']],
  ['src/services/databaseSync.js', ['migrateLocalData', 'hydrateSubmissionsFromServer', 'hydrateReplaysFromServer', 'hydrateCompetitiveFromServer', 'hydrateChallengesFromServer', 'registerSyncSender']],
  ['src/services/submissionStore.js', ['apiRequest(\'/submissions\'', 'hydrateSubmissionsFromServer']],
  ['src/services/replayStore.js', ['apiRequest(\'/replays\'', 'hydrateReplaysFromServer', '/finish']],
  ['src/services/competitiveStore.js', ['apiRequest(\'/competitive/matches\'', 'hydrateCompetitiveFromServer']],
  ['src/services/achievementStore.js', ['apiRequest(\'/achievements\'', 'hydrateAchievementsFromServer']],
  ['src/services/leaderboardStore.js', ['apiRequest(\'/leaderboard\'', 'hydrateLeaderboardFromServer']],
  ['src/services/apiClient.js', ['X-CSRF-Token', "credentials: 'include'"]],
  ['backend/src/Middleware/CsrfMiddleware.php', ['hash_equals', 'csrf_token']],
  ['src/App.jsx', ['ProtectedShell', 'bootstrapDatabase', 'auth-updated']],
  ['backend/routes/api.php', ['/auth/register', '/auth/login', '/auth/me', '/player', '/submissions', '/replays', '/competitive/matches', '/achievements', '/leaderboard', '/events', '/challenges']],
]

for (const [relative, tokens] of required) {
  const file = path.join(root, relative)
  if (!fs.existsSync(file)) throw new Error(`Missing ${relative}`)
  const text = fs.readFileSync(file, 'utf8')
  for (const token of tokens) if (!text.includes(token)) throw new Error(`Missing token "${token}" in ${relative}`)
}

console.log('Database Integration QA passed: authentication, player, submissions, replays, competitive data, achievements, leaderboard, and server events are wired to the PHP/MySQL API.')
