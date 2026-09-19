import { evaluatePythonChallenge } from './evaluators/pythonEvaluator'

const evaluators = {
  python: evaluatePythonChallenge,
}

function emptyResult(error = '') {
  return {
    results: [],
    corePassed: false,
    hiddenPassed: false,
    allPassed: false,
    error,
  }
}

export async function runChallengeTests({
  challenge,
  code,
  hardening = false,
}) {
  if (!challenge) {
    console.error('❌ Challenge not found')
    return emptyResult('Challenge not found.')
  }

  const evaluation = challenge.evaluation

  if (!evaluation) {
    console.error(
      '❌ Challenge has no evaluation configuration:',
      challenge.title,
    )
    return emptyResult('Challenge evaluation is missing.')
  }

  const tests = evaluation.tests || []

  if (tests.length === 0) {
    console.error('❌ Challenge has no tests:', challenge.title)
    return emptyResult('Challenge has no tests.')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 RUNNING CHALLENGE TESTS')
  console.log('Challenge:', challenge.title)
  console.log('Language:', challenge.language)
  console.log('Evaluator:', evaluation.type)
  console.log('Hardening:', hardening)
  console.log(
    'Tests:',
    hardening
      ? tests.length
      : tests.filter((test) => test.type === 'core').length,
  )
  console.log('━━━━━━━━━━━━━━━━━━━━━━')

  const evaluator = evaluators[evaluation.type]

  if (!evaluator) {
    console.error('❌ No evaluator found for:', evaluation.type)
    return emptyResult(`No evaluator found for ${evaluation.type}.`)
  }

  let result

  try {
    result = await evaluator(code, evaluation, hardening)
  } catch (error) {
    return emptyResult(error?.message || 'Challenge evaluation failed.')
  }

  result.results.forEach((test) => {
    console.log(
      test.status === 'passed'
        ? `✅ ${test.name}`
        : `❌ ${test.name}`,
    )
  })

  console.log('━━━━━━━━━━━━━━━━━━━━━━')
  console.log(
    'CORE:',
    result.corePassed ? '✅ PASSED' : '❌ FAILED',
  )

  if (hardening) {
    console.log(
      'HIDDEN:',
      result.hiddenPassed ? '✅ PASSED' : '❌ FAILED',
    )
  }

  console.log(
    'RESULT:',
    result.allPassed ? '✅ PASSED' : '❌ FAILED',
  )
  console.log('━━━━━━━━━━━━━━━━━━━━━━')

  return result
}
