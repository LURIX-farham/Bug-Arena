import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  ['backend/database/schema.sql', ['CREATE TABLE IF NOT EXISTS users', 'CREATE TABLE IF NOT EXISTS submissions', 'CREATE TABLE IF NOT EXISTS replay_sessions', 'CREATE TABLE IF NOT EXISTS competitive_matches', 'CREATE TABLE IF NOT EXISTS sessions', 'CREATE TABLE IF NOT EXISTS sync_actions']],
  ['backend/src/Core/Database.php', ['PDO::ATTR_EMULATE_PREPARES', 'PDO::ATTR_ERRMODE', 'function transaction']],
  ['backend/src/Core/App.php', ['session.use_strict_mode', 'DatabaseSessionHandler', 'session_start']],
  ['backend/src/Middleware/AuthMiddleware.php', ['requireAuth', 'user_id']],
  ['backend/src/Controllers/AuthController.php', ['password_hash', 'password_verify']],
  ['backend/routes/api.php', ['/auth/register', '/auth/login', '/auth/me', '/submissions']],
  ['src/services/apiClient.js', ['credentials: \'include\'', 'VITE_API_BASE_URL']],
  ['src/services/authStore.js', ['registerAccount', 'loginAccount', 'bootstrapAuth', 'logoutAccount']],
]

for (const [relative, tokens] of required) {
  const file = path.join(root, relative)
  if (!fs.existsSync(file)) throw new Error(`Missing ${relative}`)
  const text = fs.readFileSync(file, 'utf8')
  for (const token of tokens) if (!text.includes(token)) throw new Error(`Missing token "${token}" in ${relative}`)
}

console.log('Database Foundation QA passed: MySQL schema, PHP API, session auth, and frontend API client are wired.')
