const PYODIDE_VERSION = '0.29.4'
const PYODIDE_BASE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`

let pyodidePromise

function getPyodide() {
  if (!pyodidePromise) {
    pyodidePromise = import(/* @vite-ignore */ `${PYODIDE_BASE_URL}pyodide.mjs`)
      .then(({ loadPyodide }) => loadPyodide({ indexURL: PYODIDE_BASE_URL }))
  }

  return pyodidePromise
}

const errorText = (error) => error?.message || String(error || 'Unknown Python error.')

const normalize = (value) => {
  if (typeof value === 'number' && Number.isNaN(value)) return '__NaN__'
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = normalize(value[key])
      return result
    }, {})
  }
  return value
}

const deepEqual = (left, right) => {
  try {
    return JSON.stringify(normalize(left)) === JSON.stringify(normalize(right))
  } catch {
    return false
  }
}

self.onmessage = async ({ data }) => {
  const { code, tests, functionName } = data || {}

  try {
    if (!functionName) throw new Error('Python challenge function name is missing.')
    if (!Array.isArray(tests)) throw new Error('Python challenge tests are invalid.')

    const pyodide = await getPyodide()
    const results = []

    pyodide.globals.set('__bug_arena_code', String(code || ''))
    pyodide.globals.set('__bug_arena_function_name', String(functionName))

    await pyodide.runPythonAsync(`
namespace = {}
exec(__bug_arena_code, namespace)
function = namespace.get(__bug_arena_function_name)
if not callable(function):
    raise NameError(f"Function '{__bug_arena_function_name}' was not found.")
`)

    for (const test of tests) {
      try {
        pyodide.globals.set('__bug_arena_args', JSON.stringify(test.args ?? []))

        const output = await pyodide.runPythonAsync(`
import json
args = json.loads(__bug_arena_args)
actual = function(*args)
json.dumps(actual, allow_nan=False)
`)

        const actual = JSON.parse(output)

        results.push({
          id: test.id,
          name: test.name,
          type: test.type,
          status: deepEqual(actual, test.expected) ? 'passed' : 'failed',
          actual,
        })
      } catch (error) {
        results.push({
          id: test.id,
          name: test.name,
          type: test.type,
          status: 'failed',
          actual: null,
          error: errorText(error),
        })
      }
    }

    self.postMessage({ success: true, results })
  } catch (error) {
    self.postMessage({ success: false, error: errorText(error), results: [] })
  }
}
