# Bug Arena v1.9.1 — Server-authoritative execution

## Security
- Hidden tests no longer shipped to the browser (API strips args/expected).
- `POST /execute` runs public tests server-side; `scope=full` for hardening status only.
- `POST /submissions` executes the full suite on the server and ignores client scores/test counts.
- Optional remote runner: `BUGARENA_PYTHON_RUNNER_URL` + `scripts/python_runner_server.py`.

## QA
- Runtime QA fixed solutions for challenges 1017–1024.
- All 23 published challenges pass schema + runtime QA.

## Config
```
BUGARENA_PYTHON_RUNNER_URL=
BUGARENA_EXEC_TIMEOUT=8
BUGARENA_EXEC_MEMORY_MB=128
```
