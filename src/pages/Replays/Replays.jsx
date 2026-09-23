import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getReplaySessions } from '../../services/replayStore'
import { useI18n } from '../../i18n/useI18n'
import {
  AnimatedCounter,
  AnimatedList,
  BlurText,
  GradientText,
  ShinyText,
  SpotlightCard,
} from '../../components/reactbits'
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

      {/* ============ HERO — RUN ARCHIVE ============ */}
      <header className="replays-header replays-hero">
        <div>
          <BlurText
            as="span"
            className="eyebrow"
            text={t('replays', 'eyebrow')}
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
              {t('replays', 'title')}
            </GradientText>
          </h1>
          <BlurText
            as="p"
            text={t('replays', 'description')}
            animateBy="words"
            delay={26}
            direction="bottom"
            stepDuration={0.3}
          />
        </div>
        <div className="replay-count">
          <span>{t('replays', 'recorded')}</span>
          <strong>
            <AnimatedCounter
              value={replays.length}
              duration={1.3}
            />
          </strong>
        </div>
      </header>

      {replays.length ? (
        <AnimatedList className="replay-list" delay={70} initialDelay={130}>
          {replays.map((item) => {
            const challenge = challenges[item.challengeId]
            return (
              <SpotlightCard
                as="article"
                className="replay-card"
                key={item.id}
                spotlightColor={item.status === 'completed' ? 'rgba(var(--accent-rgb), 0.16)' : 'rgba(var(--secondary-rgb), 0.12)'}
              >
                <div className="replay-top"><span>{t('challenges', 'bug')} #{item.challengeId}</span><span>{item.mode.toUpperCase()} · {challenge?.difficulty || item.difficulty}</span></div>
                <div className="replay-main"><div><h2>{item.challengeTitle}</h2><p>{new Date(item.startedAt).toLocaleString()} · {item.events?.length || 0} {t('replays', 'events')}</p></div><div className="replay-score"><span>{item.status === 'completed' ? t('arena', 'points') : t('arena', 'status')}</span><strong>{item.status === 'completed' ? <AnimatedCounter value={item.finalScore} duration={1.5} /> : <ShinyText text={t('replays', 'open')} speed={3.4} />}</strong></div></div>
                <div className="replay-metrics"><span>{item.attempts} {t('arena', 'attempts')}</span><span>{item.hardened ? t('replays', 'hardened') : t('arena', 'coreFix')}</span><span>{item.timeLeft}{t('replays', 'timeLeftSuffix')}</span></div>
                <div className="replay-bottom"><span>{item.events?.filter((event) => event.type === 'test_run').length || 0} {t('replays', 'testRuns')} · {item.events?.filter((event) => event.type === 'hardening_run').length || 0} {t('replays', 'hardeningRuns')}</span><button type="button" onClick={() => setSelectedId(item.id)}>{t('replays', 'viewReplay')} →</button></div>
              </SpotlightCard>
            )
          })}
        </AnimatedList>
      ) : <section className="replay-empty"><strong>{t('replays', 'emptyTitle')}</strong><p>{t('replays', 'emptyBody')}</p><Link to="/challenges">{t('replays', 'browseChallenges')} →</Link></section>}

      {selected && <div className="replay-overlay" role="dialog" aria-modal="true" aria-label={t('replays', 'detailsAria')}>
        <div className="replay-viewer">
          <div className="replay-viewer-head"><div><span>{t('replays', 'timeline')}</span><h2>{selected.challengeTitle}</h2></div><button type="button" onClick={() => setSelectedId(null)}>{t('common', 'close')} ×</button></div>
          <AnimatedList className="replay-timeline" delay={60} initialDelay={100}>
            {selected.events.map((event, index) => <div className="replay-event" key={`${event.at}-${index}`}><div className="replay-event-dot" /><div><strong>{event.type.replaceAll('_', ' ').toUpperCase()}</strong><span>{new Date(event.at).toLocaleTimeString()} · {Math.round((event.elapsedMs || 0) / 1000)}s</span></div>{event.payload?.passed !== undefined && <em>{event.payload.passed}/{event.payload.total} {t('replays', 'testsPassed')}</em>}</div>)}
          </AnimatedList>
          {selected.code && <pre className="replay-code"><code>{selected.code}</code></pre>}
        </div>
      </div>}
    </div>
  )
}

export default Replays
