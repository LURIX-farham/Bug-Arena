import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getCurrentPlayer } from '../../services/playerStore'
import { getCompletedChallenges } from '../../services/submissionStore'
import { players } from '../../data/players'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'
import {
  AnimatedCounter,
  AnimatedList,
  Aurora,
  BlurText,
  DotGrid,
  GradientText,
  LogoLoop,
  Magnet,
  ShinyText,
  SpotlightCard,
  StarBorder,
} from '../../components/reactbits'
import { useTheme } from '../../theme/useTheme'
import './Home.css'

/**
 * useInViewOnce — flips to true the first time the attached element
 * enters the viewport. Powers the one-shot chart draw-in so the
 * performance graph animates when it is actually seen.
 */
function useInViewOnce(threshold = 0.3) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold })

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}

function Home() {
  const { t, language } = useI18n()
  const { isDark } = useTheme()
  const isFa = language === 'fa'
  const player = getCurrentPlayer()
  const allChallenges = Object.values(challenges)
  const completed = getCompletedChallenges()
  const nextChallenge = getLocalizedChallenge(
    allChallenges.find((item) => !completed.some((entry) => Number(entry.challengeId) === item.id)) || allChallenges[0],
    language
  )
  const recent = completed.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 4)
  const solvedPercent = allChallenges.length ? Math.round((player.solved / allChallenges.length) * 100) : 0
  const leaderboard = [...players, player].sort((a, b) => b.score - a.score || b.solved - a.solved)
  const playerRank = leaderboard.findIndex((entry) => entry.id === player.id) + 1
  const scoreHistory = completed.slice().sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
  const scorePoints = scoreHistory.reduce((points, item) => {
    const previousScore = points[points.length - 1] || 0
    return [...points, previousScore + (Number(item.score) || 0)]
  }, [])
  const chartMax = Math.max(...scorePoints, 1)
  const chartCoordinates = scorePoints.length
    ? scorePoints.map((value, index) => {
        const x = scorePoints.length === 1 ? 250 : (index / (scorePoints.length - 1)) * 500
        const y = 140 - (value / chartMax) * 110
        return [x, y]
      })
    : []
  const chartPoints = chartCoordinates.map(([x, y]) => `${x},${y}`).join(' ') || '0,140 500,140'
  const chartAreaPoints = chartCoordinates.length
    ? `0,140 ${chartPoints} ${chartCoordinates[chartCoordinates.length - 1][0]},140`
    : '0,140 500,140'
  const lastPoint = chartCoordinates.length ? chartCoordinates[chartCoordinates.length - 1] : null

  // Player identity — level, levelProgress (XP bar), rank title, streak.
  const levelProgress = player.levelProgress || {}
  const xpPercent = Math.max(0, Math.min(100, levelProgress.percent || 0))
  const xpCurrent = Math.max(0, levelProgress.currentXp || 0)
  const xpSpan = Math.max(1, (levelProgress.nextLevelXp || 0) - (levelProgress.currentLevelXp || 0))
  const xpWithinLevel = Math.min(xpSpan, xpCurrent)
  const streak = Math.max(0, Number(player.streak) || 0)
  const bestStreak = Math.max(streak, Number(player.bestStreak) || 0)
  const rankTitle = player.rank || t('home', 'heroRankLocked')

  // Stat rail context bars — all derived from real local data:
  // • score share vs. the ladder leader
  // • solve rate across the whole catalogue
  // • accuracy (solved / attempts)
  // • leaderboard percentile
  const leaderboardMax = Math.max(1, leaderboard[0]?.score || 1)
  const scoreShare = Math.min(100, Math.round((player.score / leaderboardMax) * 100))
  const accuracy = player.attempts ? Math.round((player.solved / player.attempts) * 100) : 0
  const rankPercentile = Math.min(100, Math.round(((leaderboard.length - playerRank) / leaderboard.length) * 100))

  // Mini ladder — top of the real leaderboard, collapsing to an ellipsis
  // row plus the player's own row when they sit deeper in the table.
  const ladderRows = []
  leaderboard.slice(0, 3).forEach((entry) => {
    ladderRows.push({
      entry,
      position: leaderboard.indexOf(entry) + 1,
      isPlayer: entry.id === player.id,
    })
  })
  if (playerRank > 3) {
    ladderRows.push({ placeholder: true })
    ladderRows.push({ entry: player, position: playerRank, isPlayer: true })
  }

  const formatScore = (value) => Number(value).toLocaleString(isFa ? 'fa-IR' : 'en-US')

  const difficultyLabel = (d) => {
    if (!isFa) return d.toUpperCase()
    if (d === 'easy') return 'آسان'
    if (d === 'medium') return 'متوسط'
    if (d === 'hard') return 'سخت'
    return d.toUpperCase()
  }

  // Ambient layer palettes adapt to the active theme. Stops must be HEX:
  // Aurora feeds them to ogl's Color parser every frame, which only
  // understands hex — rgba() strings would warn and render as garbage.
  const auroraStops = isDark
    ? ['#7cff6b', '#7c5cff', '#22c7d9']
    : ['#008f70', '#6947e8', '#087fb5']

  // DotGrid palette — concrete colors because canvas can't resolve CSS vars.
  const dotBase = isDark ? 'rgba(154, 161, 172, 0.20)' : 'rgba(71, 85, 105, 0.16)'
  const dotActive = isDark ? 'rgba(124, 255, 107, 0.85)' : 'rgba(37, 99, 235, 0.55)'

  const [chartRef, chartInView] = useInViewOnce(0.25)

  return (
    <div className="home-page">

      {/* ============ 1 · HERO — ARENA FIELD ============ */}
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero-layers" aria-hidden="true">
          <div className="home-hero-aurora">
            <Aurora
              colorStops={auroraStops}
              amplitude={0.7}
              blend={0.62}
              lightMode={!isDark}
            />
          </div>
          <DotGrid
            className="home-hero-dots"
            gap={26}
            dotSize={1.5}
            baseColor={dotBase}
            activeColor={dotActive}
            proximity={130}
          />
          <div className="home-hero-vignette" />
        </div>

        <div className="home-hero-grid">
          {/* Left: greeting + welcome body + headline metrics + quick actions */}
          <div className="home-hero-copy">
            <BlurText
              as="span"
              className="home-eyebrow home-hero-eyebrow"
              text={t('home', 'eyebrow')}
              animateBy="characters"
              delay={18}
              direction="bottom"
              stepDuration={0.2}
            />
            <h1 id="home-hero-title" className="home-hero-title">
              <span className="home-title-main">{t('home', 'welcome')}</span>{' '}
              <GradientText
                as="span"
                className="home-name-gradient"
                colors={['var(--accent)', '#59f3c4', '#7c5cff']}
                animationSpeed={7}
                pauseOnHover
              >
                {player.displayName}.
              </GradientText>
            </h1>
            <BlurText
              as="p"
              className="home-header-body"
              text={t('home', 'welcomeBody')}
              animateBy="words"
              delay={28}
              direction="bottom"
              stepDuration={0.32}
            />

            {/* Headline metrics strip — score leads, rank and solves trail. */}
            <div className="home-hero-metrics">
              <div className="hero-metric hero-metric--lead">
                <span className="hero-metric-label">{t('home', 'statsTotalScore')}</span>
                <span className="hero-metric-value">
                  <AnimatedCounter
                    as="strong"
                    value={player.score}
                    duration={1.6}
                    delay={0.15}
                  />
                  <em className="hero-metric-unit">{t('home', 'points')}</em>
                </span>
              </div>
              <span className="hero-metric-divider" aria-hidden="true" />
              <div className="hero-metric">
                <span className="hero-metric-label">{t('home', 'rank')}</span>
                <span className="hero-metric-value hero-metric-value--accent">
                  #{String(playerRank).padStart(2, '0')}
                </span>
              </div>
              <span className="hero-metric-divider" aria-hidden="true" />
              <div className="hero-metric">
                <span className="hero-metric-label">{t('home', 'statsSolved')}</span>
                <span className="hero-metric-value">
                  {player.solved}
                  <em className="hero-metric-sub">/{allChallenges.length}</em>
                </span>
              </div>
            </div>

            <div className="home-hero-actions-block">
              <span className="home-hero-actions-label">{t('home', 'heroQuickActions')}</span>
              <div className="home-header-actions">
                <Magnet padding={30} magnetStrength={5} maxOffset={7}>
                  <Link to={`/arena/${nextChallenge.id}`} className="primary-action">
                    <span className="action-glyph" aria-hidden="true">▶</span>
                    {t('home', 'startChallenge')}
                  </Link>
                </Magnet>
                <Magnet padding={26} magnetStrength={5} maxOffset={6}>
                  <Link to="/duel" className="secondary-action duel-action">
                    <span className="action-glyph" aria-hidden="true">⚔</span>
                    {t('home', 'duelCta')}
                  </Link>
                </Magnet>
                <Magnet padding={22} magnetStrength={5} maxOffset={5}>
                  <Link to="/profile" className="secondary-action">{t('home', 'viewProfile')}</Link>
                </Magnet>
              </div>
            </div>
          </div>

          {/* Right: arena identity card — level, rank, XP bar, streak */}
          <SpotlightCard
            as="aside"
            className="home-hero-identity"
            spotlightColor="rgba(var(--accent-rgb), 0.18)"
            aria-label={t('home', 'heroIdentityEyebrow')}
          >
            <div className="identity-header">
              <span className="identity-eyebrow">{t('home', 'heroIdentityEyebrow')}</span>
              <span className="identity-level-chip">
                <span className="identity-level-label">{t('home', 'heroLevel')}</span>
                <AnimatedCounter
                  as="strong"
                  className="identity-level-value"
                  value={Number(player.level) || 1}
                  duration={1.2}
                  delay={0.3}
                />
              </span>
            </div>

            <div className="identity-rank">
              <GradientText
                as="span"
                className="identity-rank-title"
                colors={['var(--accent)', 'var(--secondary)', 'var(--tertiary)']}
                animationSpeed={9}
                pauseOnHover
              >
                {rankTitle}
              </GradientText>
            </div>

            <div className="identity-xp">
              <div className="identity-xp-meta">
                <span className="identity-xp-current">
                  <AnimatedCounter
                    as="strong"
                    value={xpWithinLevel}
                    duration={1.4}
                    delay={0.4}
                  />
                  <span className="identity-xp-sep">/</span>
                  <span className="identity-xp-total">{xpSpan}</span>
                </span>
                <span className="identity-xp-progress">
                  {xpPercent}% <span className="identity-xp-progress-soft">{t('home', 'heroXpProgress')}</span>
                </span>
              </div>
              <div
                className="identity-xp-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={xpPercent}
                aria-label={`${t('home', 'heroXp')} ${xpPercent}%`}
              >
                <span
                  className="identity-xp-fill"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>

            <div className="identity-divider" aria-hidden="true" />

            <div className="identity-streak">
              <div className="identity-streak-icon" aria-hidden="true">🔥</div>
              <div className="identity-streak-body">
                {streak > 0 ? (
                  <>
                    <strong className="identity-streak-count">
                      <AnimatedCounter
                        as="span"
                        value={streak}
                        duration={1.1}
                        delay={0.5}
                      />
                      <span className="identity-streak-unit"> {t('home', 'heroStreak')}</span>
                    </strong>
                    <span className="identity-streak-best">
                      {t('home', 'heroStreakBest')}: {bestStreak}
                    </span>
                  </>
                ) : (
                  <strong className="identity-streak-idle">{t('home', 'heroStreakIdle')}</strong>
                )}
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ============ 2 · LIVE LEADERBOARD TICKER ============ */}
      <div className="arena-ticker">
        <span className="ticker-chip">
          <span className="ticker-chip-dot" aria-hidden="true" />
          <ShinyText text={t('home', 'liveLeaderboard')} speed={3.6} />
        </span>
        <LogoLoop className="ticker-loop" duration={42}>
          {leaderboard.slice(0, 7).map((entry) => (
            <span
              className={`ticker-item${entry.id === player.id ? ' ticker-item--you' : ''}`}
              key={entry.id}
            >
              <strong>{entry.username}</strong>
              <span className="ticker-score">{formatScore(entry.score)}</span>
              <em>{t('home', 'points')}</em>
              <i className="ticker-sep" aria-hidden="true">◆</i>
            </span>
          ))}
        </LogoLoop>
      </div>

      {/* ============ 3 · COMMAND RAIL — STATS ============ */}
      <SpotlightCard
        as="section"
        className="stat-card stat-rail"
        spotlightColor="rgba(var(--accent-rgb), 0.12)"
        aria-label={t('home', 'statsTotalScore')}
      >
        <div className="rail-metric">
          <span className="stat-label">{t('home', 'statsTotalScore')}</span>
          <strong className="stat-value">
            <AnimatedCounter value={player.score} duration={1.5} delay={0.1} />
          </strong>
          <div className="rail-bar" aria-hidden="true">
            <span data-tone="accent" style={{ width: `${scoreShare}%` }} />
          </div>
          <span className="stat-meta">{t('home', 'rank')} #{playerRank} · {t('home', 'mvp')}</span>
        </div>

        <div className="rail-metric">
          <span className="stat-label">{t('home', 'statsSolved')}</span>
          <strong className="stat-value">
            <AnimatedCounter value={player.solved} duration={1.4} delay={0.2} />
            <span className="stat-value-sub">/{allChallenges.length}</span>
          </strong>
          <div className="rail-bar" aria-hidden="true">
            <span data-tone="secondary" style={{ width: `${solvedPercent}%` }} />
          </div>
          <span className="stat-meta">{t('home', 'of')} {allChallenges.length} · {solvedPercent}%</span>
        </div>

        <div className="rail-metric">
          <span className="stat-label">{t('home', 'statsAttempts')}</span>
          <strong className="stat-value">
            <AnimatedCounter value={player.attempts} duration={1.4} delay={0.3} />
          </strong>
          <div className="rail-bar" aria-hidden="true">
            <span data-tone="tertiary" style={{ width: `${accuracy}%` }} />
          </div>
          <span className="stat-meta">{accuracy}% {t('home', 'accuracy')} · {t('home', 'totalRuns')}</span>
        </div>

        <div className="rail-metric">
          <span className="stat-label">{t('home', 'statsProgress')}</span>
          <strong className="stat-value">
            <AnimatedCounter value={rankPercentile} duration={1.4} delay={0.4} formatValue={(n) => `${Math.round(n)}%`} />
          </strong>
          <div className="rail-bar" aria-hidden="true">
            <span data-tone="success" style={{ width: `${rankPercentile}%` }} />
          </div>
          <span className="stat-meta">{t('home', 'mvpTrack')}</span>
        </div>
      </SpotlightCard>

      {/* ============ 4 · BATTLE DECK — NEXT CHALLENGE + PERFORMANCE ============ */}
      <section className="battle-deck">
        <StarBorder
          className="active-wrap"
          speed={8}
          color="rgba(var(--accent-rgb), 0.85)"
          secondaryColor="rgba(var(--secondary-rgb), 0.45)"
        >
          <SpotlightCard as="article" className="home-panel active-challenge">
            <div className="panel-header">
              <div>
                <span className="panel-eyebrow">{t('home', 'activeEyebrow')}</span>
                <h2>{t('home', 'activeTitle')}</h2>
              </div>
              <span className="live-indicator">
                <ShinyText text={t('home', 'ready')} speed={2.8} />
              </span>
            </div>
            <div className="challenge-preview">
              <div className="challenge-top">
                <span className="challenge-id">{t('home', 'bugId')} #{nextChallenge.id}</span>
                <span className={`challenge-difficulty difficulty--${nextChallenge.difficulty}`}>
                  {difficultyLabel(nextChallenge.difficulty)}
                </span>
              </div>
              <h3>{nextChallenge.title}</h3>
              <p>{nextChallenge.description}</p>
              <div className="challenge-tags">
                <span>{nextChallenge.language.toUpperCase()}</span>
                <span>{nextChallenge.tags?.[1]?.toUpperCase() || t('home', 'logic')}</span>
                <span>{Math.floor(nextChallenge.timeLimit / 60)} {t('home', 'min')}</span>
              </div>
              <Link to={`/arena/${nextChallenge.id}`} className="challenge-start">
                {t('home', 'enterChallenge')}
                <span className="challenge-start-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          </SpotlightCard>
        </StarBorder>

        <SpotlightCard className="home-panel performance-panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">{t('home', 'progressEyebrow')}</span>
              <h2>{t('home', 'progressTitle')}</h2>
            </div>
            <span className="panel-period">{t('home', 'mvp')}</span>
          </div>
          <div className="rating-number">
            <AnimatedCounter as="strong" value={player.score} duration={1.7} delay={0.2} />
            <span>{t('home', 'points')}</span>
          </div>
          <div
            ref={chartRef}
            className={`rating-chart${chartInView ? ' rating-chart--live' : ''}`}
          >
            <div className="chart-grid" aria-hidden="true"><span /><span /><span /><span /></div>
            <svg viewBox="0 0 500 160" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <linearGradient id="home-chart-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polygon
                className="chart-area"
                points={chartAreaPoints}
                fill="url(#home-chart-fill)"
              />
              <polyline
                className="chart-line"
                points={chartPoints}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {chartInView && lastPoint && (
              <span
                className="chart-pulse"
                aria-hidden="true"
                style={{
                  insetInlineStart: `${(lastPoint[0] / 500) * 100}%`,
                  top: `${(lastPoint[1] / 160) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="chart-labels">
            <span>{t('home', 'start')}</span>
            <span>{scoreHistory.length ? `${scoreHistory.length} ${t('home', 'solved')}` : t('home', 'noData')}</span>
            <span>{player.score} {t('home', 'points')}</span>
          </div>
        </SpotlightCard>
      </section>

      {/* ============ 5 · COMPETITIVE ROW — LADDER + ACTIVITY ============ */}
      <section className="competitive-grid">
        <SpotlightCard className="home-panel rank-panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">{t('home', 'rankingEyebrow')}</span>
              <h2>{t('home', 'rankingTitle')}</h2>
            </div>
            <span className="rank-position">#{String(playerRank).padStart(2, '0')}</span>
          </div>
          <ol className="ladder">
            {ladderRows.map((row, index) => (
              <li
                className={[
                  'ladder-row',
                  row.isPlayer ? 'ladder-row--you' : '',
                  row.placeholder ? 'ladder-row--gap' : '',
                ].filter(Boolean).join(' ')}
                key={row.placeholder ? `gap-${index}` : row.entry.id}
              >
                <span className="ladder-pos">{row.placeholder ? '···' : `#${row.position}`}</span>
                <span className="ladder-name">{row.placeholder ? '' : row.entry.username}</span>
                {row.isPlayer && <span className="ladder-you">{t('home', 'youTag')}</span>}
                <span className="ladder-score">
                  {row.placeholder ? '' : formatScore(row.entry.score)}
                </span>
              </li>
            ))}
          </ol>
          <div className="rank-progress">
            <div className="rank-track">
              <span style={{ width: `${Math.min(100, Math.max(4, scoreShare))}%` }} />
            </div>
            <div className="rank-info">
              <span>{player.score} {t('home', 'points')}</span>
              <span>{player.solved} {t('home', 'solved')} · #{playerRank}</span>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard as="section" className="home-panel activity-panel">
          <div className="panel-header">
            <div>
              <span className="panel-eyebrow">{t('home', 'activityEyebrow')}</span>
              <h2>{t('home', 'activityTitle')}</h2>
            </div>
            <Link to="/profile" className="panel-link">{t('home', 'viewAll')} →</Link>
          </div>
          <AnimatedList className="matches-list" delay={110} initialDelay={160}>
            {recent.length ? recent.map((item) => (
              <div className="match-row" key={`${item.challengeId}-${item.submittedAt}`}>
                <div className="match-result win">✓</div>
                <div className="match-info">
                  <strong>{item.challengeTitle}</strong>
                  <span>{t('home', 'pythonLabel')}{challenges[item.challengeId]?.difficulty || t('home', 'challengeLabel')}</span>
                </div>
                <span className="match-rating positive">+{item.score}</span>
                <span className="match-time">{new Date(item.submittedAt).toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}</span>
              </div>
            )) : (
              <div className="profile-empty">
                <strong>{t('home', 'noSubmissions')}</strong>
                <p>{t('home', 'noSubmissionsBody')}</p>
              </div>
            )}
          </AnimatedList>
        </SpotlightCard>
      </section>

      {/* ============ 6 · FOR YOU BAND ============ */}
      <SpotlightCard as="section" className="home-panel for-you-band">
        <span className="fy-badge" aria-hidden="true">✦</span>
        <div className="fy-copy">
          <span className="panel-eyebrow">{t('home', 'forYouEyebrow')}</span>
          <h2>{t('home', 'forYouTitle')}</h2>
        </div>
        <div className="fy-meta">
          <strong>{nextChallenge.title}</strong>
          <span>
            {nextChallenge.language} · {difficultyLabel(nextChallenge.difficulty)} · {Math.floor(nextChallenge.timeLimit / 60)} {t('home', 'min')}
          </span>
        </div>
        <Link to={`/arena/${nextChallenge.id}`} className="fy-cta">
          {t('home', 'enterChallenge')}
          <span className="challenge-start-arrow" aria-hidden="true">→</span>
        </Link>
      </SpotlightCard>
    </div>
  )
}

export default Home
