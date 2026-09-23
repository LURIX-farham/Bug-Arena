import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { challenges } from '../../data/challenges'
import { canDuel, cancelDuel, createDuel, createPoller, DUEL_DIFFICULTIES, fetchMatch, heartbeat } from '../../services/duelStore.js'
import { useI18n } from '../../i18n/useI18n'
import {
  AnimatedCounter,
  AnimatedList,
  Aurora,
  BlurText,
  Magnet,
  ShinyText,
  SpotlightCard,
} from '../../components/reactbits'
import { useTheme } from '../../theme/useTheme'
import './Duel.css'

/**
 * 1v1 duel lobby: customize the match (difficulty + bug type), see who is
 * online, then fire a duel request that lands as a toast on every online
 * player's screen. The moment someone accepts, both sides are routed into
 * the duel room.
 */
function DuelLobby() {
  const { t } = useI18n()
  const { isDark } = useTheme()
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

  // Aurora stops must be HEX — ogl's Color parser rejects rgba() strings.
  const auroraStops = isDark
    ? ['#7cff6b', '#7c5cff', '#22c7d9']
    : ['#008f70', '#6947e8', '#087fb5']

  return (
    <div className="duel-lobby duel-lobby--stage">

      {/* ============ HEADER — DUEL FIELD ============ */}
      <header className="duel-lobby-head duel-hero">
        <div className="duel-hero-layers" aria-hidden="true">
          <div className="duel-hero-aurora">
            <Aurora
              colorStops={auroraStops}
              amplitude={0.6}
              blend={0.5}
              lightMode={!isDark}
            />
          </div>
          <div className="duel-hero-vignette" />
        </div>

        <div className="duel-hero-copy">
          <BlurText
            as="span"
            className="duel-eyebrow"
            text={t('duel', 'roomTitle')}
            animateBy="words"
            delay={24}
            direction="bottom"
            stepDuration={0.2}
          />
          <h1>{t('duel', 'title')}</h1>
          <BlurText
            as="p"
            text={t('duel', 'subtitle')}
            animateBy="words"
            delay={28}
            direction="bottom"
            stepDuration={0.3}
          />
          <small className="duel-reward">
            <ShinyText text={t('duel', 'rewardHint')} speed={4.2} />
          </small>
        </div>
      </header>

      {phase === 'idle' ? (
        <SpotlightCard
          as="section"
          className="duel-panel duel-setup"
          spotlightColor="rgba(var(--accent-rgb), 0.14)"
        >
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

          <Magnet padding={26} magnetStrength={4} maxOffset={6}>
            <button
              type="button"
              className="duel-start"
              onClick={handleStart}
              disabled={starting}
            >
              {starting ? '…' : t('duel', 'start')}
            </button>
          </Magnet>

          {error && <p className="duel-error" role="alert">{error}</p>}
        </SpotlightCard>
      ) : (
        <SpotlightCard
          as="section"
          className="duel-panel duel-searching"
          spotlightColor="rgba(var(--accent-rgb), 0.18)"
        >
          <div className="duel-radar" aria-hidden="true">
            <span /><span /><span />
            <strong>⚔</strong>
          </div>
          <h2>
            <ShinyText text={t('duel', 'searching')} speed={2.6} />
          </h2>
          <p>{t('duel', 'searchingHint')}</p>
          <button type="button" className="duel-cancel" onClick={handleCancel}>
            {t('duel', 'cancel')}
          </button>
        </SpotlightCard>
      )}

      <SpotlightCard
        as="section"
        className="duel-panel duel-online"
        spotlightColor="rgba(var(--secondary-rgb), 0.12)"
      >
        <div className="duel-online-head">
          <span className="duel-panel-label">
            <ShinyText text={t('duel', 'onlineTitle')} speed={4.4} />
          </span>
          {online.length > 0 && (
            <strong className="duel-online-count">
              <AnimatedCounter
                value={online.length}
                duration={1.2}
              />
              <small>{t('duel', 'onlineCount')}</small>
            </strong>
          )}
        </div>

        {online.length === 0 ? (
          <p className="duel-online-empty">{t('duel', 'onlineEmpty')}</p>
        ) : (
          <AnimatedList className="duel-online-list" delay={80} initialDelay={120}>
            {online.map((user) => (
              <div key={user.id} className="duel-online-user">
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
              </div>
            ))}
          </AnimatedList>
        )}
      </SpotlightCard>
    </div>
  )
}

export default DuelLobby
