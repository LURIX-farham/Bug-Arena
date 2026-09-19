import fs from 'node:fs'
import path from 'node:path'
const root = process.cwd()
const required = [
  'src/services/dataProvider.js', 'src/services/identityStore.js', 'src/services/eventBus.js',
  'src/services/syncQueue.js', 'src/services/diagnosticsStore.js', 'src/services/migrations.js', 'src/pages/System/System.jsx',
  'src/pages/System/System.css',
]
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Phase 6 file: ${file}`)
const checks = {
  'src/services/eventBus.js': ['ARENA_EVENTS', 'emitArenaEvent', 'subscribeArenaEvent'],
  'src/services/syncQueue.js': ['enqueueSyncAction', 'getSyncStats', 'clearSyncQueue'],
  'src/services/identityStore.js': ['getIdentity', 'updateIdentity'],
  'src/services/dataProvider.js': ['readData', 'writeData', 'getStorageHealth', 'getDataVersion'],
  'src/services/diagnosticsStore.js': ['getSystemDiagnostics', 'CURRENT_SCHEMA_VERSION'],
  'src/services/migrations.js': ['runMigrations', 'CURRENT_SCHEMA_VERSION'],
  'src/App.jsx': ['/system', 'System'],
  'src/services/submissionStore.js': ['SUBMISSION_CREATED', 'enqueueSyncAction'],
  'src/services/competitiveStore.js': ['MATCH_FINISHED', 'RATING_CHANGED', 'enqueueSyncAction'],
  'src/services/replayStore.js': ['SESSION_STARTED', 'REPLAY_FINISHED'],
}
for (const [file, tokens] of Object.entries(checks)) {
  const text = fs.readFileSync(path.join(root, file), 'utf8')
  for (const token of tokens) if (!text.includes(token)) throw new Error(`${token} missing from ${file}`)
}
console.log('Online Foundation QA passed: provider, identity, events, sync queue, diagnostics, and domain integrations are wired.')
