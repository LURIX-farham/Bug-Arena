import { Fragment, useEffect, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { challenges } from '../../data/challenges'
import { calculateScore } from '../../engine/scoring'
import { runChallengeTests } from '../../engine/challengeRunner'
import { saveSubmission } from '../../services/submissionStore'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'
import { startReplaySession, recordReplayEvent, finishReplaySession, abandonReplaySession } from '../../services/replayStore'
import { COMPETITIVE_MODES, getOpponent, recordCompetitiveMatch } from '../../services/competitiveStore'
import { createPoller, fetchMatch as fetchDuelMatch, submitDuelResult } from '../../services/duelStore'
import './Arena.css'


/*
 * --------------------------------------------------
 * TEST FAILURE DETAIL HELPERS
 *
 * Educational feedback for failed core tests.
 * Values are formatted compactly and truncated so the
 * detail panel stays readable. Hidden tests never
 * expose expected/actual data.
 * --------------------------------------------------
 */

const DETAIL_VALUE_LIMIT = 120

const formatTestValue = (value) => {
  if (value === undefined) return 'undefined'

  let text

  try {
    text = JSON.stringify(value)
  } catch {
    text = String(value)
  }

  if (text === undefined) {
    text = String(value)
  }

  if (text.length > DETAIL_VALUE_LIMIT) {
    return `${text.slice(0, DETAIL_VALUE_LIMIT)}...`
  }

  return text
}


const truncateHint = (text) => {
  if (!text) return ''

  const firstSentence = text.split('. ')[0]
  const base =
    firstSentence && firstSentence.length <= DETAIL_VALUE_LIMIT
      ? firstSentence
      : text

  if (base.length > DETAIL_VALUE_LIMIT) {
    return `${base.slice(0, DETAIL_VALUE_LIMIT)}...`
  }

  return base
}


const looksLikeSyntaxError = (message) =>
  /syntax|parse|eof|indent|token|invalid/i.test(message || '')


/*
 * --------------------------------------------------
 * DUEL VERDICT OVERLAY
 *
 * Shown when the duel match reaches a terminal state:
 * finished (win / lose / draw + comparison + points)
 * or cancelled / expired / vanished match.
 * --------------------------------------------------
 */

function DuelVerdictOverlay({ match, viewerRole }) {
  const { t } = useI18n()

  if (!match) return null

  const otherRole = viewerRole === 'host' ? 'guest' : 'host'
  const me = match[viewerRole]
  const rival = match[otherRole]
  const myResult = match.results?.[viewerRole] || {}
  const rivalResult = match.results?.[otherRole] || {}
  const myPoints = match.points?.[viewerRole] ?? 0

  if (match.status !== 'finished') {
    return (
      <div className="arena-result">
        <div className="result-card duel-verdict-card duel-verdict-neutral">
          <span className="result-label">
            {t('duel', 'roomTitle')}
          </span>
          <h2>
            {match.status === 'cancelled'
              ? t('duel', 'cancelled')
              : t('duel', 'matchOver')}
          </h2>
          <Link to="/duel" className="result-button">
            {t('duel', 'backToLobby')}
          </Link>
        </div>
      </div>
    )
  }

  const iWon = Boolean(match.winnerId) && match.winnerId === me?.id
  const isDraw = Boolean(match.isDraw)
  const verdictClass = isDraw
    ? 'duel-verdict-draw'
    : iWon
      ? 'duel-verdict-win'
      : 'duel-verdict-lose'

  const comparisonRows = [
    {
      key: 'finalScore',
      mine: myResult.score ?? 0,
      theirs: rivalResult.score ?? 0,
    },
    {
      key: 'speedBonusRow',
      mine: `+${myResult.speedBonus ?? 0}`,
      theirs: `+${rivalResult.speedBonus ?? 0}`,
    },
    {
      key: 'solveTime',
      mine: `${myResult.solveSeconds ?? 0} ${t('duel', 'seconds')}`,
      theirs: `${rivalResult.solveSeconds ?? 0} ${t('duel', 'seconds')}`,
    },
    {
      key: 'tries',
      mine: myResult.attempts ?? 0,
      theirs: rivalResult.attempts ?? 0,
    },
    {
      key: 'hardenedRow',
      mine: myResult.hardened ? t('arena', 'yes') : t('arena', 'no'),
      theirs: rivalResult.hardened ? t('arena', 'yes') : t('arena', 'no'),
    },
  ]

  return (
    <div className="arena-result">
      <div className={`result-card duel-verdict-card ${verdictClass}`}>

        <span className="result-icon">
          {isDraw ? '=' : iWon ? '✓' : '×'}
        </span>

        <span className="result-label">
          {t('duel', 'comparison')}
        </span>

        <h2>
          {isDraw
            ? t('duel', 'drawResult')
            : iWon
              ? t('duel', 'youWin')
              : t('duel', 'youLose')}
        </h2>

        <p className="duel-verdict-vs">
          <strong>{me?.displayName || '—'}</strong>
          <span>{t('duel', 'vs')}</span>
          <strong>{rival?.displayName || '—'}</strong>
        </p>

        <div className="final-score">
          {myPoints}
          <span>
            {t('duel', 'pointsEarned')}
          </span>
        </div>

        {rivalResult?.timedOut && (
          <p className="duel-verdict-note">
            {t('duel', 'timeoutRecorded')}
          </p>
        )}

        <div className="duel-compare">

          <div className="duel-compare-head">
            <strong>{t('duel', 'you')}</strong>
            <span>{t('duel', 'finalScore')}</span>
            <strong>{rival?.displayName || t('duel', 'rival')}</strong>
          </div>

          {comparisonRows.map((row) => (
            <div className="duel-compare-row" key={row.key}>
              <strong>{row.mine}</strong>
              <span>{t('duel', row.key)}</span>
              <strong>{row.theirs}</strong>
            </div>
          ))}

        </div>

        <div className="duel-verdict-actions">
          <Link to="/duel" className="result-button">
            {t('duel', 'backToLobby')}
          </Link>
          <Link to="/home" className="duel-verdict-home">
            {t('duel', 'backToHome')}
          </Link>
        </div>

      </div>
    </div>
  )
}


function ArenaSession() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { t, language } = useI18n()

  const challenge = getLocalizedChallenge(challenges[id], language)
  const competitionMode = searchParams.get('mode') || null
  const opponentId = searchParams.get('opponent') || null
  const competitionConfig = COMPETITIVE_MODES[competitionMode] || null
  const opponent = opponentId ? getOpponent(opponentId) : null

  /*
   * 1v1 duel wiring — the duel room routes here with
   * `?mode=duel&match=<publicId>` after the challenge
   * slot-machine locks in. Everything duel-specific
   * hangs off these two values.
   */

  const duelMatchId = searchParams.get('match')
  const isDuel = competitionMode === 'duel' && Boolean(duelMatchId)
  const challengeList = Object.values(challenges)
  const challengeIndex = challengeList.findIndex((item) => item.id === Number(id))

  /*
   * Original (non-localized) test definitions, used to
   * show `expected` in the failure detail panel.
   */

  const testMetaById = {}

  if (Array.isArray(challenge?.evaluation?.tests)) {
    challenge.evaluation.tests.forEach((test) => {
      testMetaById[test.id] = test
    })
  }


  /*
   * --------------------------------------------------
   * STATE
   * --------------------------------------------------
   */

  const [code, setCode] = useState(
    challenge?.code || ''
  )

  const [timeLeft, setTimeLeft] = useState(
    Math.round((challenge?.timeLimit || 0) * (competitionConfig?.timeMultiplier || 1))
  )

  const [submitted, setSubmitted] = useState(false)

  const [submissionSaved, setSubmissionSaved] = useState(false)
  const [submissionError, setSubmissionError] = useState('')

  const [tests, setTests] = useState([])

  /*
   * The id of the failed CORE test whose
   * educational failure detail is expanded.
   */

  const [expandedTestId, setExpandedTestId] = useState(null)

  /*
   * Top-level run failure (e.g. a Python syntax
   * error that prevented any test from running).
   */

  const [runError, setRunError] = useState('')

  const [isRunning, setIsRunning] = useState(false)

  const [coreFixed, setCoreFixed] = useState(false)

  /*
   * `hardening` means the optional hardening
   * tests have actually passed.
   *
   * It is NOT set to true merely because
   * the user clicked the hardening button.
   */

  const [hardening, setHardening] = useState(false)

  const [score, setScore] = useState(0)

  const [scoreDetails, setScoreDetails] = useState({
    baseScore: 0,
    speedBonus: 0,
    attemptBonus: 0,
    hardeningBonus: 0,
  })

  const [attempts, setAttempts] = useState(0)


  /*
   * Live duel match state. The server stays the single
   * source of truth: it re-scores the run, stores each
   * side's result and resolves the duel once both are in.
   */

  const [duelMatch, setDuelMatch] = useState(null)
  const [duelGone, setDuelGone] = useState(false)
  const duelPostedRef = useRef(false)


  const timeLeftRef = useRef(timeLeft)
  const replaySessionRef = useRef(null)
  const replayFinishedRef = useRef(false)
  const runStartedAtRef = useRef(null)


  /*
   * --------------------------------------------------
   * DUEL RESULT REPORTING
   *
   * One POST per duel: the server re-scores the run with
   * ScoringService and resolves the match once both sides
   * are in (winner 90% + 20% bonus, loser 10%). Idempotent
   * server-side; the ref guards against double posting.
   * --------------------------------------------------
   */

  const postDuelResult = ({ solved }) => {
    if (!isDuel || !duelMatchId || duelPostedRef.current) return
    duelPostedRef.current = true

    // Prefer the shared server clock so both sides report the same elapsed window.
    const limit = Number(duelMatch?.challenge?.timeLimit || challenge?.timeLimit || 0)
    let remaining = Math.max(0, timeLeftRef.current)
    if (duelMatch?.endsAt) {
      const endMs = new Date(duelMatch.endsAt).getTime()
      if (!Number.isNaN(endMs)) {
        remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000))
      }
    }
    const solveSeconds = Math.max(0, Math.round(limit - remaining))

    submitDuelResult(duelMatchId, {
      solved,
      testsPassed: tests.filter((item) => item.status === 'passed').length,
      testsTotal: tests.length,
      attempts: Math.max(1, attempts),
      hardened: Boolean(solved && hardening),
      timeLeft: remaining,
      solveSeconds,
    })
      .then((match) => {
        if (match) setDuelMatch(match)
      })
      .catch(() => {
        // Network hiccup — allow the auto-report/submit to retry.
        duelPostedRef.current = false
      })
  }

  // Latest-ref bridge so the timeout effect below can always call the
  // freshest reporter without re-running on every keystroke/state change.
  const postDuelResultRef = useRef(postDuelResult)

  useEffect(() => {
    postDuelResultRef.current = postDuelResult
  })

  useEffect(() => {
    timeLeftRef.current = timeLeft
  }, [timeLeft])

  useEffect(() => {
    if (!challenge) return undefined
    replayFinishedRef.current = false
    replaySessionRef.current = startReplaySession({
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      difficulty: challenge.difficulty,
      timeLimit: Math.round((challenge.timeLimit || 0) * (competitionConfig?.timeMultiplier || 1)),
      mode: competitionMode || 'practice',
      opponentId: opponent?.id || null,
    }, [challenge, opponent?.id])

    return () => {
      if (replaySessionRef.current && !replayFinishedRef.current) {
        abandonReplaySession(replaySessionRef.current, 'abandoned')
      }
    }
  }, [id, competitionMode, opponentId, challenge?.title, challenge?.difficulty, challenge?.timeLimit, competitionConfig?.timeMultiplier, challenge, challenge?.id, opponent?.id])




  /*
   * --------------------------------------------------
   * SHARED DUEL CLOCK
   *
   * Both players share one server deadline:
   *   endsAt = started_at + challenge.time_limit
   * Local countdown only interpolates between polls so
   * neither side can stretch or shrink the match clock.
   * --------------------------------------------------
   */

  const syncDuelClock = (match) => {
    if (!match || match.status !== 'active') return
    let remaining = null
    if (typeof match.remainingSeconds === 'number') {
      remaining = Math.max(0, Math.floor(match.remainingSeconds))
    } else if (match.endsAt) {
      const endMs = new Date(match.endsAt).getTime()
      if (!Number.isNaN(endMs)) {
        remaining = Math.max(0, Math.ceil((endMs - Date.now()) / 1000))
      }
    } else if (match.startedAt && match.challenge?.timeLimit) {
      const startMs = new Date(match.startedAt).getTime()
      const limit = Number(match.challenge.timeLimit) || 0
      if (!Number.isNaN(startMs) && limit > 0) {
        remaining = Math.max(0, Math.ceil((startMs + limit * 1000 - Date.now()) / 1000))
      }
    }
    if (remaining === null) return
    setTimeLeft((current) => (current === remaining ? current : remaining))
  }

  /*
   * --------------------------------------------------
   * TIMER
   * --------------------------------------------------
   */

  useEffect(() => {
    if (submitted || timeLeft <= 0) return undefined

    // In duel mode, prefer the shared endsAt clock so both UIs stay aligned
    // even if a setTimeout drifts by a few hundred ms.
    const tick = () => {
      if (isDuel && duelMatch?.endsAt) {
        const endMs = new Date(duelMatch.endsAt).getTime()
        if (!Number.isNaN(endMs)) {
          setTimeLeft(Math.max(0, Math.ceil((endMs - Date.now()) / 1000)))
          return
        }
      }
      setTimeLeft((current) => Math.max(0, current - 1))
    }

    const timer = setTimeout(tick, 1000)
    return () => clearTimeout(timer)
  }, [submitted, timeLeft, isDuel, duelMatch?.endsAt])


  /*
   * --------------------------------------------------
   * DUEL MATCH POLLING
   *
   * Mirrors the match from the server every ~2.5s and
   * re-syncs the shared duel clock. If our own result is
   * already recorded (page reload mid-duel) the editor
   * locks immediately — the first run is the one that counts.
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!isDuel || !duelMatchId) return undefined

    const poller = createPoller(async () => {
      try {
        const fresh = await fetchDuelMatch(duelMatchId)
        if (!fresh) return
        setDuelMatch(fresh)
        syncDuelClock(fresh)
        if (fresh.results?.[fresh.viewerRole] && !duelPostedRef.current) {
          setSubmitted(true)
        }
      } catch (error) {
        if (error?.status === 404) setDuelGone(true)
      }
    }, 2500)

    return () => poller.stop()
  }, [isDuel, duelMatchId])


  /*
   * --------------------------------------------------
   * DUEL TIMEOUT AUTO-REPORT
   *
   * When the clock hits zero without a submission, report
   * an unfinished run right away so the opponent is never
   * stuck waiting for a verdict.
   * --------------------------------------------------
   */

  useEffect(() => {
    if (!isDuel || submitted || timeLeft > 0) return undefined
    postDuelResultRef.current({ solved: false })
    return undefined
  }, [isDuel, submitted, timeLeft])


  /*
   * --------------------------------------------------
   * FORMATTED TIME
   * --------------------------------------------------
   */

  const minutes = Math.floor(
    timeLeft / 60
  )

  const seconds = timeLeft % 60

  const formattedTime =
    `${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}`


  /*
   * The other side of the duel, derived from the live
   * match payload (participant shape: id, username,
   * displayName, rating, wins/losses, avatarColor).
   */

  const duelOtherRole = duelMatch?.viewerRole === 'host' ? 'guest' : 'host'
  const duelOpponent = duelMatch?.[duelOtherRole] || null
  const rivalDone = Boolean(duelMatch?.progress?.[duelOtherRole])


  /*
   * --------------------------------------------------
   * CODE CHANGE
   * --------------------------------------------------
   */

  const handleCodeChange = (event) => {
    setCode(event.target.value)


    /*
     * Any code modification invalidates
     * previous test results.
     */

    if (coreFixed || hardening) {
      setCoreFixed(false)
      setHardening(false)

      setScore(0)

      setScoreDetails({
        baseScore: 0,
        speedBonus: 0,
        attemptBonus: 0,
        hardeningBonus: 0,
      })
    }


    /*
     * Clear old test results because
     * they belong to the previous code.
     */

    if (tests.length > 0) {
      setTests([])
      setExpandedTestId(null)
      setRunError('')
    }
  }


  /*
   * --------------------------------------------------
   * SCORE HELPER
   * --------------------------------------------------
   */

  const updateScore = ({
    corePassed,
    hardened,
    currentAttempts,
  }) => {

    if (!corePassed) {

      setScore(0)

      setScoreDetails({
        baseScore: 0,
        speedBonus: 0,
        attemptBonus: 0,
        hardeningBonus: 0,
      })

      return
    }


    const scoreResult = calculateScore({
      challenge,
      timeLeft,
      attempts: currentAttempts,
      coreFixed: true,
      hardened,
    })


    setScore(
      scoreResult.score
    )


    setScoreDetails({
      baseScore:
        scoreResult.baseScore,

      speedBonus:
        scoreResult.speedBonus,

      attemptBonus:
        scoreResult.attemptBonus,

      hardeningBonus:
        scoreResult.hardeningBonus,
    })
  }


  /*
   * --------------------------------------------------
   * TEST RUNNER
   * --------------------------------------------------
   */

  const runTests = async () => {

    if (
      !challenge ||
      isRunning ||
      submitted ||
      timeLeft <= 0
    ) {
      return
    }


    setIsRunning(true)
    runStartedAtRef.current = performance.now()

    setTests([])
    setExpandedTestId(null)
    setRunError('')


    const nextAttempts =
      attempts + 1

    setAttempts(nextAttempts)


    /*
     * Running the actual challenge evaluator.
     */

    try {

      const result =
        await runChallengeTests({
          challenge,
          code,
          hardening: false,
        })


      console.log(
        '🧪 Test result:',
        result
      )

      if (timeLeftRef.current <= 0) {
        setTests([])
        setCoreFixed(false)
        setHardening(false)
        setScore(0)
        setScoreDetails({
          baseScore: 0,
          speedBonus: 0,
          attemptBonus: 0,
          hardeningBonus: 0,
        })
        return
      }

      setTests(result.results)

      setRunError(result.error || '')

      if (replaySessionRef.current) {
        recordReplayEvent(replaySessionRef.current, {
          type: 'test_run',
          elapsedMs: performance.now() - (runStartedAtRef.current || performance.now()),
          payload: {
            corePassed: Boolean(result.corePassed),
            hiddenPassed: Boolean(result.hiddenPassed),
            passed: result.results.filter((item) => item.passed).length,
            total: result.results.length,
            code,
          },
        })
      }


      /*
       * Core solution passed.
       */

      if (result.corePassed) {

        setCoreFixed(true)

        /*
         * A new normal test run does not
         * automatically count as hardened.
         */

        setHardening(false)


        updateScore({
          corePassed: true,
          hardened: false,
          currentAttempts: nextAttempts,
        })

      } else {

        setCoreFixed(false)

        setHardening(false)

        updateScore({
          corePassed: false,
          hardened: false,
          currentAttempts: nextAttempts,
        })
      }

    } catch (error) {

      console.error(
        '❌ Test execution failed:',
        error
      )


      setTests([])

      setRunError(error?.message || '')

      setCoreFixed(false)

      setHardening(false)

    } finally {

      setIsRunning(false)

    }
  }


  /*
   * --------------------------------------------------
   * HARDENING
   * --------------------------------------------------
   */

  const handleHardening = async () => {

    if (
      !coreFixed ||
      submitted ||
      isRunning ||
      timeLeft <= 0
    ) {
      return
    }


    /*
     * The evaluator is now running.
     */

    setIsRunning(true)
    runStartedAtRef.current = performance.now()

    setTests([])
    setExpandedTestId(null)
    setRunError('')


    try {

      const result =
        await runChallengeTests({
          challenge,
          code,
          hardening: true,
        })


      console.log(
        '🛡️ Hardening result:',
        result
      )

      if (timeLeftRef.current <= 0) {
        setTests([])
        setCoreFixed(false)
        setHardening(false)
        setScore(0)
        setScoreDetails({
          baseScore: 0,
          speedBonus: 0,
          attemptBonus: 0,
          hardeningBonus: 0,
        })
        return
      }

      setTests(result.results)

      setRunError(result.error || '')

      if (replaySessionRef.current) {
        recordReplayEvent(replaySessionRef.current, {
          type: 'hardening_run',
          elapsedMs: performance.now() - (runStartedAtRef.current || performance.now()),
          payload: {
            corePassed: Boolean(result.corePassed),
            hiddenPassed: Boolean(result.hiddenPassed),
            passed: result.results.filter((item) => item.passed).length,
            total: result.results.length,
            code,
          },
        })
      }

      /*
       * Core + hidden tests passed.
       */

      if (
        result.corePassed &&
        result.hiddenPassed
      ) {

        setCoreFixed(true)

        setHardening(true)


        updateScore({
          corePassed: true,
          hardened: true,
          currentAttempts: attempts,
        })

      } else {

        /*
         * Important:
         *
         * The core fix can remain valid even if
         * hardening fails.
         *
         * The player can still submit.
         */

        setCoreFixed(
          result.corePassed
        )

        setHardening(false)


        updateScore({
          corePassed: result.corePassed,
          hardened: false,
          currentAttempts: attempts,
        })
      }

    } catch (error) {
      console.error('❌ Hardening execution failed:', error)
      setHardening(false)
      updateScore({
        corePassed: coreFixed,
        hardened: false,
        currentAttempts: attempts,
      })
    } finally {

      setIsRunning(false)

    }
  }


  /*
   * --------------------------------------------------
   * SUBMIT
   * --------------------------------------------------
   */

  const handleSubmit = () => {
    if (!challenge || !coreFixed || submitted || isRunning || timeLeftRef.current <= 0) {
      return
    }

    const finalScore = calculateScore({
      challenge,
      timeLeft,
      attempts,
      coreFixed: true,
      hardened: hardening,
    })

    /*
     * Duel path: the run lives inside the match — the server
     * re-scores it, resolves the duel and pays out the points.
     * No personal-best submission is created, so a duel run
     * can never double-credit solo XP.
     */

    if (isDuel) {
      postDuelResult({ solved: true })

      setScore(finalScore.score)
      setScoreDetails({
        baseScore: finalScore.baseScore,
        speedBonus: finalScore.speedBonus,
        attemptBonus: finalScore.attemptBonus,
        hardeningBonus: finalScore.hardeningBonus,
      })

      if (replaySessionRef.current) {
        replayFinishedRef.current = true
        finishReplaySession(replaySessionRef.current, {
          status: 'completed',
          score: finalScore.score,
          attempts,
          hardened: hardening,
          timeLeft,
          code,
        })
      }

      setSubmitted(true)
      return
    }

    const finalSubmission = {
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      score: finalScore.score,
      baseScore: finalScore.baseScore,
      speedBonus: finalScore.speedBonus,
      attemptBonus: finalScore.attemptBonus,
      hardeningBonus: finalScore.hardeningBonus,
      attempts,
      hardened: hardening,
      timeLeft,
      solveSeconds: Math.max(0, Math.round(Math.max(0, (challenge?.timeLimit || 0) * (competitionConfig?.timeMultiplier || 1)) - timeLeft)),
      testsPassed: tests.filter((item) => item.status === 'passed').length,
      testsTotal: tests.length,
      code,
      submittedAt: new Date().toISOString(),
    }

    const saveResult = saveSubmission(finalSubmission)

    if (saveResult?.reason === 'storage_error') {
      setSubmissionSaved(false)
      setSubmissionError(t('arena', 'saveError'))
      return
    }

    setSubmissionError('')
    setSubmissionSaved(Boolean(saveResult?.saved))

    if (!saveResult?.saved) {
      const best = saveResult?.submission || finalSubmission
      setAttempts(Math.max(1, Number(best.attempts) || attempts))
      setTimeLeft(Math.max(0, Number(best.timeLeft) || 0))
      setHardening(Boolean(best.hardened))
      setScore(Number(best.score) || finalScore.score)
      setScoreDetails({
        baseScore: Number(best.baseScore) || 0,
        speedBonus: Number(best.speedBonus) || 0,
        attemptBonus: Number(best.attemptBonus) || 0,
        hardeningBonus: Number(best.hardeningBonus) || 0,
      })
      if (replaySessionRef.current) {
        replayFinishedRef.current = true
        finishReplaySession(replaySessionRef.current, {
          status: 'completed',
          score: Number(best.score) || finalScore.score,
          attempts,
          hardened: Boolean(best.hardened),
          timeLeft,
          code,
        })
      }
      setSubmitted(true)
      return
    }

    setScore(finalScore.score)
    setScoreDetails({
      baseScore: finalScore.baseScore,
      speedBonus: finalScore.speedBonus,
      attemptBonus: finalScore.attemptBonus,
      hardeningBonus: finalScore.hardeningBonus,
    })

    if (competitionMode && opponent) {
      recordCompetitiveMatch({
        mode: competitionMode,
        opponentId: opponent.id,
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        challengeBaseScore: challenge.baseScore,
        playerScore: finalScore.score,
        playerTimeLeft: timeLeft,
        durationMs: Math.max(0, Math.round((((challenge.timeLimit || 0) * (competitionConfig?.timeMultiplier || 1)) - timeLeft) * 1000)),
      })
    }

    if (replaySessionRef.current) {
      replayFinishedRef.current = true
      finishReplaySession(replaySessionRef.current, {
        status: 'completed',
        score: finalScore.score,
        attempts,
        hardened: hardening,
        timeLeft,
        code,
      })
    }

    setSubmitted(true)
  }
  /*
   * --------------------------------------------------
   * INVALID CHALLENGE
   * --------------------------------------------------
   */

  if (!challenge) {

    return (
      <div className="challenge-not-found">

        <h1>
          {t('arena', 'notFound')}
        </h1>

        <Link to="/challenges">
          {t('arena', 'backToChallenges')}
        </Link>

      </div>
    )
  }


  /*
   * --------------------------------------------------
   * RENDER
   * --------------------------------------------------
   */

  return (
    <div className="arena-page">


      {/* HEADER */}

      <header className="arena-header">

        <div className="arena-header-left">

          <Link
            to={isDuel ? '/duel' : `/challenges/${id}`}
            className="arena-back"
          >
            {t('arena', 'exit')}
          </Link>


          <div className="arena-title">

            <span>
              {competitionMode ? `${competitionMode.toUpperCase()} · ` : ''}
              {t('challenges', 'bug')} #{id}
            </span>

            <strong>
              {challenge.title}
            </strong>

          </div>

        </div>


        <div className="arena-header-center">

          <span className="arena-badge">
            {challenge.difficulty.toUpperCase()}
          </span>

          <span className="arena-badge">
            {challenge.language}
          </span>

          {opponent && (
            <span className="arena-badge">
              {t('arena', 'vs')} {opponent.username}
            </span>
          )}

          {isDuel && duelOpponent && (
            <span className="arena-badge duel-badge-live">
              {t('arena', 'vs')} {duelOpponent.displayName}
            </span>
          )}

        </div>


        <div className="arena-header-right">

          <div className="arena-rating">

            <span>
              {t('arena', 'points')}
            </span>

            <strong>
              {challenge.baseScore}
            </strong>

          </div>


          <div
            className={
              `arena-timer ${timeLeft <= 60
                ? 'timer-danger'
                : ''
              }`
            }
          >

            <span>
              {t('arena', 'time')}
            </span>

            <strong>
              {formattedTime}
            </strong>

          </div>

        </div>

      </header>


      {/* MAIN */}

      <main className="arena-main">


        {/* CODE AREA */}

        <section className="arena-code-section">

          <div className="code-toolbar">

            <div className="code-file">

              <span className="file-dot" />

              main.py

            </div>

            <span>
              {t('arena', 'editable')}
            </span>

          </div>


          <div className="code-editor-wrapper">

            <div className="editor-lines">

              {code
                .split('\n')
                .map((_, index) => (

                  <span key={index}>
                    {String(
                      index + 1
                    ).padStart(2, '0')}
                  </span>

                ))}

            </div>


            <textarea
              className="arena-code-editor"
              value={code}
              onChange={handleCodeChange}
              spellCheck="false"
              disabled={
                submitted ||
                timeLeft <= 0
              }
            />

          </div>

          {/* TEST OUTPUT */}

          <div className="test-output">

            <div className="test-output-header">

              <div className="test-output-title">

                <span>
                  {t('arena', 'testResults')}
                </span>

                {tests.length > 0 && (
                  <span className="test-summary">

                    {
                      tests.filter(
                        (test) =>
                          test.status === 'passed'
                      ).length
                    }

                    /

                    {tests.length}

                    {' '}{t('arena', 'passed')}

                  </span>
                )}

              </div>


              {isRunning && (
                <span className="running">
                  {t('arena', 'runningPython')}
                </span>
              )}

            </div>


            {/* EMPTY STATE */}

            {tests.length === 0 && !isRunning && timeLeft <= 0 && !submitted && (

              <div className="test-empty">

                <span className="test-empty-icon">×</span>

                <div>
                  <strong>{t('arena', 'timeExpired')}</strong>
                  <p>{t('arena', 'timeExpiredBody')}</p>
                </div>

              </div>

            )}

            {tests.length === 0 && !isRunning && timeLeft > 0 && (

              <div className="test-empty">

                <span className="test-empty-icon">
                  ◌
                </span>

                <div>

                  <strong>
                    {t('arena', 'noResults')}
                  </strong>

                  <p>
                    {t('arena', 'noResultsBody')}
                  </p>

                </div>

              </div>

            )}


            {/* RUNNING STATE */}

            {isRunning && (

              <div className="test-running">

                <span className="running-spinner" />

                <div>

                  <strong>
                    {t('arena', 'runningTitle')}
                  </strong>

                  <p>
                    {t('arena', 'runningBody')}
                  </p>

                </div>

              </div>

            )}


            {/* RESULTS */}

            {!isRunning && tests.length > 0 && (

              <div className="test-results-list">

                {tests.map((test) => {

                  const passed =
                    test.status === 'passed'

                  const isHidden =
                    test.type === 'hidden'

                  const testMeta =
                    testMetaById[test.id] || {}

                  const canExpand =
                    !passed && !isHidden

                  const isExpanded =
                    expandedTestId === test.id

                  const toggleDetail = () => {
                    setExpandedTestId(
                      isExpanded ? null : test.id
                    )
                  }

                  return (

                    <Fragment key={test.id}>

                      <div
                        className={
                          `test-result-row ${passed
                            ? 'test-passed'
                            : 'test-failed'
                          } ${canExpand
                            ? 'test-result-expandable'
                            : ''
                          } ${isExpanded
                            ? 'test-result-expanded'
                            : ''
                          }`
                        }
                        role={canExpand ? 'button' : undefined}
                        tabIndex={canExpand ? 0 : undefined}
                        aria-expanded={
                          canExpand ? isExpanded : undefined
                        }
                        onClick={
                          canExpand ? toggleDetail : undefined
                        }
                        onKeyDown={
                          canExpand
                            ? (event) => {
                                if (
                                  event.key === 'Enter' ||
                                  event.key === ' '
                                ) {
                                  event.preventDefault()
                                  toggleDetail()
                                }
                              }
                            : undefined
                        }
                      >

                        <div className="test-result-status">

                          <span>
                            {passed ? '✓' : '×'}
                          </span>

                        </div>


                        <div className="test-result-info">

                          <strong>
                            {isHidden
                              ? t('arena', 'hiddenEdge')
                              : test.name}
                          </strong>


                          <span>

                            {isHidden
                              ? (
                                passed
                                  ? t('arena', 'hiddenPassed')
                                  : t('arena', 'hiddenFailed')
                              )
                              : (
                                passed
                                  ? t('arena', 'testPassed')
                                  : t('arena', 'testFailed')
                              )}

                          </span>


                          {isHidden && !passed && (

                            <span className="test-fail-detail-hidden-hint">

                              {truncateHint(t('arena', 'guideHiddenBody'))}

                            </span>

                          )}

                        </div>


                        {!isHidden && !passed && test.error && (

                          <div className="test-result-error">

                            {test.error}

                          </div>

                        )}


                        <div className="test-result-badge">

                          {passed
                            ? t('arena', 'pass')
                            : (
                              !isHidden && test.error
                                ? t('arena', 'runtimeError')
                                : t('arena', 'fail')
                            )}

                        </div>

                      </div>


                      {/*
                        * Educational failure detail for CORE
                        * tests only — hidden tests never reveal
                        * expected/actual values.
                        */}

                      {canExpand && isExpanded && (

                        <div className="test-fail-detail">

                          <div className="test-fail-detail-header">

                            <span className="test-fail-detail-label">
                              {t('arena', 'whatFailed')}
                            </span>

                            <strong className="test-fail-detail-name">
                              {test.name}
                            </strong>

                          </div>


                          <div className="test-fail-detail-row">

                            <span className="test-fail-detail-key">
                              {t('arena', 'expected')}
                            </span>

                            <code className="test-fail-detail-value">
                              {formatTestValue(testMeta.expected)}
                            </code>

                          </div>


                          <div className="test-fail-detail-row">

                            <span className="test-fail-detail-key">
                              {t('arena', 'received')}
                            </span>

                            <code className="test-fail-detail-value">
                              {test.error
                                ? test.error
                                : formatTestValue(test.actual)}
                            </code>

                          </div>


                          <div className="test-fail-detail-row">

                            <span className="test-fail-detail-key">
                              {t('arena', 'possibleReason')}
                            </span>

                            <span className="test-fail-detail-reason">

                              {test.error
                                ? `${t('arena', 'runtimeError')} · ${test.error}`
                                : (
                                  testMeta.expected !== undefined &&
                                  typeof testMeta.expected !== typeof test.actual
                                )
                                  ? `${t('arena', 'expected')}: ${typeof testMeta.expected} · ${t('arena', 'received')}: ${typeof test.actual}`
                                  : t('arena', 'coreFailedBody')}

                            </span>

                          </div>

                        </div>

                      )}

                    </Fragment>

                  )

                })}

              </div>

            )}


            {/* RUN-LEVEL ERROR (e.g. syntax error) */}

            {!isRunning && runError && (

              <div
                className="test-fail-detail test-fail-detail-run"
                role="alert"
              >

                <span className="test-fail-detail-badge">

                  {looksLikeSyntaxError(runError)
                    ? t('arena', 'syntaxError')
                    : t('arena', 'runtimeError')}

                </span>

                <code className="test-fail-detail-value">

                  {runError}

                </code>

              </div>

            )}


            {/* CORE RESULT */}

            {!isRunning && tests.length > 0 && (

              <div
                className={
                  `core-result ${coreFixed
                    ? 'core-success'
                    : 'core-failure'
                  }`
                }
              >

                <div className="core-result-main">

                  <span className="core-result-icon">

                    {coreFixed
                      ? '✓'
                      : '×'}

                  </span>


                  <div>

                    <strong>

                      {coreFixed
                        ? t('arena', 'corePassed')
                        : t('arena', 'coreFailed')}

                    </strong>


                    <span>

                      {coreFixed
                        ? t('arena', 'corePassedBody')
                        : t('arena', 'coreFailedBody')}

                    </span>

                  </div>

                </div>


                {coreFixed && !submitted && (

                  <span className="core-result-action">
                    {t('arena', 'submissionAvailable')}
                  </span>

                )}

              </div>

            )}

          </div>

        </section>


        {/* SIDE PANEL */}

        <aside className="arena-side">

          <div className="arena-side-header">

            <span>
              {t('arena', 'challenge')}
            </span>

            <strong>
              {String(challengeIndex + 1).padStart(2, '0')} / {String(challengeList.length).padStart(2, '0')}
            </strong>

          </div>


          <div className="arena-side-content">


            {/* OBJECTIVE */}

            <div className="objective">

              <span className="section-label">
                {t('arena', 'objective')}
              </span>

              <h1>
                {t('arena', 'fixBug')}
              </h1>

              <p>
                {challenge.description}
              </p>

            </div>


            {/* SCORE */}

            <div className="score-card">

              <div>

                <span>
                  {t('arena', 'currentScore')}
                </span>

                <strong>
                  {score}
                </strong>

              </div>


              <div className="score-breakdown">

                <span>
                  {t('arena', 'coreFix')}
                </span>

                <strong>
                  {coreFixed
                    ? `+${scoreDetails.baseScore}`
                    : '+0'}
                </strong>

              </div>


              <div className="score-breakdown">

                <span>
                  {t('arena', 'speedBonus')}
                </span>

                <strong>
                  {scoreDetails.speedBonus > 0
                    ? `+${scoreDetails.speedBonus}`
                    : '+0'}
                </strong>

              </div>


              <div className="score-breakdown">

                <span>
                  {t('arena', 'attemptBonus')}
                </span>

                <strong>
                  {scoreDetails.attemptBonus > 0
                    ? `+${scoreDetails.attemptBonus}`
                    : '+0'}
                </strong>

              </div>


              <div className="score-breakdown">

                <span>
                  {t('arena', 'hardening')}
                </span>

                <strong>
                  {scoreDetails.hardeningBonus > 0
                    ? `+${scoreDetails.hardeningBonus}`
                    : '+0'}
                </strong>

              </div>

            </div>


            <section className="debug-guide" aria-label={t('arena', 'guideTitle')}>
              <div className="debug-guide-header">
                <div>
                  <span className="section-label">{t('arena', 'guideTitle')}</span>
                  <strong>{t('arena', 'guideSubtitle')}</strong>
                </div>
              </div>
              <div className="debug-guide-item">
                <strong>01 · {t('arena', 'guideCoreTitle')}</strong>
                <p>{t('arena', 'guideCoreBody')}</p>
              </div>
              <div className="debug-guide-item">
                <strong>02 · {t('arena', 'guideHiddenTitle')}</strong>
                <p>{t('arena', 'guideHiddenBody')}</p>
              </div>
              <div className="debug-guide-item">
                <strong>03 · {t('arena', 'guideReadTitle')}</strong>
                <p>{t('arena', 'guideReadBody')}</p>
              </div>
              <div className="debug-guide-item">
                <strong>04 · {t('arena', 'guideWorkflowTitle')}</strong>
                <p>{t('arena', 'guideWorkflowBody')}</p>
              </div>
            </section>

            {/* ACTIONS */}

            <div className="arena-actions">


              {/* RUN TESTS */}

              <button
                className="run-tests-button"
                onClick={runTests}
                disabled={
                  isRunning ||
                  submitted ||
                  timeLeft <= 0
                }
              >

                {isRunning
                  ? t('arena', 'runningPython')
                  : t('arena', 'runTests')}

              </button>


              {/* HARDENING */}

              {coreFixed &&
                !hardening &&
                !submitted &&
                timeLeft > 0 && (

                  <div className="hardening-box">

                    <div>

                      <span className="bonus-label">
                        {t('arena', 'optionalBonus')}
                      </span>

                      <strong>
                        {t('arena', 'hardenTitle')}
                      </strong>

                      <p>
                        {t('arena', 'hardenBody')}
                      </p>

                    </div>


                    <button
                      onClick={handleHardening}
                      disabled={isRunning}
                    >
                      +{challenge.hardeningBonus}
                    </button>

                  </div>

                )}


              {/* SUBMIT */}

              {coreFixed && !submitted && (

                <button
                  className="submit-button"
                  onClick={handleSubmit}
                  disabled={
                    submitted ||
                    isRunning ||
                    timeLeft <= 0
                  }
                >

                  {submitted
                    ? t('arena', 'submitted')
                    : t('arena', 'submit')}

                  <span>
                    →
                  </span>

                </button>

              )}


            </div>


            {submissionError && (
              <div className="test-empty" role="alert">
                <span className="test-empty-icon">!</span>
                <div>
                  <strong>{t('arena', 'notSaved')}</strong>
                  <p>{submissionError}</p>
                </div>
              </div>
            )}


            {/* STATUS */}

            <div className="arena-status">

              <div>

                <span>
                  {t('arena', 'attempts')}
                </span>

                <strong>
                  {attempts}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'difficulty')}
                </span>

                <strong>
                  {challenge.difficulty}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'status')}
                </span>

                <strong
                  className={
                    submitted
                      ? 'status-submitted'
                      : timeLeft <= 0
                        ? 'status-timeout'
                        : coreFixed
                          ? 'status-fixed'
                          : 'status-live'
                  }
                >

                  {submitted
                    ? t('arena', 'statusSubmitted')
                    : timeLeft <= 0
                      ? t('arena', 'timeout')
                      : coreFixed
                        ? t('arena', 'fixed')
                        : t('arena', 'live')}

                </strong>

              </div>

            </div>


          </div>

        </aside>

      </main>


      {/* DUEL: MATCH NOT FOUND */}

      {isDuel && duelGone && !duelMatch && (

        <div className="arena-result">

          <div className="result-card duel-verdict-card duel-verdict-neutral">

            <span className="result-label">
              {t('duel', 'roomTitle')}
            </span>

            <h2>
              {t('duel', 'matchNotFound')}
            </h2>

            <Link to="/duel" className="result-button">
              {t('duel', 'backToLobby')}
            </Link>

          </div>

        </div>

      )}


      {/* DUEL: FINAL VERDICT (win / lose / draw + comparison) */}

      {isDuel && !duelGone && duelMatch && duelMatch.status !== 'active' && duelMatch.status !== 'pending' && (

        <DuelVerdictOverlay
          match={duelMatch}
          viewerRole={duelMatch.viewerRole}
        />

      )}


      {/* DUEL: WAITING FOR THE OPPONENT'S RUN */}

      {isDuel && !duelGone && submitted && (!duelMatch || duelMatch.status === 'active' || duelMatch.status === 'pending') && (

        <div className="arena-result">

          <div className="result-card duel-waiting-card">

            <span className="result-icon duel-waiting-icon">
              ⚔
            </span>

            <span className="result-label">
              {t('duel', 'waiting')}
            </span>

            <h2>
              {duelOpponent
                ? `${t('arena', 'vs')} ${duelOpponent.displayName}`
                : t('duel', 'roomTitle')}
            </h2>

            <p className="duel-waiting-hint">
              {t('duel', 'waitingHint')}
            </p>

            <div className="duel-waiting-dots" aria-hidden="true">
              <span /><span /><span />
            </div>

            {rivalDone && (
              <p className="duel-waiting-done">
                {t('duel', 'opponentDone')}
              </p>
            )}

          </div>

        </div>

      )}


      {/* SUBMISSION RESULT (solo / practice path) */}

      {submitted && !isDuel && (

        <div className="arena-result">

          <div className="result-card">

            <span className="result-icon">
              ✓
            </span>


            <span className="result-label">
              {submissionSaved ? t('arena', 'accepted') : t('arena', 'bestRetained')}
            </span>


            <h2>
              {submissionSaved ? t('arena', 'bugEliminated') : t('arena', 'previousBest')}
            </h2>


            <div className="final-score">

              {score}

              <span>
                {t('arena', 'points')}
              </span>

            </div>


            {/* SCORE BREAKDOWN */}

            <div className="result-stats">

              <div>

                <span>
                  {t('arena', 'core')}
                </span>

                <strong>
                  +{scoreDetails.baseScore}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'speed')}
                </span>

                <strong>
                  +{scoreDetails.speedBonus}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'attempts')}
                </span>

                <strong>
                  +{scoreDetails.attemptBonus}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'hardening')}
                </span>

                <strong>
                  +{scoreDetails.hardeningBonus}
                </strong>

              </div>

            </div>


            <div className="result-stats">

              <div>

                <span>
                  {t('arena', 'attempts')}
                </span>

                <strong>
                  {attempts}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'hardening')}
                </span>

                <strong>
                  {hardening
                    ? t('arena', 'yes')
                    : t('arena', 'no')}
                </strong>

              </div>


              <div>

                <span>
                  {t('arena', 'timeLeft')}
                </span>

                <strong>
                  {formattedTime}
                </strong>

              </div>

            </div>


            <Link
              to="/challenges"
              className="result-button"
            >
              {t('arena', 'backToChallenges')}
            </Link>

          </div>

        </div>

      )}

    </div>
  )
}


function Arena() {
  const { id } = useParams()
  return <ArenaSession key={id} />
}

export default Arena
