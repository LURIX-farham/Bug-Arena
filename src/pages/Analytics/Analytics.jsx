import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getReplayAnalytics, getReplaySessions } from '../../services/replayStore'
import { useI18n } from '../../i18n/useI18n'
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

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <span className="eyebrow">{t('analytics', 'eyebrow')}</span>
          <h1>{t('analytics', 'title')}</h1>
          <p>{t('analytics', 'description')}</p>
        </div>
        <Link className="analytics-replay-link" to="/replays">{t('analytics', 'openReplays')} →</Link>
      </header>
      <section className="analytics-grid">
        <article><span>{t('analytics', 'sessions')}</span><strong>{analytics.sessions}</strong><small>{analytics.completed} {t('analytics', 'completed')} · {analytics.abandoned} {t('analytics', 'abandoned')}</small></article>
        <article><span>{t('analytics', 'avgScore')}</span><strong>{analytics.averageScore}</strong><small>{t('analytics', 'pointsPerRun')}</small></article>
        <article><span>{t('analytics', 'avgAttempts')}</span><strong>{analytics.averageAttempts}</strong><small>{t('analytics', 'runsBeforeSubmission')}</small></article>
        <article><span>{t('analytics', 'avgSpeed')}</span><strong>{analytics.averageSpeedPercent}%</strong><small>{t('analytics', 'ofAllottedTime')}</small></article>
        <article><span>{t('analytics', 'hardening')}</span><strong>{analytics.hardeningRate}%</strong><small>{t('analytics', 'ofHardenedRuns')}</small></article>
        <article><span>{t('analytics', 'fastestFix')}</span><strong>{formatDuration(analytics.fastestMs)}</strong><small>{t('analytics', 'shortestSession')}</small></article>
      </section>
      <section className="analytics-panels">
        <article className="analytics-panel">
          <div className="analytics-panel-head"><span>{t('analytics', 'bestRun')}</span><strong>{analytics.bestScore}</strong></div>
          <p>{analytics.bestChallenge || t('analytics', 'noBestReplay')}</p>
          <div className="analytics-bars">
            {difficulty.length ? difficulty.map(([name, value]) => (
              <div className="analytics-bar-row" key={name}>
                <span>{name.toUpperCase()}</span><div><i style={{ width: `${Math.min(100, (value / Math.max(1, analytics.sessions)) * 100)}%` }} /></div><b>{value}</b>
              </div>
            )) : <small>{t('analytics', 'playToGenerate')}</small>}
          </div>
        </article>
        <article className="analytics-panel">
          <div className="analytics-panel-head"><span>{t('analytics', 'modes')}</span><strong>{modes.length}</strong></div>
          <div className="analytics-mode-list">
            {modes.length ? modes.map(([mode, value]) => <div key={mode}><span>{mode.toUpperCase()}</span><strong>{value}</strong></div>) : <small>{t('analytics', 'noModeData')}</small>}
          </div>
          <div className="analytics-event-summary"><span>{t('analytics', 'recordedActions')}</span><strong>{Object.values(analytics.eventCounts).reduce((sum, value) => sum + value, 0)}</strong></div>
        </article>
      </section>
      <section className="analytics-table">
        <div className="analytics-table-head"><span>{t('analytics', 'recentSessions')}</span><strong>{sessions.length}</strong></div>
        {sessions.slice(0, 10).map((session) => (
          <Link className="analytics-session" to="/replays" key={session.id}>
            <span>{t('challenges', 'bug')} #{session.challengeId}</span><strong>{session.challengeTitle}</strong><em>{session.mode.toUpperCase()}</em><b>{session.status === 'completed' ? `${session.finalScore} ${t('challenges', 'pts')}` : t('analytics', 'abandonedStatus')}</b><small>{new Date(session.startedAt).toLocaleString()}</small>
          </Link>
        ))}
        {!sessions.length && <div className="analytics-empty">{t('analytics', 'empty')}</div>}
      </section>
    </div>
  )
}

export default Analytics
