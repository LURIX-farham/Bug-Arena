import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { challenges } from '../../data/challenges'
import { createPoller, fetchMatch } from '../../services/duelStore.js'
import { useI18n } from '../../i18n/useI18n'
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
  const navigatedRef = useRef(false)

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

  const active = match?.status === 'active' && match.challenge

  // Intro ceremony timeline → straight into the arena editor.
  useEffect(() => {
    if (!active || navigatedRef.current) return undefined
    const timers = [
      setTimeout(() => setPhase('spin'), VS_PHASE_MS),
      setTimeout(() => setPhase('reveal'), VS_PHASE_MS + SPIN_PHASE_MS),
      setTimeout(() => {
        navigatedRef.current = true
        navigate(`/arena/${match.challenge.id}?mode=duel&match=${match.id}`)
      }, VS_PHASE_MS + SPIN_PHASE_MS + REVEAL_PHASE_MS),
    ]
    return () => timers.forEach(clearTimeout)
  }, [active, match?.challenge?.id, match?.id, navigate])

  // Slot machine roulette over the catalogue titles.
  useEffect(() => {
    if (phase !== 'spin') return undefined
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

  const spinning = phase === 'spin'
  const revealed = phase === 'reveal'

  return (
    <div className="duel-room">
      <header className="duel-room-head">
        <span className="duel-eyebrow">{t('duel', 'roomTitle')}</span>
        <h2>{revealed ? t('duel', 'lockedIn') : spinning ? t('duel', 'selecting') : t('duel', 'getReady')}</h2>
      </header>

      {/* VS stage */}
      <section className={`duel-stage ${phase !== 'vs' ? 'duel-stage-selecting' : ''}`}>
        <DuelerCard player={match.host} side="host" />

        <div className="duel-divider" aria-hidden="true">
          {phase === 'vs' && <span className="duel-vs">{t('duel', 'vs')}</span>}
        </div>

        <DuelerCard player={match.guest} side="guest" />
      </section>

      {/* Challenge selection */}
      {phase !== 'vs' && (
        <section className="duel-slot-panel">
          <span className="duel-panel-label">
            {revealed ? t('duel', 'lockedIn') : t('duel', 'selecting')}
          </span>

          <div className={`duel-slot ${revealed ? 'duel-slot-locked' : ''}`}>
            {revealed ? (
              <>
                <strong className="duel-slot-title">{match.challenge.title}</strong>
                <div className="duel-slot-meta">
                  <span className={`duel-slot-diff difficulty-${match.challenge.difficulty.toLowerCase()}`}>
                    {match.challenge.difficulty.toUpperCase()}
                  </span>
                  <span>{match.challenge.bugType.toUpperCase()}</span>
                  <span>{match.challenge.baseScore} PTS</span>
                </div>
              </>
            ) : (
              <strong className="duel-slot-title duel-slot-spinning">{slotTitle || '…'}</strong>
            )}
          </div>

          {revealed && <p className="duel-entering">{t('duel', 'entering')}…</p>}
        </section>
      )}
    </div>
  )
}

export default DuelRoom
