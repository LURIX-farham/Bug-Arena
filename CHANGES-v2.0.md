# Bug Arena v2.0 — review & improvements

## ⚠️ Do these first
1. **Rotate your database password.** The uploaded zip contained the real MySQL
   password in `.env` and as a default in `backend/config/config.php`. Both are
   removed now, but treat the old password as exposed and change it in cPanel.
2. **Rebuild the frontend** (`npm ci && VITE_API_BASE_URL=/api npm run build`) and
   upload the new `dist/` plus `deploy/public_html.htaccess` (CSP fix, see below).
   `dist/` was removed from this zip because it was built from the old code.
3. Delete old `backend/public/error_log`, `probe-path.php`, `config.zip`, `logs/*`
   from the server (they were inside the web root).

## Critical bugs found & fixed
| # | Problem | Fix |
|---|---|---|
| 1 | **Nobody could run tests in production.** Server Python failed (`shell_exec` disabled on the host, see logs) and the in-browser fallback (Pyodide + Google Fonts) was blocked by your own CSP (`script-src 'self'`). | CSP now allows jsDelivr (Pyodide, `wasm-unsafe-eval`) and Google Fonts. |
| 2 | **Anyone could fake a perfect score.** When the server couldn't run Python it trusted client-sent `testsPassed/testsTotal`; `1/1` earned full points. | `ScoringService` only accepts a perfect run of the real core or full suite; unverified runs need ≥3 s solve time and never get the hardening bonus. New switch `BUGARENA_REQUIRE_VERIFIED=1` refuses unverified scores. |
| 3 | `/execute` accepted **client-supplied tests** (free code execution, self-written "passing" tests) and didn't match what the frontend sends, so the UI silently fell back to local. | Rewritten: takes `challengeId` + `scope`, loads tests from the DB, hides hidden-test details, answers 503 `execution_unavailable` when the host can't run Python. |
| 4 | Python sandbox: player code inherited the PHP environment (**DB password readable via `os.environ`**), could read files like `.env`, and could read the expected answers of hidden tests via frame introspection. | New `python_harness.py`: minimal env, `python -I -S`, CPU/memory/file limits, audit hook (no subprocess/network/ctypes/file writes/reads outside Python install). Expected values never enter the Python process; PHP compares. 15 hostile test cases pass. |
| 5 | Hardening attempt that failed a hidden test rejected the whole submission (409). | Falls back to the core score. |
| 6 | `scripts/python_runner_server.py` ran player code *inside the server process*, no auth. | Rebuilt on the same sandboxed harness, bearer-token auth, concurrency cap, Docker instructions. `BUGARENA_PYTHON_RUNNER_URL` is now honoured. |
| 7 | CORS origins were hard-coded; `.env` value ignored. | Read from `BUGARENA_CORS_ORIGINS`. |
| 8 | Web-served junk: `error_log`, `probe-path.php`, logs, `config.zip`. | Deleted; `.htaccess` blocks them. Dead duplicate controllers removed. |
| 9 | Register form allowed 5-char passwords; server needs 8. | Client validation aligned. |
| 10 | Test results (incl. hidden) were `console.log`-ged. | Removed. |
| 11 | Mobile Arena: last 76 px hidden behind the bottom nav; Run/Submit buried at the bottom of the side panel. | Fixed; Run/Submit now in the editor toolbar. |

## UX & design
- **Arena editor:** Tab / Shift+Tab indent, auto-indent (+4 after `:`), `Ctrl/⌘+Enter` runs tests, Esc→Tab leaves the field (a11y), line numbers scroll with code, draft survives refresh, Reset button, "LOCAL PREVIEW" badge when the server couldn't verify a run.
- **Performance:** every page is now a lazy chunk (the Arena alone is 2,300 lines).
- **Resilience:** API timeouts (15 s) + one GET retry, branded boot screen with a "server is slow" hint, offline banner, real 404 page, deep links survive login, signed-in users skip `/login`, scroll-reveal sections can no longer stay invisible.
- **Auth:** show/hide password, inline hints, rate-limit & timeout messages, `role="alert"`.
- **Challenges:** 40+ tag chips collapsed behind "Show all tags"; `aria-pressed` on filters.
- **Accessibility:** skip link, consistent focus ring, reduced-motion respected. All new strings exist in English and Persian.
- New stylesheet `src/styles/enhancements.css`.

## Verification — and its limits
The sandbox could not reach npm, so **`vite build` and the app were not run**. Instead:
PHP lint on every file ✔ · runner security tests (15 cases) ✔ · scoring tests (8 cases) ✔ ·
remote runner tests ✔ · editor-helper unit tests ✔ · esbuild bundle of the entire app
(syntax + every import/export + code splitting) ✔ · ESLint no-undef/no-unused on edited files ✔ ·
new CSS rendered over the previous build in light/dark, desktop/mobile ✔.
Please run `npm run build` and click through Arena, Login and Challenges once.

## Still recommended
- Run `scripts/python_runner_server.py` on a small VPS/container, set `BUGARENA_PYTHON_RUNNER_URL`
  and `BUGARENA_REQUIRE_VERIFIED=1`. Until then scores on your shared host rest on the client's word (now much stricter, but not verifiable).
- Duel/competitive timers are client-side; server-side start timestamps would be the next anti-cheat step.
- Consider self-hosting fonts and Pyodide to drop the CDN CSP exceptions.
