"""
Bug Arena — local test harness (runs inside a throw-away `python -I -S` process).

Security model
--------------
* The process receives ONLY the player's code, the function name and the call
  arguments. Expected values never enter this process, so hidden tests cannot
  be leaked by introspection (frames, globals, gc, ...). The PHP side compares
  the returned values against the expected ones.
* Resource limits (CPU, memory, file size, open files) are applied before the
  player's code is executed.
* A PEP 578 audit hook denies process creation, networking, ctypes, writing to
  the filesystem and reading anything outside the Python installation.

This is defence in depth for a shared host. It is NOT a replacement for a
container / VM. For a public production deployment, point
BUGARENA_PYTHON_RUNNER_URL at an isolated runner (see scripts/python_runner_server.py).
"""
import io
import json
import math
import os
import sys

_real_stdout = sys.stdout


def _emit(obj):
    _real_stdout.write(json.dumps(obj, ensure_ascii=False, allow_nan=False))
    _real_stdout.write("\n")
    _real_stdout.flush()


def _limits(cpu_seconds, memory_mb):
    try:
        import resource

        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 1))
        resource.setrlimit(resource.RLIMIT_FSIZE, (0, 0))
        resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
        limit = memory_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_AS, (limit, limit))
    except Exception:
        pass  # Non-POSIX host: wall-clock timeout in PHP still applies.


_BLOCKED_EVENTS = {
    "subprocess.Popen", "os.system", "os.exec", "os.posix_spawn", "os.spawn",
    "os.fork", "os.forkpty", "os.kill", "os.killpg", "os.remove", "os.rename",
    "os.rmdir", "os.mkdir", "os.chmod", "os.chown", "os.truncate", "os.symlink",
    "os.link", "os.putenv", "os.unsetenv", "os.chdir", "os.chroot",
    "socket.connect", "socket.bind", "socket.listen", "socket.getaddrinfo",
    "socket.gethostbyname", "socket.sendto", "ctypes.dlopen", "ctypes.dlsym",
    "ctypes.cdata", "shutil.copyfile", "shutil.rmtree", "shutil.move",
    "pty.spawn", "webbrowser.open",
}
_BLOCKED_IMPORTS = {
    "ctypes", "_ctypes", "subprocess", "_posixsubprocess", "socket", "_socket",
    "multiprocessing", "ssl", "_ssl", "urllib", "http", "ftplib", "smtplib",
    "telnetlib", "socketserver", "asyncio", "pty", "mmap", "webbrowser", "gc",
}


def _install_audit_hook():
    allowed = set()
    for p in (sys.prefix, sys.base_prefix, sys.exec_prefix, sys.base_exec_prefix,
              os.path.dirname(os.__file__)):
        if p:
            allowed.add(os.path.realpath(p))
    allowed_prefixes = tuple(a + os.sep for a in allowed)
    write_flags = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_APPEND | os.O_TRUNC

    def hook(event, args):
        if event == "open":
            path, mode, flags = (list(args) + [None, None])[:3]
            if isinstance(path, int):
                return
            try:
                p = os.fsdecode(path)
            except Exception:
                raise PermissionError("blocked")
            if p == os.devnull:
                return
            writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
                isinstance(flags, int) and flags & write_flags
            )
            if writing:
                raise PermissionError("filesystem is read-only")
            real = os.path.realpath(p)
            if not real.startswith(allowed_prefixes):
                raise PermissionError("file access is not allowed")
        elif event == "import":
            top = str(args[0]).split(".")[0]
            if top in _BLOCKED_IMPORTS:
                raise ImportError("module '%s' is not available in the arena" % top)
        elif event in _BLOCKED_EVENTS:
            raise PermissionError("'%s' is not allowed" % event)

    sys.addaudithook(hook)


def _json_safe(value, depth=0):
    """Make a value JSON-serialisable (NaN/Inf -> strings, sets -> sorted lists)."""
    if depth > 40:
        return "<too deep>"
    if isinstance(value, bool) or value is None or isinstance(value, (int, str)):
        return value
    if isinstance(value, float):
        if math.isnan(value):
            return "NaN"
        if math.isinf(value):
            return "Infinity" if value > 0 else "-Infinity"
        return value
    if isinstance(value, (list, tuple)):
        return [_json_safe(v, depth + 1) for v in value]
    if isinstance(value, (set, frozenset)):
        try:
            return [_json_safe(v, depth + 1) for v in sorted(value)]
        except Exception:
            return [_json_safe(v, depth + 1) for v in value]
    if isinstance(value, dict):
        return {str(k): _json_safe(v, depth + 1) for k, v in value.items()}
    return repr(value)[:500]


def main():
    try:
        payload = json.loads(sys.stdin.read())
        code = str(payload["code"])
        fn_name = str(payload["function_name"])
        calls = payload["tests"]
        cpu = max(1, min(30, int(payload.get("cpu_seconds", 8))))
        mem = max(64, min(1024, int(payload.get("memory_mb", 256))))
    except Exception as exc:  # malformed payload = infrastructure bug
        _emit({"ok": False, "error": "bad_payload: %s" % exc, "results": []})
        return

    _limits(cpu, mem)
    _install_audit_hook()

    # Player output must never corrupt our JSON channel.
    sys.stdout = io.StringIO()
    sys.stderr = io.StringIO()
    sys.stdin = io.StringIO("")

    namespace = {"__name__": "__arena__"}
    try:
        exec(compile(code, "main.py", "exec"), namespace)
    except BaseException as exc:
        _emit({"ok": False, "error": "%s: %s" % (type(exc).__name__, str(exc)[:300]), "results": []})
        return

    fn = namespace.get(fn_name)
    if not callable(fn):
        _emit({"ok": False, "error": "function_not_found: %s" % fn_name, "results": []})
        return

    results = []
    for call in calls:
        entry = {"id": call.get("id"), "actual": None, "error": None}
        try:
            args = call.get("args") or []
            if not isinstance(args, list):
                args = [args]
            entry["actual"] = _json_safe(fn(*args))
        except BaseException as exc:
            entry["error"] = "%s: %s" % (type(exc).__name__, str(exc)[:300])
        results.append(entry)

    _emit({"ok": True, "error": None, "results": results})


if __name__ == "__main__":
    main()
