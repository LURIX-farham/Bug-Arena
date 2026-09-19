const DEFAULT_TIMEOUT_MS = 20000

function failedResult(tests, error) {
  return {
    results: tests.map((test) => ({
      id: test.id,
      name: test.name,
      type: test.type,
      status: 'failed',
      actual: null,
      error,
    })),
    corePassed: false,
    hiddenPassed: false,
    allPassed: false,
  }
}

export function evaluatePythonChallenge(code, evaluation, hardening = false, timeoutMs = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const allTests = Array.isArray(evaluation?.tests) ? evaluation.tests : []
    const selectedTests = hardening ? allTests : allTests.filter((test) => test.type === 'core')
    let worker

    try {
      worker = new Worker(new URL('../workers/pythonWorker.js', import.meta.url), { type: 'module' })
    } catch (error) {
      resolve(failedResult(selectedTests, error?.message || 'Could not start the Python worker.'))
      return
    }
    let settled = false

    const finish = (result) => {
      if (settled) return
      settled = true
      clearTimeout(timeoutId)
      worker.terminate()
      resolve(result)
    }

    const timeoutId = setTimeout(() => {
      finish(failedResult(selectedTests, 'Execution timed out.'))
    }, timeoutMs)

    worker.onmessage = ({ data }) => {
      if (!data?.success) {
        finish(failedResult(selectedTests, data?.error || 'Python evaluation failed.'))
        return
      }

      const results = Array.isArray(data.results) ? data.results : []
      const coreResults = results.filter((test) => test.type === 'core')
      const hiddenResults = results.filter((test) => test.type === 'hidden')
      const corePassed = coreResults.length > 0 && coreResults.every((test) => test.status === 'passed')
      const hiddenPassed = hiddenResults.length === 0 || hiddenResults.every((test) => test.status === 'passed')

      finish({ results, corePassed, hiddenPassed, allPassed: corePassed && hiddenPassed })
    }

    worker.onerror = (event) => finish(failedResult(selectedTests, event?.message || 'Python worker execution failed.'))

    try {
      worker.postMessage({
      code: String(code ?? ''),
      tests: selectedTests,
      functionName: evaluation.functionName,
    })
    } catch (error) {
      finish(failedResult(selectedTests, error?.message || 'Could not start Python evaluation.'))
    }
  })
}
