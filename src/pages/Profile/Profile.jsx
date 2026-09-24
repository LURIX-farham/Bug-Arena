import { useEffect, useMemo, useState } from 'react'
import { getCurrentPlayer } from '../../services/playerStore'
import { getCompletedChallenges } from '../../services/submissionStore'
import { getProgressionStats } from '../../services/progressionStore'
import { useI18n } from '../../i18n/useI18n'
import {
  AnimatedCounter,
  AnimatedList,
  BlurText,
  DotGrid,
  GradientText,
  SpotlightCard,
} from '../../components/reactbits'
import { useTheme } from '../../theme/useTheme'
import useInViewOnce from '../../hooks/useInViewOnce'
import './Profile.css'

const RANK_KEYS = {
  'ROOKIE DEBUGGER': 'rankRookie',
  'BUG HUNTER': 'rankHunter',
  'CODE BREAKER': 'rankBreaker',
  'DEBUGGING ACE': 'rankAce',
  'ARENA VETERAN': 'rankVeteran',
  'BUG ARCHITECT': 'rankArchitect',
  'ARENA LEGEND': 'rankLegend',
}

function Profile() {
  const { t, language } = useI18n()
  const { isDark } = useTheme()
  const [submissions, setSubmissions] = useState([])
  const [player, setPlayer] = useState(getCurrentPlayer)

  useEffect(() => {
    const refresh = () => {
      setSubmissions(getCompletedChallenges())
      setPlayer(getCurrentPlayer())
    }

    refresh()
    window.addEventListener('bug-arena:submission-updated', refresh)
    window.addEventListener('bug-arena:player-updated', refresh)
    window.addEventListener('bug-arena:competitive-updated', refresh)
    window.addEventListener('bug-arena:server-stats', refresh)
    return () => {
      window.removeEventListener('bug-arena:submission-updated', refresh)
      window.removeEventListener('bug-arena:player-updated', refresh)
      window.removeEventListener('bug-arena:competitive-updated', refresh)
      window.removeEventListener('bug-arena:server-stats', refresh)
    }
  }, [])

  // XP/level/rank come from the player snapshot (server-authoritative);
  // activity stats are derived from the local submission list.
  const progression = useMemo(() => ({
    ...getProgressionStats(submissions),
    xp: player.xp,
    level: player.level,
    rank: player.rank,
    levelProgress: player.levelProgress,
  }), [submissions, player])

  const formatDate = (date) => {
    if (!date) return t('profile', 'unknown')
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return t('profile', 'unknown')
    return parsed.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const rankTitle = RANK_KEYS[progression.rank]
    ? t('profile', RANK_KEYS[progression.rank])
    : progression.rank

  const levelProgress = progression.levelProgress || {}
  const xpPercent = Math.max(0, Math.min(100, levelProgress.percent || 0))

  const [xpTrackRef, xpTrackInView] = useInViewOnce(0.3)

  // DotGrid palette — concrete colors for the canvas layer.
  const dotBase = isDark ? 'rgba(154, 161, 172, 0.16)' : 'rgba(71, 85, 105, 0.13)'
  const dotActive = isDark ? 'rgba(124, 255, 107, 0.7)' : 'rgba(37, 99, 235, 0.45)'

  const statCards = [
    { label: t('profile', 'totalXp'), value: progression.xp, tone: 'accent' },
    { label: t('profile', 'solvedChallenges'), value: progression.solved, tone: 'secondary' },
    { label: t('profile', 'hardened'), value: progression.hardened, tone: 'tertiary' },
    { label: t('profile', 'bestStreak'), value: progression.bestStreak, tone: 'success' },
    { label: t('profile', 'avgAttempts'), value: progression.averageAttempts, tone: 'warning' },
    { label: t('profile', 'avgScore'), value: progression.averageScore, tone: 'danger' },
    { label: t('profile', 'score'), value: player.score, tone: 'accent-strong' },
    { label: t('competitive', 'winRate'), value: player.winRate, formatValue: (n) => `${Math.round(n)}%`, tone: 'success-strong' },
  ]

  return (
    <div className="profile-page">

      {/* ============ HERO — IDENTITY FIELD ============ */}
      <section className="profile-hero" aria-labelledby="profile-hero-title">
        <div className="profile-hero-layers" aria-hidden="true">
          <DotGrid
            className="profile-hero-dots"
            gap={26}
            dotSize={1.4}
            baseColor={dotBase}
            activeColor={dotActive}
            proximity={120}
          />
          <div className="profile-hero-vignette" />
        </div>

        <div className="profile-hero-grid">
          <div className="profile-hero-copy">
            <BlurText
              as="span"
              className="profile-eyebrow"
              text={t('profile', 'eyebrow')}
              animateBy="words"
              delay={22}
              direction="bottom"
              stepDuration={0.2}
            />
            <h1 id="profile-hero-title">
              <GradientText
                as="span"
                colors={['var(--accent)', '#59f3c4', '#7c5cff']}
                animationSpeed={7}
                pauseOnHover
              >
                {player.displayName.toLowerCase()}
              </GradientText>
            </h1>
            <BlurText
              as="p"
              text={t('profile', 'tagline')}
              animateBy="words"
              delay={26}
              direction="bottom"
              stepDuration={0.3}
            />

            <span className="profile-hero-rank">
              <GradientText
                as="span"
                className="profile-hero-rank-title"
                colors={['var(--accent)', 'var(--secondary)', 'var(--tertiary)']}
                animationSpeed={9}
                pauseOnHover
              >
                {rankTitle}
              </GradientText>
            </span>
          </div>

          <SpotlightCard
            as="aside"
            className="profile-hero-card"
            spotlightColor="rgba(var(--accent-rgb), 0.16)"
            aria-label={t('profile', 'eyebrow')}
          >
            <div className="profile-hero-card-top">
              <span className="profile-hero-chip">
                {t('profile', 'lvl')}{' '}
                <AnimatedCounter
                  as="strong"
                  value={Number(progression.level) || 1}
                  duration={1.2}
                  delay={0.25}
                />
              </span>
              <span className="profile-hero-streak">
                <em aria-hidden="true">🔥</em>
                <AnimatedCounter
                  as="strong"
                  value={progression.streak}
                  duration={1.1}
                  delay={0.35}
                />
                <small>{progression.streak === 1 ? t('profile', 'day') : t('profile', 'days')}</small>
              </span>
            </div>

            <div className="profile-hero-xp">
              <div className="profile-hero-xp-meta">
                <strong>
                  <AnimatedCounter
                    value={player.score}
                    duration={1.6}
                    delay={0.2}
                  />
                  <small> {t('profile', 'xpTotal')}</small>
                </strong>
                <span>{t('profile', 'xpToNext').replace('{xp}', levelProgress.remainingXp ?? 0)}</span>
              </div>
              <div
                ref={xpTrackRef}
                className={`profile-hero-xp-track${xpTrackInView ? ' profile-hero-xp-track--live' : ''}`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={xpPercent}
                aria-label={t('profile', 'progressAria').replace('{percent}', xpPercent)}
              >
                <span className="profile-hero-xp-fill" style={{ width: `${xpPercent}%` }} />
              </div>
              <div className="profile-hero-xp-ends">
                <span>{levelProgress.currentXp ?? 0} XP</span>
                <span>{levelProgress.nextLevelXp ?? 0} XP</span>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* ============ STAT GRID ============ */}
      <section className="profile-stats" aria-label={t('profile', 'eyebrow')}>
        {statCards.map((stat) => (
          <SpotlightCard
            key={stat.label}
            className="profile-stat"
            data-tone={stat.tone}
            spotlightColor="rgba(var(--accent-rgb), 0.14)"
          >
            <span>{stat.label}</span>
            <strong>
              <AnimatedCounter
                value={Number(stat.value) || 0}
                duration={1.3}
                formatValue={stat.formatValue}
              />
            </strong>
          </SpotlightCard>
        ))}
      </section>

      {/* ============ HISTORY ============ */}
      <section className="profile-history">
        <div className="profile-section-header">
          <div><span>{t('profile', 'activity')}</span><h2>{t('profile', 'historyTitle')}</h2></div>
          <span className="history-count">
            <AnimatedCounter
              value={submissions.length}
              duration={1.2}
            />
            {' '}{t('profile', 'records')}
          </span>
        </div>

        {submissions.length > 0 ? (
          <AnimatedList className="submission-list" delay={70} initialDelay={140}>
            {submissions.slice().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).map((submission) => (
              <div className="submission-row" key={`${submission.challengeId}-${submission.submittedAt}`}>
                <div className="submission-status">✓</div>
                <div className="submission-main"><strong>{submission.challengeTitle}</strong><span>{t('profile', 'bugLabel')} #{submission.challengeId}</span></div>
                <div className="submission-rating"><span>{t('profile', 'score')}</span><strong>+{submission.score}</strong></div>
                <div className="submission-score"><span>{t('profile', 'xp')}</span><strong>{submission.score}</strong></div>
                <div className="submission-attempts"><span>{t('arena', 'attempts')}</span><strong>{submission.attempts}</strong></div>
                <div className="submission-hardening"><span>{t('arena', 'hardening')}</span><strong>{submission.hardened ? t('arena', 'yes') : t('arena', 'no')}</strong></div>
                <div className="submission-date">{formatDate(submission.submittedAt)}</div>
              </div>
            ))}
          </AnimatedList>
        ) : (
          <div className="profile-empty"><span>◌</span><strong>{t('profile', 'emptyTitle')}</strong><p>{t('profile', 'emptyBody')}</p></div>
        )}
      </section>
    </div>
  )
}

export default Profile
