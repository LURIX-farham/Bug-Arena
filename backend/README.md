# Bug Arena API

PHP 8.3+ REST API for Bug Arena.

## Architecture

```text
React → Service Layer → PHP REST API → PDO → MySQL
```

`bug_arena` is the persistence authority for account data, challenges, submissions, progression, ratings, matches, replays, achievements, analytics and activity.

## Database

Schema:

```text
backend/database/schema.sql
```

Challenge-content migration:

```text
backend/database/migrations/002_challenge_content.sql
```

Challenge seed:

```text
backend/database/seed_challenges.sql
```

The schema uses InnoDB, foreign keys, indexes, unique constraints, timestamps, soft-delete fields where appropriate, transactions and prepared statements.

## Authentication

- PHP session backed by the `sessions` MySQL table
- `password_hash()` and `password_verify()`
- session ID regeneration after register/login
- strict session mode
- HttpOnly + SameSite cookie
- session expiration
- CSRF token for state-changing authenticated requests
- Origin/Referer validation
- user identity always comes from the server session

## API routes

```text
GET  /health
GET  /challenges
GET  /challenges/{id}

POST /auth/register
POST /auth/login
GET  /auth/me
POST /auth/logout

GET  /player
PUT  /player

GET  /submissions
POST /submissions

GET  /replays
POST /replays
POST /replays/{id}/events
POST /replays/{id}/finish

GET  /competitive/opponents
GET  /competitive/matches
POST /competitive/matches

GET  /leaderboard

GET  /achievements
POST /achievements/evaluate

GET  /analytics

POST /events
POST /sync
```

## WampServer

The public document root for the API is:

```text
BugArena-v1.9.0/backend/public
```

`public/.htaccess` sends non-file requests to `public/index.php`. It does not hard-code a `RewriteBase`, so the project can be renamed without breaking route rewriting.

Make sure Apache allows overrides and has `mod_rewrite` enabled.

## Configuration

Use the project-root `.env`:

```env
BUGARENA_ENV=local
BUGARENA_DEBUG=1
BUGARENA_DB_HOST=127.0.0.1
BUGARENA_DB_PORT=3306
BUGARENA_DB_NAME=bug_arena
BUGARENA_DB_USER=root
BUGARENA_DB_PASSWORD=
BUGARENA_AUTO_SETUP=1
BUGARENA_SESSION_LIFETIME=7200

BUGARENA_CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,http://localhost,http://127.0.0.1
```

`BUGARENA_AUTO_SETUP=1` (default for local environments) lets the backend create the database and import `schema.sql` + `seed_challenges.sql` on the first request of a fresh install. It never runs in production and never drops or mutates an existing installation. Set it to `0` to disable.

## Database installer / doctor

```text
Browser: http://localhost/<folder>/backend/setup.php
CLI:     php backend/setup.php
```

Verifies the MySQL connection, creates the database when missing, imports the schema and seeds the challenge catalogue — idempotent, safe to re-run, and disabled when `BUGARENA_ENV=production`.

## Database failure behaviour

When MySQL cannot be reached the API responds with a CORS-compliant `503` JSON:

```json
{"ok":false,"error":"database_unavailable","reason":"SQLSTATE[HY000] [2002] Connection refused"}
```

CORS headers are emitted during bootstrap — before session handling touches MySQL — so the browser always surfaces the real status instead of an opaque `Failed to fetch`. Details are logged to `backend/logs/api-YYYY-MM-DD.log` under the `db_connect` / `db_setup` / `session_start` channels.

## Error handling

The API returns JSON with appropriate HTTP status codes. Internal exception details are logged server-side and are not exposed to the browser.

## Python execution

The API deliberately does not execute submitted Python on the PHP host. The frontend runs Pyodide inside a Web Worker.

This protects the PHP host from direct shell execution, but it does not make browser execution cheat-proof. A user controls their own browser. Production-grade anti-cheat execution requires a separate sandboxed runner service.
