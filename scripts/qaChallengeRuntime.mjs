import { spawnSync } from 'node:child_process'
import { challenges } from '../src/data/challenges.js'

const fixedSolutions = {
  filter_users: `def filter_users(users, query):
    return [user["name"] for user in users if query.lower() in user["name"].lower()]`,
  unique_signals: `def unique_signals(signals):
    result = []
    for signal in signals:
        if signal not in result:
            result.append(signal)
    return result`,
  sort_tasks: `def sort_tasks(tasks):
    return [task["name"] for task in sorted(tasks, key=lambda task: task["priority"], reverse=True)]`,
  moving_average: `def moving_average(values, window):
    if window <= 0 or window > len(values):
        return []
    return [sum(values[i:i + window]) / window for i in range(len(values) - window + 1)]`,
  cache_key: `def cache_key(path, params):
    normalized_path = path.lower().rstrip('/') or '/'
    query = '&'.join(f'{key}={params[key]}' for key in sorted(params))
    return normalized_path + (f'?{query}' if query else '')`,
  max_windows: `def max_windows(values, window):
    if window <= 0 or window > len(values):
        return []
    return [max(values[i:i + window]) for i in range(len(values) - window + 1)]`,
  is_allowed: `def is_allowed(used, quota, cost):
    return used + cost <= quota`,
  find_token: `def find_token(items, token):
    token = token.lower()
    for index, item in enumerate(items):
        if item.lower() == token:
            return index
    return -1`,
  merge_intervals: `def merge_intervals(intervals):
    intervals = sorted(intervals)
    merged = []
    for start, end in intervals:
        if not merged or start > merged[-1][1]:
            merged.append([start, end])
        else:
            merged[-1][1] = max(merged[-1][1], end)
    return merged`,
  frequency_rank: `def frequency_rank(values, limit):
    counts = {}
    order = {}
    for index, value in enumerate(values):
        counts[value] = counts.get(value, 0) + 1
        order.setdefault(value, index)
    ranked = sorted(counts, key=lambda value: (-counts[value], order[value]))
    return ranked[:limit]`,
  max_version: `def max_version(a, b):
    def parts(value):
        values = [int(x) for x in value.split('.')]
        while values and values[-1] == 0:
            values.pop()
        return tuple(values)
    return a if parts(a) >= parts(b) else b`,
  is_balanced: `def is_balanced(text):
    pairs = {')': '(', ']': '[', '}': '{'}
    stack = []
    for char in text:
        if char in '([{':
            stack.append(char)
        elif char in pairs:
            if not stack or stack.pop() != pairs[char]:
                return False
    return not stack`,
  normalize_email: `def normalize_email(email):
    local, domain = email.strip().split('@', 1)
    return local.lower() + '@' + domain.lower()`,
  error_rates: `def error_rates(outcomes, window):
    if window <= 0 or window > len(outcomes):
        return []
    return [sum(outcomes[i:i + window]) / window for i in range(len(outcomes) - window + 1)]`,
  process_jobs: `def process_jobs(jobs):
    return [job['id'] for job in sorted(jobs, key=lambda job: -job['priority'])]`,
}

const pythonHarness = String.raw`
import json
import sys

payload = json.load(sys.stdin)
namespace = {}
exec(payload["code"], namespace)
fn = namespace[payload["function_name"]]
results = []
for test in payload["tests"]:
    try:
        actual = fn(*test["args"])
        results.append({"id": test["id"], "actual": actual, "error": None})
    except Exception as exc:
        results.append({"id": test["id"], "actual": None, "error": str(exc)})
print(json.dumps(results, allow_nan=False))
`

function runPython(code, functionName, tests) {
  const process = spawnSync('python', ['-c', pythonHarness], {
    input: JSON.stringify({ code, function_name: functionName, tests }),
    encoding: 'utf8',
    timeout: 10000,
  })

  if (process.error) throw process.error
  if (process.status !== 0) throw new Error(process.stderr || 'Python process failed.')
  return JSON.parse(process.stdout)
}

function equal(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

const failures = []
let starterFailures = 0
let fixedFailures = 0

for (const challenge of Object.values(challenges)) {
  const tests = challenge.evaluation.tests
  const starter = runPython(challenge.code, challenge.evaluation.functionName, tests)
  const fixedCode = fixedSolutions[challenge.evaluation.functionName]

  if (!fixedCode) {
    failures.push(`#${challenge.id}: missing fixed solution in QA harness.`)
    continue
  }

  const starterCoreFailed = starter.some((result, index) => {
    const test = tests[index]
    return test.type === 'core' && (result.error || !equal(result.actual, test.expected))
  })

  if (!starterCoreFailed) {
    failures.push(`#${challenge.id}: starter code passes every core test; challenge is not actually broken.`)
  } else {
    starterFailures += 1
  }

  const fixed = runPython(fixedCode, challenge.evaluation.functionName, tests)
  fixed.forEach((result, index) => {
    const test = tests[index]
    if (result.error || !equal(result.actual, test.expected)) {
      failures.push(`#${challenge.id}: fixed solution fails test ${test.id} (${test.name}).`)
    }
  })
  fixedFailures += fixed.filter((result, index) => result.error || !equal(result.actual, tests[index].expected)).length
}

if (failures.length) {
  console.error('Runtime QA failed:\n- ' + failures.join('\n- '))
  process.exit(1)
}

console.log(`Runtime QA passed: ${Object.keys(challenges).length} broken starters verified and all fixed contracts passed.`)
console.log(`Starter challenges with a failing core test: ${starterFailures}`)
console.log(`Fixed-solution test failures: ${fixedFailures}`)
