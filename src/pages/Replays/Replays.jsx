import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getReplaySessions } from '../../services/replayStore'
import { useI18n } from '../../i18n/useI18n'
import './Replays.css'

function Replays() {
  const { t } = useI18n()
  const [replays, setReplays] = useState(getReplaySessions)
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    const refresh = () => setReplays(getReplaySessions())
    window.addEventListener('bug-arena:replay-updated', refresh)
    return () => window.removeEventListener('bug-arena:replay-updated', refresh)
  }, [])

  const selected = replays.find((item) => item.id === selectedId) || null

  return (
    <div className="replays-page">
      <header className="replays-header">
        <div><span className="eyebrow">{t('replays', 'eyebrow')}</span><h1>{t('replays', 'title')}</h1><p>{t('replays', 'description')}</p></div>
        <div className="replay-count"><span>{t('replays', 'recorded')}</span><strong>{replays.length}</strong></div>
      </header>
      {replays.length ? (
        <section className="replay-list">
          {replays.map((item) => {
            const challenge = challenges[item.challengeId]
            return <article className="replay-card" key={item.id}>
              <div className="replay-top"><span>{t('challenges', 'bug')} #{item.challengeId}</span><span>{item.mode.toUpperCase()} · {challenge?.difficulty || item.difficulty}</span></div>
              <div className="replay-main"><div><h2>{item.challengeTitle}</h2><p>{new Date(item.startedAt).toLocaleString()} · {item.events?.length || 0} {t('replays', 'events')}</p></div><div className="replay-score"><span>{item.status === 'completed' ? t('arena', 'points') : t('arena', 'status')}</span><strong>{item.status === 'completed' ? item.finalScore : t('replays', 'open')}</strong></div></div>
              <div className="replay-metrics"><span>{item.attempts} {t('arena', 'attempts')}</span><span>{item.hardened ? t('replays', 'hardened') : t('arena', 'coreFix')}</span><span>{item.timeLeft}{t('replays', 'timeLeftSuffix')}</span></div>
              <div className="replay-bottom"><span>{item.events?.filter((event) => event.type === 'test_run').length || 0} {t('replays', 'testRuns')} · {item.events?.filter((event) => event.type === 'hardening_run').length || 0} {t('replays', 'hardeningRuns')}</span><button type="button" onClick={() => setSelectedId(item.id)}>{t('replays', 'viewReplay')} →</button></div>
            </article>
          })}
        </section>
      ) : <section className="replay-empty"><strong>{t('replays', 'emptyTitle')}</strong><p>{t('replays', 'emptyBody')}</p><Link to="/challenges">{t('replays', 'browseChallenges')} →</Link></section>}
      {selected && <div className="replay-overlay" role="dialog" aria-modal="true" aria-label={t('replays', 'detailsAria')}>
        <div className="replay-viewer">
          <div className="replay-viewer-head"><div><span>{t('replays', 'timeline')}</span><h2>{selected.challengeTitle}</h2></div><button type="button" onClick={() => setSelectedId(null)}>{t('common', 'close')} ×</button></div>
          <div className="replay-timeline">{selected.events.map((event, index) => <div className="replay-event" key={`${event.at}-${index}`}><div className="replay-event-dot" /><div><strong>{event.type.replaceAll('_', ' ').toUpperCase()}</strong><span>{new Date(event.at).toLocaleTimeString()} · {Math.round((event.elapsedMs || 0) / 1000)}s</span></div>{event.payload?.passed !== undefined && <em>{event.payload.passed}/{event.payload.total} {t('replays', 'testsPassed')}</em>}</div>)}</div>
          {selected.code && <pre className="replay-code"><code>{selected.code}</code></pre>}
        </div>
      </div>}
    </div>
  )
}

export default Replays
