import { useEffect, useState } from 'react'
import { getCurrentPlayer } from '../../services/playerStore'
import { getLeaderboard, isLeaderboardLoaded, hydrateLeaderboardFromServer } from '../../services/leaderboardStore.js'
import { useI18n } from '../../i18n/useI18n'
import {
  AnimatedCounter,
  AnimatedList,
  BlurText,
  DotGrid,
  GradientText,
  LogoLoop,
  ShinyText,
  SpotlightCard,
  StarBorder,
} from '../../components/reactbits'
import { useTheme } from '../../theme/useTheme'
import './Leaderboard.css'

function Leaderboard() {
  const { t } = useI18n()
  const { isDark } = useTheme()
  const [, setRevision] = useState(0)

  useEffect(() => {
    const refresh = () => setRevision((revision) => revision + 1)
    hydrateLeaderboardFromServer()
    window.addEventListener('bug-arena:leaderboard-updated', refresh)
    window.addEventListener('bug-arena:player-updated', refresh)
    window.addEventListener('bug-arena:server-stats', refresh)
    window.addEventListener('bug-arena:submission-updated', refresh)
    return () => {
      window.removeEventListener('bug-arena:leaderboard-updated', refresh)
      window.removeEventListener('bug-arena:player-updated', refresh)
      window.removeEventListener('bug-arena:server-stats', refresh)
      window.removeEventListener('bug-arena:submission-updated', refresh)
    }
  }, [])

  const me = getCurrentPlayer()
  const remote = getLeaderboard()

  // Server rows are the single source of truth. Local player is only appended
  // when the API list does not yet include them (e.g. brand-new account), and
  // even then we map from serverStats-backed getCurrentPlayer fields — never
  // from decorative / hardcoded data.
  const leaderboard = remote.length
    ? (remote.some((player) => player.id === me.id)
        ? remote.slice()
        : [...remote, {
            id: me.id,
            username: me.username,
            displayName: me.displayName,
            level: me.level,
            score: me.score,
            xp: me.xp,
            solved: me.solved,
            wins: me.wins || 0,
            losses: me.losses || 0,
          }])
    : [{
        id: me.id,
        username: me.username,
        displayName: me.displayName,
        level: me.level,
        score: me.score,
        xp: me.xp,
        solved: me.solved,
        wins: me.wins || 0,
        losses: me.losses || 0,
      }]

  // Rank primarily by score (challenge + duel points from DB), then XP.
  leaderboard.sort(
    (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)
      || (Number(b.xp) || 0) - (Number(a.xp) || 0),
  )
  const ranked = leaderboard.map((player, index) => ({ ...player, rank: index + 1 }))

  const podium = ranked.slice(0, 3)
  const runnerUps = ranked.slice(3)
  const myRank = ranked.find((player) => player.id === me.id)?.rank
  const maxScore = Math.max(1, ranked[0]?.score || 1)

  const formatScore = (value) => (Number(value) || 0).toLocaleString()

  // DotGrid palette — concrete colors for the canvas layer.
  const dotBase = isDark ? 'rgba(154, 161, 172, 0.16)' : 'rgba(71, 85, 105, 0.13)'
  const dotActive = isDark ? 'rgba(124, 255, 107, 0.7)' : 'rgba(37, 99, 235, 0.45)'

  const podiumMedal = (rank) => (rank === 1 ? '◆' : rank === 2 ? '▲' : '■')

  const renderPodiumCard = (player) => {
    const isMe = player.id === me.id
    const card = (
      <SpotlightCard
        key={player.id}
        as="article"
        className={`podium-card podium-card--${player.rank}${isMe ? ' podium-card--me' : ''}`}
        spotlightColor={player.rank === 1 ? 'rgba(var(--accent-rgb), 0.2)' : 'rgba(var(--secondary-rgb), 0.14)'}
      >
        <div className="podium-head">
          <span className="podium-medal" aria-hidden="true">{podiumMedal(player.rank)}</span>
          <span className="podium-rank">#{player.rank}</span>
          {isMe && <span className="podium-you">{t('leaderboard', 'you')}</span>}
        </div>

        <div className="podium-player">
          <span className="podium-avatar" aria-hidden="true">
            {String(player.displayName || player.username || '?').charAt(0).toUpperCase()}
          </span>
          <strong>{player.username}</strong>
        </div>

        <div className="podium-score">
          <AnimatedCounter
            value={Number(player.score) || 0}
            duration={1.7}
            delay={player.rank * 0.12}
          />
          <small>{t('profile', 'score')}</small>
        </div>

        <div className="podium-meta">
          <span>{t('leaderboard', 'lvl')} {player.level || 1}</span>
          <i aria-hidden="true">·</i>
          <span>{formatScore(player.xp)} {t('leaderboard', 'colXp')}</span>
          <i aria-hidden="true">·</i>
          <span>{player.wins || 0}W / {player.losses || 0}L</span>
        </div>

        <div className="podium-track" aria-hidden="true">
          <span style={{ width: `${Math.max(6, ((Number(player.score) || 0) / maxScore) * 100)}%` }} />
        </div>
      </SpotlightCard>
    )

    // The champion gets the orbiting border beams.
    return player.rank === 1 ? (
      <StarBorder
        key={player.id}
        className="podium-arena"
        speed={8}
        color="rgba(var(--accent-rgb), 0.85)"
        secondaryColor="rgba(var(--tertiary-rgb), 0.4)"
      >
        {card}
      </StarBorder>
    ) : card
  }

  return (
    <div className="leaderboard-page">

      {/* ============ HERO — LADDER FIELD ============ */}
      <section className="lb-hero" aria-labelledby="lb-hero-title">
        <div className="lb-hero-layers" aria-hidden="true">
          <DotGrid
            className="lb-hero-dots"
            gap={26}
            dotSize={1.4}
            baseColor={dotBase}
            activeColor={dotActive}
            proximity={120}
          />
          <div className="lb-hero-vignette" />
        </div>

        <div className="leaderboard-header">
          <div>
            <BlurText
              as="span"
              className="leaderboard-eyebrow"
              text={t('leaderboard', 'eyebrow')}
              animateBy="words"
              delay={22}
              direction="bottom"
              stepDuration={0.2}
            />
            <h1 id="lb-hero-title">
              <GradientText
                as="span"
                colors={['var(--accent)', '#59f3c4', '#7c5cff']}
                animationSpeed={7}
                pauseOnHover
              >
                {t('nav', 'leaderboard')}
              </GradientText>
            </h1>
            <BlurText
              as="p"
              text={t('leaderboard', 'description')}
              animateBy="words"
              delay={26}
              direction="bottom"
              stepDuration={0.3}
            />
          </div>

          <div className="leaderboard-count">
            <span>{t('leaderboard', 'players')}</span>
            <strong>
              <AnimatedCounter
                value={ranked.length}
                duration={1.3}
              />
            </strong>
            {myRank && (
              <small className="leaderboard-my-rank">
                {t('home', 'rank')} #{myRank}
              </small>
            )}
          </div>
        </div>
      </section>

      {/* ============ LIVE TICKER ============ */}
      <div className="lb-ticker">
        <span className="lb-ticker-chip">
          <span className="lb-ticker-dot" aria-hidden="true" />
          <ShinyText text={t('home', 'liveLeaderboard')} speed={3.6} />
        </span>
        <LogoLoop className="lb-ticker-loop" duration={40}>
          {ranked.slice(0, 8).map((player) => (
            <span
              className={`lb-ticker-item${player.id === me.id ? ' lb-ticker-item--you' : ''}`}
              key={player.id}
            >
              <strong>#{player.rank}</strong>
              {player.username}
              <span className="lb-ticker-score">{formatScore(player.score)}</span>
              <i className="lb-ticker-sep" aria-hidden="true">◆</i>
            </span>
          ))}
        </LogoLoop>
      </div>

      {/* ============ PODIUM ============ */}
      <section className="podium" aria-label={t('leaderboard', 'eyebrow')}>
        {podium.map(renderPodiumCard)}
      </section>

      {/* ============ LADDER TABLE ============ */}
      <section className="leaderboard-table">
        <div className="leaderboard-table-head">
          <span>{t('home', 'rank')}</span>
          <span>{t('leaderboard', 'colPlayer')}</span>
          <span>{t('leaderboard', 'colLevel')}</span>
          <span>{t('profile', 'score')}</span>
          <span>{t('leaderboard', 'colXp')}</span>
          <span>{t('competitive', 'wl')}</span>
        </div>
        <AnimatedList className="leaderboard-rows" delay={45} initialDelay={100}>
          {runnerUps.map((player) => (
            <div
              key={player.id}
              className={`leaderboard-row ${player.id === me.id ? 'current-player' : ''}`}
            >
              <div className="leaderboard-rank">{String(player.rank).padStart(2, '0')}</div>
              <div className="leaderboard-player">
                <div className="player-avatar">
                  {String(player.displayName || player.username || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong>{player.username}</strong>
                  {player.id === me.id && <span>{t('leaderboard', 'you')}</span>}
                </div>
              </div>
              <div className="leaderboard-level">
                {t('leaderboard', 'lvl')} {player.level || 1}
              </div>
              {/* score = total_score + duel_points from player_statistics */}
              <div className="leaderboard-score">{Number(player.score) || 0}</div>
              {/* xp = challenge deltas + achievement rewards + duel xp */}
              <div className="leaderboard-xp">{Number(player.xp) || 0}</div>
              <div className="leaderboard-solved">
                {player.wins || 0} / {player.losses || 0}
              </div>
            </div>
          ))}
        </AnimatedList>
        {!isLeaderboardLoaded() && (
          <div className="profile-empty">{t('leaderboard', 'loading')}</div>
        )}
      </section>
    </div>
  )
}

export default Leaderboard
