import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { challenges } from '../../data/challenges'
import { canDuel, cancelDuel, createDuel, createPoller, DUEL_DIFFICULTIES, fetchMatch, heartbeat } from '../../services/duelStore.js'
import { useI18n } from '../../i18n/useI18n'
import './Duel.css'

/**
 * 1v1 duel lobby: customize the match (difficulty + bug type), see who is
 * online, then fire a duel request that lands as a toast on every online
 * player's screen. The moment someone accepts, both sides are routed into
 * the duel room.
 */
function DuelLobby() {
  const { t } = useI18n()
  const navigate = useNavigate()

  const bugTypes = useMemo(
    () => ['any', ...[...new Set(Object.values(challenges).map((item) => item.bugType).filter(Boolean))].sort()],
    [],
  )

  const [difficulty, setDifficulty] = useState('any')
  const [bugType, setBugType] = useState('any')
  const [online, setOnline] = useState([])
  const [phase, setPhase] = useState('idle') // idle | searching
  const [matchId, setMatchId] = useState(null)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const searchPoller = useRef(null)

  // Presence: heartbeat doubles as the online-players feed.
  useEffect(() => {
    if (!canDuel()) return undefined
    const poller = createPoller(async () => {
      const users = await heartbeat()
      setOnline(users)
    }, 20000)
    return () => poller.stop()
  }, [])

  // Search loop: watch our own match until a guest claims the seat.
  useEffect(() => {
    if (phase !== 'searching' || !matchId) return undefined
    searchPoller.current = createPoller(async () => {
      const match = await fetchMatch(matchId)
      if (!match) return
      if (match.status === 'active') {
        navigate(`/duel/${matchId}`)
      } else if (match.status === 'expired' || match.status === 'cancelled') {
        setError(t('duel', match.status === 'cancelled' ? 'cancelled' : 'expired'))
        setPhase('idle')
        setMatchId(null)
      }
    }, 3000)
    return () => {
      if (searchPoller.current) searchPoller.current.stop()
      searchPoller.current = null
    }
  }, [phase, matchId, navigate, t])

  const handleStart = async () => {
    if (starting || phase === 'searching') return
    setStarting(true)
    setError('')
    try {
      const result = await createDuel({ difficulty, bugType })
      setMatchId(result.matchId)
      setPhase('searching')
    } catch {
      setError(t('duel', 'startError'))
    } finally {
      setStarting(false)
    }
  }

  const handleCancel = async () => {
    if (phase !== 'searching' || !matchId) return
    const current = matchId
    setPhase('idle')
    setMatchId(null)
    cancelDuel(current).catch(() => undefined)
  }

  return (
    <div className="duel-lobby">
      <header className="duel-lobby-head">
        <span className="duel-eyebrow">{t('duel', 'roomTitle')}</span>
        <h1>{t('duel', 'title')}</h1>
        <p>{t('duel', 'subtitle')}</p>
        <small className="duel-reward">{t('duel', 'rewardHint')}</small>
      </header>

      {phase === 'idle' ? (
        <section className="duel-panel duel-setup">
          <span className="duel-panel-label">{t('duel', 'settings')}</span>

          <div className="duel-setup-row">
            <span>{t('duel', 'difficulty')}</span>
            <div className="duel-chip-row">
              {DUEL_DIFFICULTIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`duel-chip ${difficulty === value ? 'active' : ''}`}
                  onClick={() => setDifficulty(value)}
                >
                  {value === 'any' ? t('duel', 'any') : value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="duel-setup-row">
            <span>{t('duel', 'bugType')}</span>
            <div className="duel-chip-row">
              {bugTypes.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`duel-chip ${bugType === value ? 'active' : ''}`}
                  onClick={() => setBugType(value)}
                >
                  {value === 'any' ? t('duel', 'any') : value.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="duel-start"
            onClick={handleStart}
            disabled={starting}
          >
            {starting ? '…' : t('duel', 'start')}
          </button>

          {error && <p className="duel-error" role="alert">{error}</p>}
        </section>
      ) : (
        <section className="duel-panel duel-searching">
          <div className="duel-radar" aria-hidden="true">
            <span /><span /><span />
            <strong>⚔</strong>
          </div>
          <h2>{t('duel', 'searching')}</h2>
          <p>{t('duel', 'searchingHint')}</p>
          <button type="button" className="duel-cancel" onClick={handleCancel}>
            {t('duel', 'cancel')}
          </button>
        </section>
      )}

      <section className="duel-panel duel-online">
        <div className="duel-online-head">
          <span className="duel-panel-label">{t('duel', 'onlineTitle')}</span>
          {online.length > 0 && (
            <strong className="duel-online-count">
              {online.length} <small>{t('duel', 'onlineCount')}</small>
            </strong>
          )}
        </div>

        {online.length === 0 ? (
          <p className="duel-online-empty">{t('duel', 'onlineEmpty')}</p>
        ) : (
          <ul className="duel-online-list">
            {online.map((user) => (
              <li key={user.id} className="duel-online-user">
                <span className="duel-online-dot" />
                <span
                  className="duel-online-avatar"
                  style={{ background: user.avatarColor }}
                >
                  {user.displayName.charAt(0).toUpperCase()}
                </span>
                <strong>{user.displayName}</strong>
                <small>@{user.username}</small>
                <em>{user.rating}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default DuelLobby
