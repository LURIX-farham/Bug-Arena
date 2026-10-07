import { evaluatePythonChallenge } from './evaluators/pythonEvaluator'
import { apiRequest } from '../services/apiClient.js'
import { isAuthenticated } from '../services/authStore.js'

const evaluators = {
  python: evaluatePythonChallenge,
}

function emptyResult(error = '') {
  return {
    results: [],
    corePassed: false,
    hiddenPassed: false,
    allPassed: false,
    testsPassed: 0,
    testsTotal: 0,
    status: 'execution_error',
    error,
    source: 'local',
  }
}

/**
 * Prefer authoritative server execution when online + authenticated.
 * - preferServer + !hardening → POST /execute scope=public
 * - preferServer + hardening  → POST /execute scope=full (hidden status only)
 * Falls back to client Pyodide for offline public-test preview only.
 */
export async function runChallengeTests({
  challenge,
  code,
  hardening = false,
  preferServer = true,
}) {
  if (!challenge) {
    return emptyResult('Challenge not found.')
  }

  const evaluation = challenge.evaluation
  if (!evaluation) {
    return emptyResult('Challenge evaluation is missing.')
  }

  if (preferServer && isAuthenticated() && challenge.id) {
    try {
      const data = await apiRequest('/execute', {
        method: 'POST',
        body: JSON.stringify({
          challengeId: Number(challenge.id),
          code: String(code ?? ''),
          scope: hardening ? 'full' : 'public',
        }),
      })
      const results = Array.isArray(data?.results) ? data.results : []
      // Normalize: some UI code checks item.passed
      const normalized = results.map((r) => ({
        ...r,
        passed: r.status === 'passed',
      }))
      return {
        results: normalized,
        corePassed: Boolean(data?.corePassed),
        hiddenPassed: Boolean(data?.hiddenPassed),
        allPassed: Boolean(data?.allPassed ?? data?.corePassed),
        testsPassed: Number(data?.testsPassed ?? 0),
        testsTotal: Number(data?.testsTotal ?? normalized.length),
        status: data?.status || (data?.corePassed ? 'success' : 'wrong_answer'),
        error: data?.error || null,
        wallMs: data?.wallMs ?? null,
        source: 'server',
        authoritative: true,
      }
    } catch (error) {
      console.warn('Server execute unavailable, falling back to local preview:', error?.message)
    }
  }

  // Local fallback: public/core tests only (hidden args may be stripped).
  const tests = (evaluation.tests || []).filter((t) => t.type !== 'hidden' || (t.args !== undefined && t.expected !== undefined))
  if (tests.length === 0) {
    return emptyResult('Challenge has no tests.')
  }

  const evaluator = evaluators[evaluation.type]
  if (!evaluator) {
    return emptyResult(`No evaluator found for ${evaluation.type}.`)
  }

  let result
  try {
    result = await evaluator(code, { ...evaluation, tests }, false)
  } catch (error) {
    return emptyResult(error?.message || 'Challenge evaluation failed.')
  }

  const normalized = (result.results || []).map((r) => ({
    ...r,
    passed: r.status === 'passed',
  }))
  const passed = normalized.filter((t) => t.passed).length
  return {
    ...result,
    results: normalized,
    testsPassed: passed,
    testsTotal: normalized.length,
    status: result.corePassed ? 'success' : 'wrong_answer',
    source: 'local',
    authoritative: false,
  }
}
