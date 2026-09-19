import fs from 'node:fs'
import path from 'node:path'
const root = process.cwd()
const required = ['src/services/replayStore.js','src/pages/Replays/Replays.jsx','src/pages/Analytics/Analytics.jsx','src/pages/Analytics/Analytics.css']
for (const file of required) if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing Phase 5 file: ${file}`)
const replayStore = fs.readFileSync(path.join(root, 'src/services/replayStore.js'), 'utf8')
const arena = fs.readFileSync(path.join(root, 'src/pages/Arena/Arena.jsx'), 'utf8')
const analytics = fs.readFileSync(path.join(root, 'src/pages/Analytics/Analytics.jsx'), 'utf8')
for (const token of ['startReplaySession','recordReplayEvent','finishReplaySession','getReplayAnalytics']) if (!replayStore.includes(token)) throw new Error(`Replay API missing: ${token}`)
for (const token of ['startReplaySession','recordReplayEvent','finishReplaySession']) if (!arena.includes(token)) throw new Error(`Arena replay integration missing: ${token}`)
for (const token of ['averageScore','averageAttempts','hardeningRate','difficultyBreakdown','modeBreakdown']) if (!analytics.includes(token)) throw new Error(`Analytics metric missing: ${token}`)
console.log('Replay/Analytics QA passed: timeline capture, replay viewer, and performance metrics are wired.')
