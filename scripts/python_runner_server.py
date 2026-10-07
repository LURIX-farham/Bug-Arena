#!/usr/bin/env python3
"""
Minimal HTTP runner for BUG//ARENA production isolation.

Run behind a firewall / private network. PHP calls this via BUGARENA_PYTHON_RUNNER_URL.

  python3 scripts/python_runner_server.py --host 127.0.0.1 --port 8090

Contract: POST JSON {code, function_name, tests, timeout_sec?, memory_mb?}
Response: {success, error, results:[{id,status,actual,error}]}
"""
from __future__ import annotations

import argparse
import json
import math
import resource
import signal
import sys
import traceback
from http.server import BaseHTTPRequestHandler, HTTPServer


def equal(a, b):
    if type(a) != type(b) and not (isinstance(a, (int, float)) and isinstance(b, (int, float))):
        return False
    if isinstance(a, float) and isinstance(b, float):
        if math.isnan(a) and math.isnan(b):
            return True
        return abs(a - b) < 1e-9
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(equal(x, y) for x, y in zip(a, b))
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(equal(a[k], b[k]) for k in a)
    return a == b


def run_payload(payload: dict) -> dict:
    timeout = max(1, min(30, int(payload.get("timeout_sec") or 8)))
    memory_mb = max(32, min(512, int(payload.get("memory_mb") or 128)))

    def _alarm(signum, frame):
        raise TimeoutError("timeout")

    signal.signal(signal.SIGALRM, _alarm)
    signal.alarm(timeout)
    try:
        try:
            resource.setrlimit(resource.RLIMIT_AS, (memory_mb * 1024 * 1024, memory_mb * 1024 * 1024))
        except Exception:
            pass

        namespace: dict = {}
        try:
            exec(payload.get("code") or "", namespace, namespace)
        except Exception as exc:
            return {"success": False, "error": f"{type(exc).__name__}: {str(exc)[:500]}", "results": []}

        fn = namespace.get(payload.get("function_name") or "")
        if not callable(fn):
            return {"success": False, "error": "function_not_found", "results": []}

        results = []
        for test in payload.get("tests") or []:
            tid = test.get("id")
            try:
                actual = fn(*(test.get("args") or []))
                try:
                    dumped = json.dumps(actual, allow_nan=False)
                    if len(dumped) > 20000:
                        actual = {"__truncated__": True}
                except Exception:
                    actual = str(actual)[:2000]
                ok = equal(actual, test.get("expected"))
                results.append({
                    "id": tid,
                    "status": "passed" if ok else "wrong_answer",
                    "actual": actual if not ok else None,
                    "error": None,
                })
            except Exception as exc:
                results.append({
                    "id": tid,
                    "status": "runtime_error",
                    "actual": None,
                    "error": f"{type(exc).__name__}: {str(exc)[:400]}",
                })
        return {"success": True, "error": None, "results": results}
    except TimeoutError:
        return {"success": False, "error": "timeout", "results": []}
    except MemoryError:
        return {"success": False, "error": "memory_limit", "results": []}
    except Exception as exc:
        return {"success": False, "error": f"execution_error: {exc}", "results": []}
    finally:
        signal.alarm(0)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        if length > 512_000:
            self.send_response(413)
            self.end_headers()
            return
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except Exception:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"success":false,"error":"invalid_json","results":[]}')
            return
        result = run_payload(payload)
        body = json.dumps(result, allow_nan=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        body = b'{"ok":true,"service":"bug-arena-python-runner"}'
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8090)
    args = parser.parse_args()
    server = HTTPServer((args.host, args.port), Handler)
    print(f"BUG//ARENA Python runner on http://{args.host}:{args.port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
