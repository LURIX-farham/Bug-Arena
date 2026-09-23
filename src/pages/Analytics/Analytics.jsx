import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReplayAnalytics, getReplaySessions } from '../../services/replayStore'
import { useI18n } from '../../i18n/useI18n'
import {
  AnimatedCounter,
  AnimatedList,
  BlurText,
  GradientText,
  Magnet,
  SpotlightCard,
} from '../../components/reactbits'
import useInViewOnce from '../../hooks/useInViewOnce'
import './Analytics.css'

function formatDuration(ms) {
  const seconds = Math.max(0, Math.round((Number(ms) || 0) / 1000))
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function Analytics() {
  const { t } = useI18n()
  const [analytics, setAnalytics] = useState(getReplayAnalytics)
  const [sessions, setSessions] = useState(getReplaySessions)

  useEffect(() => {
    const refresh = () => {
      setAnalytics(getReplayAnalytics())
      setSessions(getReplaySessions())
    }
    refresh()
    window.addEventListener('bug-arena:replay-updated', refresh)
    return () => window.removeEventListener('bug-arena:replay-updated', refresh)
  }, [])

  const difficulty = Object.entries(analytics.difficultyBreakdown).sort((a, b) => b[1] - a[1])
  const modes = Object.entries(analytics.modeBreakdown).sort((a, b) => b[1] - a[1])

  // One-shot draw-in triggers for the two meter groups.
  const [barsRef, barsInView] = useInViewOnce(0.25)
  const [tableRef, tableInView] = useInViewOnce(0.15)

  const statCards = [
    { label: t('analytics', 'sessions'), value: analytics.sessions, tone: 'accent', meta: `${analytics.completed} ${t('analytics', 'completed')} · ${analytics.abandoned} ${t('analytics', 'abandoned')}` },
    { label: t('analytics', 'avgScore'), value: analytics.averageScore, tone: 'info', meta: t('analytics', 'pointsPerRun') },
    { label: t('analytics', 'avgAttempts'), value: analytics.averageAttempts, tone: 'tertiary', meta: t('analytics', 'runsBeforeSubmission') },
    { label: t('analytics', 'avgSpeed'), value: analytics.averageSpeedPercent, formatValue: (n) => `${Math.round(n)}%`, tone: 'success', meta: t('analytics', 'ofAllottedTime') },
    { label: t('analytics', 'hardening'), value: analytics.hardeningRate, formatValue: (n) => `${Math.round(n)}%`, tone: 'warning', meta: t('analytics', 'ofHardenedRuns') },
    { label: t('analytics', 'fastestFix'), value: formatDuration(analytics.fastestMs), tone: 'danger', meta: t('analytics', 'shortestSession'), plain: true },
  ]

  const recordedActions = Object.values(analytics.eventCounts).reduce((sum, value) => sum + value, 0)

  return (
    <div className="analytics-page">

      {/* ============ HERO — PERFORMANCE LAB ============ */}
      <header className="analytics-header analytics-hero">
        <div>
          <BlurText
            as="span"
            className="eyebrow"
            text={t('analytics', 'eyebrow')}
            animateBy="words"
            delay={22}
            direction="bottom"
            stepDuration={0.2}
          />
          <h1>
            <GradientText
              as="span"
              colors={['var(--accent)', '#59f3c4', '#7c5cff']}
              animationSpeed={7}
              pauseOnHover
            >
              {t('analytics', 'title')}
            </GradientText>
          </h1>
          <BlurText
            as="p"
            text={t('analytics', 'description')}
            animateBy="words"
            delay={26}
            direction="bottom"
            stepDuration={0.3}
          />
        </div>
        <Magnet padding={22} magnetStrength={4} maxOffset={5}>
          <Link className="analytics-replay-link" to="/replays">{t('analytics', 'openReplays')} →</Link>
        </Magnet>
      </header>

      {/* ============ STAT GRID ============ */}
      <section className="analytics-grid" aria-label={t('analytics', 'eyebrow')}>
        {statCards.map((stat) => (
          <SpotlightCard
            as="article"
            key={stat.label}
            data-tone={stat.tone}
            spotlightColor="rgba(var(--accent-rgb), 0.14)"
          >
            <span>{stat.label}</span>
            <strong>
              {stat.plain ? stat.value : (
                <AnimatedCounter
                  value={Number(stat.value) || 0}
                  duration={1.4}
                  formatValue={stat.formatValue}
                />
              )}
            </strong>
            <small>{stat.meta}</small>
          </SpotlightCard>
        ))}
      </section>

      {/* ============ BREAKDOWN PANELS ============ */}
      <section className="analytics-panels">
        <SpotlightCard as="article" className="analytics-panel" spotlightColor="rgba(var(--accent-rgb), 0.14)">
          <div className="analytics-panel-head"><span>{t('analytics', 'bestRun')}</span><strong>
            <AnimatedCounter
              value={Number(analytics.bestScore) || 0}
              duration={1.5}
            />
          </strong></div>
          <p>{analytics.bestChallenge || t('analytics', 'noBestReplay')}</p>
          <div
            ref={barsRef}
            className={`analytics-bars${barsInView ? ' analytics-bars--live' : ''}`}
          >
            {difficulty.length ? difficulty.map(([name, value]) => (
              <div className="analytics-bar-row" key={name}>
                <span>{name.toUpperCase()}</span>
                <div>
                  <i
                    className="analytics-bar-fill"
                    style={{ '--bar-width': `${Math.min(100, (value / Math.max(1, analytics.sessions)) * 100)}%` }}
                  />
                </div>
                <b>{value}</b>
              </div>
            )) : <small>{t('analytics', 'playToGenerate')}</small>}
          </div>
        </SpotlightCard>

        <SpotlightCard as="article" className="analytics-panel" spotlightColor="rgba(34, 211, 238, 0.12)">
          <div className="analytics-panel-head"><span>{t('analytics', 'modes')}</span><strong>
            <AnimatedCounter
              value={modes.length}
              duration={1.2}
            />
          </strong></div>
          <div className="analytics-mode-list">
            {modes.length ? modes.map(([mode, value]) => <div key={mode}><span>{mode.toUpperCase()}</span><strong>{value}</strong></div>) : <small>{t('analytics', 'noModeData')}</small>}
          </div>
          <div className="analytics-event-summary"><span>{t('analytics', 'recordedActions')}</span><strong>
            <AnimatedCounter
              value={recordedActions}
              duration={1.6}
              delay={0.15}
            />
          </strong></div>
        </SpotlightCard>
      </section>

      {/* ============ RECENT SESSIONS ============ */}
      <section
        ref={tableRef}
        className={`analytics-table${tableInView ? ' analytics-table--live' : ''}`}
      >
        <div className="analytics-table-head"><span>{t('analytics', 'recentSessions')}</span><strong>
          <AnimatedCounter
            value={sessions.length}
            duration={1.2}
          />
        </strong></div>
        <AnimatedList delay={55} initialDelay={110}>
          {sessions.slice(0, 10).map((session) => (
            <Link className="analytics-session" to="/replays" key={session.id}>
              <span>{t('challenges', 'bug')} #{session.challengeId}</span><strong>{session.challengeTitle}</strong><em>{session.mode.toUpperCase()}</em><b>{session.status === 'completed' ? `${session.finalScore} ${t('challenges', 'pts')}` : t('analytics', 'abandonedStatus')}</b><small>{new Date(session.startedAt).toLocaleString()}</small>
            </Link>
          ))}
        </AnimatedList>
        {!sessions.length && <div className="analytics-empty">{t('analytics', 'empty')}</div>}
      </section>
    </div>
  )
}

export default Analytics
