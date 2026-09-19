# Bug Arena — Competitive Debugging Platform

Bug Arena is a React + Vite competitive debugging platform with a PHP REST API and MySQL persistence.

## Architecture

```text
React
  ↓
Service Layer
  ↓
PHP REST API
  ↓
PDO
  ↓
MySQL (bug_arena)
```

MySQL is the source of truth for authenticated user data, progression, submissions, replays, competitive matches, ratings, achievements, analytics and activity.

LocalStorage is retained only for UI preferences, cache, offline work and the sync queue. It is not an authority for scores, XP, rating or achievements.

## Current platform

- Real PHP 8.3+ REST API
- MySQL/InnoDB schema with foreign keys, indexes, unique constraints and transactions
- **Live 1v1 Duel mode (second game mode)** — see "1v1 Duel mode" below
- Session authentication with password hashing and session regeneration
- Database-backed PHP sessions
- Origin/Referer validation plus per-session CSRF token for state-changing requests
- Rate limiting backed by MySQL
- Server-computed progression, statistics, achievements and competitive rating
- Server-backed challenge catalog
- Python/Pyodide execution in a Web Worker
- Replay sessions and event timelines
- Offline queue with idempotent server actions
- English/Persian UI with RTL/LTR support
- Responsive competitive UI
- Error, loading and empty-state handling
- Challenge/runtime/online/database QA scripts

## Requirements

- WampServer / Apache
- PHP 8.3+
- MySQL 8+ (the schema also targets modern MariaDB)
- Node.js + npm
- Apache `mod_rewrite` and `mod_headers`

## WampServer setup

Assume the project is:

```text
C:\wamp64\www\BugArena-v1.9.0
```

If your folder has another name, update `VITE_API_BASE_URL` in `.env`.

### 1. Database — automatic (recommended)

Since v1.8.3.1 the backend provisions itself. With the default WAMP setup you do **not** need to import anything by hand: the first request to `/health` creates the `bug_arena` database, imports `schema.sql` and seeds the challenge catalogue (controlled by `BUGARENA_AUTO_SETUP=1` in `.env`, local environments only).

You can also run the installer/doctor manually — in the browser:

```text
http://localhost/BugArena-v1.9.0/backend/setup.php
```

or on the CLI:

```bash
php backend/setup.php
```

Manual import is still possible if you prefer it:

```bash
C:\wamp64\bin\mysql\mysql8.4.7\bin\mysql.exe -uroot -p < backend/database/schema.sql
C:\wamp64\bin\mysql\mysql8.4.7\bin\mysql.exe -uroot -p bug_arena < backend/database/seed_challenges.sql
```

If the schema already exists, apply the challenge-content migration:

```bash
C:\wamp64\bin\mysql\mysql8.4.7\bin\mysql.exe -uroot -p bug_arena < backend/database/migrations/002_challenge_content.sql
```

The schema is idempotent for normal table creation. The migration is for databases created from the previous v2 schema.

### 2. Environment

Copy:

```text
.env.example → .env
```

Set the MySQL credentials and API URL.

Example:

```env
BUGARENA_DB_HOST=127.0.0.1
BUGARENA_DB_PORT=3306
BUGARENA_DB_NAME=bug_arena
BUGARENA_DB_USER=root
BUGARENA_DB_PASSWORD=

VITE_API_BASE_URL=http://localhost/BugArena-v1.9.0/backend/public
```

### 3. Apache

Enable `mod_rewrite`.

`backend/public/.htaccess` is deliberately independent of the project folder name. Do not add a hard-coded `RewriteBase`.

Test:

```text
http://localhost/BugArena-v1.9.0/backend/public/health
```

A healthy configured installation returns JSON with `database: "mysql"`.

## Frontend

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## QA

Challenge validation:

```bash
npm run qa:challenges
```

Python runtime:

```bash
npm run qa:runtime
```

Competitive system:

```bash
npm run qa:competitive
```

Replay/analytics:

```bash
npm run qa:replays
```

Online foundation:

```bash
npm run qa:online
```

Database foundation:

```bash
npm run qa:database
node scripts/qaDatabaseIntegration.mjs
```

PHP syntax:

```bash
find backend -name "*.php" -print0 | xargs -0 -n1 php -l
```

## API

Public:

```text
GET  /health
GET  /challenges
GET  /challenges/{id}
```

Authentication:

```text
POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout
```

Authenticated platform APIs:

```text
GET/PUT /player
GET/POST /submissions
GET/POST /replays
POST /replays/{id}/events
POST /replays/{id}/finish
GET /competitive/opponents
GET/POST /competitive/matches
GET /leaderboard
GET /achievements
POST /achievements/evaluate
GET /analytics
POST /events
POST /sync
```

## Security model

- Prepared PDO statements
- Session identity instead of client-supplied user identity
- `password_hash()` / `password_verify()`
- Strict session mode
- HttpOnly + SameSite session cookie
- Session ID regeneration on authentication
- CSRF token on authenticated state-changing requests
- Origin/Referer allow-list
- Rate limiting
- Input length/type validation
- Transactional score/progression/rating updates
- Idempotent sync and replay/match public IDs
- Server-side achievement evaluation
- Server-side competitive result calculation

## 1v1 Duel mode (v1.9.0)

The second game mode: two authenticated players race on the **same random bug challenge**.

### Flow

1. A player opens `/duel`, customizes the match (difficulty `Easy/Medium/Hard/Any` + bug type) and presses **START DUEL**.
2. The request fans out as a toast pinned to the top of every online player's screen (any page, not just the lobby).
3. The first player who presses **OK** claims the seat; everyone else's invites for that match are voided (race-safe, transactional accept).
4. Both sides land in the duel room: profile cards face each other across an animated VS divider, then a slot-machine animation locks in the random bug challenge honouring the host's filters.
5. Both players are routed into the same arena editor used by solo mode (`/arena/:id?mode=duel&match=<matchId>`).
6. When both runs are recorded (or the challenge timer expires), the server resolves the duel: **winner 90% of the bug base score + 20% bonus, loser 10%, draw 10% each**, plus Elo rating (K=32) and win/loss statistics.
7. The arena shows the verdict overlay: victory / defeat / draw, points earned, and a side-by-side final comparison (score, speed bonus, solve time, attempts, hardening).

### Technical notes

- Fully poll-based (no websockets): heartbeat every ~20s from any authenticated page, invitation inbox every ~4s, match state every ~2.5s during a duel.
- Presence is `users.last_active_at` with a 60s window; invitations expire after 90s; abandoned pending matches are lazily expired; timed-out active matches are lazily resolved (missing side recorded as an unfinished run).
- The server re-scores every duel run with `ScoringService` and stays the single source of truth for points/rating.
- While a duel is live, the rival's raw result is never sent to the client (no score spoilers) — only a boolean "finished" flag.
- Duel runs never create solo personal-best submissions, so one run cannot earn solo XP and duel points at the same time.
- Tables: `duel_matches`, `duel_invitations` (migration `backend/database/migrations/003_duel_mode.sql`; fresh installs get them via `schema.sql` automatically).

### Testing the duel mode locally

You need two signed-in browser sessions (e.g. a normal window + an incognito window):

1. Sign in as player A, open `/duel`, choose filters, press START DUEL.
2. Sign in as player B (incognito), stay on any page — the duel toast appears at the top.
3. Press OK on the toast → both players see the VS ceremony and the challenge roulette.
4. Both players debug the same challenge; the verdict overlay appears once both finish (or time runs out).

### Important Python runner limitation

Python execution remains in the browser by design. A Web Worker improves isolation and allows timeout/termination, but browser JavaScript cannot provide a trustworthy security boundary against a determined user who controls their own client.

Therefore:

- The backend never executes submitted Python through `exec`, `system`, shell commands or PHP subprocesses.
- The server owns persistent score/progression/rating state.
- The client still reports test results from the browser runner.
- For truly cheat-resistant public competition, the next architectural step is a separately sandboxed execution service with OS/container isolation. That is intentionally not part of this browser-only Python execution constraint.

## Challenge content

Challenge metadata and content are exported from:

```text
src/data/challenges/*.js
```

to:

```text
backend/database/seed_challenges.sql
```

Use:

```bash
npm run qa:challenges
node scripts/exportChallengeSeed.mjs
```

The frontend synchronizes the published database catalog before the authenticated application becomes ready and keeps the local challenge bundle as the offline fallback.

## Troubleshooting

### `{"ok":false,"error":"not_found"}`

Check that:

1. Apache is running.
2. `mod_rewrite` is enabled.
3. `.htaccess` is allowed under the WAMP document root.
4. You are opening the `backend/public` URL, not `backend/src`.
5. The project folder in `VITE_API_BASE_URL` exactly matches the WAMP folder.

### `database_unavailable`

The response now includes a `reason` field (debug mode) that tells you exactly what failed:

- `"reason": "SQLSTATE[HY000] [2002] Connection refused"` → MySQL is not running, or the port in `.env` is wrong. WAMP standard is `127.0.0.1:3306` — make sure `BUGARENA_DB_PORT` is **not** set to a non-standard port from another machine.
- `"reason": "SQLSTATE[HY000] [1049] Unknown database 'bug_arena'"` → database missing; hit `/health` once with `BUGARENA_AUTO_SETUP=1` or open `backend/setup.php` to create it.

Checklist:

1. MySQL is running (WAMP icon green).
2. `.env` port is `3306` (WAMP standard) and credentials match your MySQL.
3. Open `http://localhost/BugArena-v1.9.0/backend/setup.php` once — it creates the database, imports the schema and seeds challenges safely (idempotent).
4. PHP has `pdo_mysql` enabled (`php -m | grep pdo_mysql`).
5. Inspect `backend/logs/api-YYYY-MM-DD.log` for `db_connect` / `db_setup` entries.

### `Failed to fetch` on register/login in the browser

This used to be the signature of a database outage: the 503 JSON left the server **without CORS headers**, so the browser hid the real error behind an opaque network failure. Fixed in v1.8.3.1 — CORS headers are now emitted before any database access. If you still see `Failed to fetch`, it is a genuine reachability problem: check that the API base URL in `.env` (`VITE_API_BASE_URL`) matches the actual WAMP folder name, and that Apache serves `backend/public/health`.

### CORS / `csrf_failed`

Use one of the origins listed in `BUGARENA_CORS_ORIGINS` and access the frontend through that exact origin. Do not use `127.0.0.1` in one place and `localhost` in another unless both are configured.

### Browser shows stale local data

Sign in and allow the bootstrap synchronization to finish. The authenticated stores are hydrated from MySQL and LocalStorage is only the cache/offline layer.
