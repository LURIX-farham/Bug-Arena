# Bug Arena Database

`bug_arena` normally installs itself on the first request (`BUGARENA_AUTO_SETUP=1`, local environments only). If you prefer manual control:

- Installer/doctor: open `http://localhost/<folder>/backend/setup.php` or run `php backend/setup.php` — it creates the database, imports `schema.sql` and seeds the challenge catalogue. Idempotent and safe to re-run.
- Fully manual: import `schema.sql`, then `seed_challenges.sql` (phpMyAdmin or mysql CLI).

The schema creates the `bug_arena` database and these tables:

- `users`
- `user_profiles`
- `seasons`
- `challenges` + `challenge_tests`
- `submissions`
- `replay_sessions` / `replay_events`
- `competitive_matches` / `competitive_players` / `ratings`
- `achievements` / `user_achievements`
- `player_statistics`
- `arena_events`
- `sync_actions`
- `sessions`
- `rate_limits`

Nothing is dropped or mutated when tables already exist — the installer only fills missing pieces.
