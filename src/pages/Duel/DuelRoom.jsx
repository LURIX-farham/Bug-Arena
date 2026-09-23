import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { challenges } from '../../data/challenges'
import { createPoller, fetchMatch } from '../../services/duelStore.js'
import { useI18n } from '../../i18n/useI18n'
import { ShinyText, SpotlightCard, StarBorder } from '../../components/reactbits'
import './Duel.css'

const VS_PHASE_MS = 3200
const SPIN_PHASE_MS = 3400
const REVEAL_PHASE_MS = 2600

function DuelerCard({ player, side }) {
  if (!player) {
    return <div className={`duel-card duel-card-${side} duel-card-empty`}>?</div>
  }
  return (
    <div className={`duel-card duel-card-${side}`}>
      <span className="duel-card-avatar" style={{ background: player.avatarColor }}>
        {player.displayName.charAt(0).toUpperCase()}
      </span>
      <strong>{player.displayName}</strong>
      <small>@{player.username}</small>
      <em>{player.rating} · {player.wins}W/{player.losses}L</em>
    </div>
  )
}

/**
 * Duel room: the pre-match ceremony. Two matched players see each other's
 * profiles split by an animated divider (VS), then the "computer" spins a
 * slot-machine over the challenge catalogue and locks in the random bug
 * challenge honouring the host's filters. Both sides are then routed into
 * the shared arena editor.
 */
function DuelRoom() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { t } = useI18n()

  const [match, setMatch] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [phase, setPhase] = useState('vs') // vs | spin | reveal
  const [slotTitle, setSlotTitle] = useState('')
  // Snapshot of the locked challenge used for the final navigate (timeout callback only).
  const [lockedChallenge, setLockedChallenge] = useState(null)

  const navigatedRef = useRef(false)
  const ceremonyStartedRef = useRef(false)

  const catalogue = useMemo(() => Object.values(challenges), [])

  // Live match state until the arena takes over.
  useEffect(() => {
    const poller = createPoller(async () => {
      try {
        const fresh = await fetchMatch(matchId)
        if (fresh) setMatch(fresh)
      } catch (error) {
        if (error?.status === 404) setNotFound(true)
      }
    }, 2500)
    return () => poller.stop()
  }, [matchId])

  const hasChallenge = Boolean(
    match?.status === 'active' &&
    match?.challenge &&
    match.challenge.id != null &&
    match.challenge.title,
  )

  // Intro ceremony timeline → straight into the arena editor.
  // Start exactly once when we first observe a fully-formed active match.
  // Previous implementation depended on match.challenge.id in the effect deps;
  // the poller calls setMatch with a fresh object every 2.5s which, combined
  // with React 18 StrictMode double-mount in dev, could clear/restart the
  // timeouts and leave the UI frozen on the VS / spin screen with no console error.
  useEffect(() => {
    if (!hasChallenge || ceremonyStartedRef.current || navigatedRef.current) return undefined
    if (!match?.challenge) return undefined

    ceremonyStartedRef.current = true

    const challengeId = match.challenge.id
    const matchPublicId = match.id
    const snapshot = {
      id: challengeId,
      title: match.challenge.title,
      difficulty: match.challenge.difficulty || 'Easy',
      bugType: match.challenge.bugType || 'logic',
      baseScore: match.challenge.baseScore ?? 0,
    }

    // Defer state update to avoid synchronous setState-in-effect lint.
    const lockTimer = setTimeout(() => {
      setLockedChallenge(snapshot)
    }, 0)

    const timers = [
      setTimeout(() => setPhase('spin'), VS_PHASE_MS),
      setTimeout(() => setPhase('reveal'), VS_PHASE_MS + SPIN_PHASE_MS),
      setTimeout(() => {
        if (navigatedRef.current) return
        navigatedRef.current = true
        if (challengeId != null && matchPublicId) {
          navigate(`/arena/${challengeId}?mode=duel&match=${matchPublicId}`)
        }
      }, VS_PHASE_MS + SPIN_PHASE_MS + REVEAL_PHASE_MS),
    ]

    return () => {
      clearTimeout(lockTimer)
      timers.forEach(clearTimeout)
    }
    // Only depend on the boolean gate + navigate. Snapshot values are captured
    // from the render where hasChallenge first becomes true; later poller
    // updates must not re-enter or their cleanup would kill the timers.
  }, [hasChallenge, navigate]) // eslint-disable-line react-hooks/exhaustive-deps -- intentional one-shot

  // Slot machine roulette over the catalogue titles.
  useEffect(() => {
    if (phase !== 'spin') return undefined
    if (!catalogue.length) return undefined

    const roller = setInterval(() => {
      setSlotTitle(catalogue[Math.floor(Math.random() * catalogue.length)]?.title || '')
    }, 90)
    return () => clearInterval(roller)
  }, [phase, catalogue])

  if (notFound) {
    return (
      <div className="duel-room">
        <div className="duel-panel duel-room-message">
          <h2>{t('duel', 'matchNotFound')}</h2>
          <Link className="duel-start" to="/duel">{t('duel', 'backToLobby')}</Link>
        </div>
      </div>
    )
  }

  if (!match) {
    return <div className="duel-room"><div className="duel-panel duel-room-loading">…</div></div>
  }

  if (match.status === 'pending') {
    return (
      <div className="duel-room">
        <section className="duel-panel duel-searching">
          <div className="duel-radar" aria-hidden="true"><span /><span /><span /><strong>⚔</strong></div>
          <h2>{t('duel', 'hostWaiting')}</h2>
          <DuelerCard player={match.host} side="host" />
        </section>
      </div>
    )
  }

  if (match.status !== 'active') {
    const message = match.status === 'cancelled' ? t('duel', 'cancelled')
      : match.status === 'expired' ? t('duel', 'expired')
        : t('duel', 'matchOver')
    return (
      <div className="duel-room">
        <div className="duel-panel duel-room-message">
          <h2>{message}</h2>
          <Link className="duel-start" to="/duel">{t('duel', 'backToLobby')}</Link>
        </div>
      </div>
    )
  }

  // Active match but challenge payload is incomplete (should not happen after
  // a successful accept). Keep the room alive instead of crashing on
  // difficulty.toLowerCase() / undefined title.
  if (!match.challenge || match.challenge.id == null) {
    return (
      <div className="duel-room">
        <div className="duel-panel duel-room-message">
          <h2>{t('duel', 'selecting')}…</h2>
          <p className="duel-online-empty">Waiting for challenge assignment…</p>
        </div>
      </div>
    )
  }

  const spinning = phase === 'spin'
  const revealed = phase === 'reveal'

  // Prefer live match payload; fall back to the one-shot locked snapshot.
  const displayChallenge = match.challenge || lockedChallenge || {}
  const displayTitle = displayChallenge.title || '…'
  const displayDifficulty = String(displayChallenge.difficulty || 'Easy')
  const displayBugType = String(displayChallenge.bugType || 'logic')
  const displayScore = displayChallenge.baseScore ?? 0

  return (
    <div className="duel-room">
      <header className="duel-room-head">
        <span className="duel-eyebrow">{t('duel', 'roomTitle')}</span>
        <h2>{revealed ? t('duel', 'lockedIn') : spinning ? t('duel', 'selecting') : t('duel', 'getReady')}</h2>
      </header>

      {/* VS stage */}
      <SpotlightCard
        as="section"
        className={`duel-stage ${phase !== 'vs' ? 'duel-stage-selecting' : ''}`}
        spotlightColor="rgba(var(--accent-rgb), 0.1)"
      >
        <DuelerCard player={match.host} side="host" />

        <div className="duel-divider" aria-hidden="true">
          {phase === 'vs' && <span className="duel-vs">{t('duel', 'vs')}</span>}
        </div>

        <DuelerCard player={match.guest} side="guest" />
      </SpotlightCard>

      {/* Challenge selection */}
      {phase !== 'vs' && (
        <section className="duel-slot-panel">
          <span className="duel-panel-label">
            {revealed ? t('duel', 'lockedIn') : t('duel', 'selecting')}
          </span>

          {revealed ? (
            <StarBorder
              className="duel-slot-arena"
              speed={6}
              color="rgba(var(--accent-rgb), 0.85)"
              secondaryColor="rgba(var(--secondary-rgb), 0.4)"
            >
              <div className={`duel-slot duel-slot-locked`}>
                <strong className="duel-slot-title">{displayTitle}</strong>
                <div className="duel-slot-meta">
                  <span className={`duel-slot-diff difficulty-${displayDifficulty.toLowerCase()}`}>
                    {displayDifficulty.toUpperCase()}
                  </span>
                  <span>{displayBugType.toUpperCase()}</span>
                  <span>{displayScore} PTS</span>
                </div>
              </div>
            </StarBorder>
          ) : (
            <div className="duel-slot">
              <strong className="duel-slot-title duel-slot-spinning">{slotTitle || '…'}</strong>
            </div>
          )}

          {revealed && <p className="duel-entering"><ShinyText text={`${t('duel', 'entering')}…`} speed={2.2} /></p>}
        </section>
      )}
    </div>
  )
}

export default DuelRoom
