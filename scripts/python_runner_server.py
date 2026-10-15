#!/usr/bin/env python3
"""
BUG//ARENA — isolated Python runner (HTTP).

Run it on a separate small VPS / container (NOT on the web host), reachable only
from the PHP API:

    BUGARENA_RUNNER_TOKEN=<long-random-string> \
        python3 scripts/python_runner_server.py --host 0.0.0.0 --port 8090

then set on the API host:

    BUGARENA_PYTHON_RUNNER_URL=http://<runner-host>:8090/run
    BUGARENA_PYTHON_RUNNER_TOKEN=<same token>
    BUGARENA_REQUIRE_VERIFIED=1

Every request is executed in a fresh `python -I -S python_harness.py` child
process (CPU / memory / file limits + audit hook) — player code never runs
inside this server and never sees the expected answers.

Contract: POST JSON {code, function_name, tests:[{id,args,expected}], timeout_sec?, memory_mb?}
Response: {success, error, results:[{id,status,actual,error}]}

For real isolation run it in a container with no network, a read-only root
filesystem and an unprivileged user, e.g.:
    docker run --rm --network none --read-only --user 65534 --memory 512m \
        --pids-limit 64 -p 8090:8090 -v $PWD/scripts:/app:ro python:3.12-slim \
        python /app/python_runner_server.py --host 0.0.0.0
"""
from __future__ import annotations

import argparse
import hmac
import json
import math
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
HARNESS = next(
    (p for p in (
        os.path.join(HERE, "python_harness.py"),
        os.path.join(HERE, "..", "backend", "src", "Services", "python_harness.py"),
    ) if os.path.isfile(p)),
    None,
)
TOKEN = os.environ.get("BUGARENA_RUNNER_TOKEN", "")
MAX_BODY = 512_000
SLOTS = threading.BoundedSemaphore(int(os.environ.get("BUGARENA_RUNNER_CONCURRENCY", "4")))


def normalize(value):
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return str(value)
        return int(round(value)) if abs(value - round(value)) < 1e-9 else round(value, 10)
    if isinstance(value, list):
        return [normalize(v) for v in value]
    if isinstance(value, dict):
        return {str(k): normalize(v) for k, v in sorted(value.items(), key=lambda kv: str(kv[0]))}
    return value


def equal(a, b):
    try:
        return json.dumps(normalize(a), sort_keys=True, ensure_ascii=False) == \
            json.dumps(normalize(b), sort_keys=True, ensure_ascii=False)
    except Exception:
        return False


def run_payload(payload: dict) -> dict:
    if HARNESS is None:
        return {"success": False, "error": "harness_missing", "results": []}
    timeout = max(1, min(30, int(payload.get("timeout_sec") or 8)))
    memory_mb = max(64, min(1024, int(payload.get("memory_mb") or 256)))
    tests = [t for t in (payload.get("tests") or []) if isinstance(t, dict)]
    child_input = json.dumps({
        "code": str(payload.get("code") or ""),
        "function_name": str(payload.get("function_name") or ""),
        "tests": [{"id": t.get("id"), "args": t.get("args") or []} for t in tests],  # never expected
        "cpu_seconds": timeout,
        "memory_mb": memory_mb,
    })
    env = {"PATH": "/usr/local/bin:/usr/bin:/bin", "LANG": "C.UTF-8", "PYTHONIOENCODING": "utf-8",
           "PYTHONDONTWRITEBYTECODE": "1", "HOME": "/nonexistent"}
    try:
        proc = subprocess.run(
            [sys.executable, "-I", "-S", HARNESS], input=child_input, capture_output=True,
            text=True, timeout=timeout + 1, env=env, cwd="/tmp",
        )
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "timeout", "results": []}

    lines = [l for l in proc.stdout.strip().splitlines() if l.strip()]
    try:
        out = json.loads(lines[-1])
    except Exception:
        err = "memory_limit" if "MemoryError" in proc.stderr else "timeout"
        return {"success": False, "error": err if not proc.stdout and not proc.stderr else "invalid_runner_output", "results": []}
    if not out.get("ok"):
        return {"success": False, "error": str(out.get("error") or "execution_error")[:500], "results": []}

    results = []
    for test, row in zip(tests, out.get("results") or []):
        if row.get("error"):
            results.append({"id": test.get("id"), "status": "runtime_error", "actual": None, "error": row["error"]})
        elif equal(row.get("actual"), test.get("expected")):
            results.append({"id": test.get("id"), "status": "passed", "actual": None, "error": None})
        else:
            results.append({"id": test.get("id"), "status": "wrong_answer", "actual": row.get("actual"), "error": None})
    return {"success": True, "error": None, "results": results}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _send(self, status: int, obj: dict):
        body = json.dumps(obj, allow_nan=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _authorised(self) -> bool:
        if not TOKEN:
            return True
        given = self.headers.get("Authorization", "")
        return hmac.compare_digest(given, "Bearer " + TOKEN)

    def do_POST(self):
        if not self._authorised():
            return self._send(401, {"success": False, "error": "unauthorized", "results": []})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self._send(413, {"success": False, "error": "payload_size", "results": []})
        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError
        except Exception:
            return self._send(400, {"success": False, "error": "invalid_json", "results": []})
        if not SLOTS.acquire(timeout=10):
            return self._send(503, {"success": False, "error": "busy", "results": []})
        try:
            self._send(200, run_payload(payload))
        finally:
            SLOTS.release()

    def do_GET(self):
        self._send(200, {"ok": True, "service": "bug-arena-python-runner", "harness": HARNESS is not None})


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8090)
    args = parser.parse_args()
    if not TOKEN and args.host not in ("127.0.0.1", "localhost"):
        print("WARNING: no BUGARENA_RUNNER_TOKEN set while listening on a public interface!", file=sys.stderr)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"BUG//ARENA Python runner on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
