import { useEffect, useMemo, useState } from 'react'
import { getCurrentPlayer } from '../../services/playerStore'
import { getCompletedChallenges } from '../../services/submissionStore'
import { getProgressionStats } from '../../services/progressionStore'
import { useI18n } from '../../i18n/useI18n'
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
    return () => {
      window.removeEventListener('bug-arena:submission-updated', refresh)
      window.removeEventListener('bug-arena:player-updated', refresh)
      window.removeEventListener('bug-arena:competitive-updated', refresh)
    }
  }, [])

  const progression = useMemo(() => getProgressionStats(submissions), [submissions])

  const formatDate = (date) => {
    if (!date) return t('profile', 'unknown')
    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return t('profile', 'unknown')
    return parsed.toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div>
          <span className="profile-eyebrow">{t('profile', 'eyebrow')}</span>
          <h1>{player.displayName.toLowerCase()}</h1>
          <p>{t('profile', 'tagline')}</p>
        </div>
        <div className="profile-mark">{t('profile', 'lvl')} {progression.level}</div>
        <div className="profile-rating">
          <span>{RANK_KEYS[progression.rank] ? t('profile', RANK_KEYS[progression.rank]) : progression.rank}</span>
          <strong>{progression.xp}</strong>
          <small>{t('profile', 'xpTotal')}</small>
        </div>
      </div>

      <section className="profile-progress-panel">
        <div className="profile-progress-top">
          <div><span>{t('profile', 'level')} {progression.level}</span><strong>{t('profile', 'xpToNext').replace('{xp}', progression.levelProgress.remainingXp)}</strong></div>
          <div className="profile-streak"><span>{t('competitive', 'streak')}</span><strong>{progression.streak} {progression.streak === 1 ? t('profile', 'day') : t('profile', 'days')}</strong></div>
        </div>
        <div className="profile-progress-track" aria-label={t('profile', 'progressAria').replace('{percent}', progression.levelProgress.percent)}>
          <div style={{ width: `${progression.levelProgress.percent}%` }} />
        </div>
        <div className="profile-progress-meta">
          <span>{progression.levelProgress.currentXp} XP</span>
          <span>{progression.levelProgress.nextLevelXp} XP</span>
        </div>
      </section>

      <section className="profile-stats">
        <div className="profile-stat"><span>{t('profile', 'totalXp')}</span><strong>{progression.xp}</strong></div>
        <div className="profile-stat"><span>{t('profile', 'solvedChallenges')}</span><strong>{progression.solved}</strong></div>
        <div className="profile-stat"><span>{t('profile', 'hardened')}</span><strong>{progression.hardened}</strong></div>
        <div className="profile-stat"><span>{t('profile', 'bestStreak')}</span><strong>{progression.bestStreak} {t('profile', 'daysUnit')}</strong></div>
        <div className="profile-stat"><span>{t('profile', 'avgAttempts')}</span><strong>{progression.averageAttempts}</strong></div>
        <div className="profile-stat"><span>{t('profile', 'avgScore')}</span><strong>{progression.averageScore}</strong></div>
        <div className="profile-stat competitive-profile-stat"><span>{t('competitive', 'rating')}</span><strong>{player.rating}</strong></div>
        <div className="profile-stat competitive-profile-stat"><span>{t('competitive', 'winRate')}</span><strong>{player.winRate}%</strong></div>
      </section>

      <section className="profile-history">
        <div className="profile-section-header">
          <div><span>{t('profile', 'activity')}</span><h2>{t('profile', 'historyTitle')}</h2></div>
          <span className="history-count">{submissions.length} {t('profile', 'records')}</span>
        </div>

        {submissions.length > 0 ? (
          <div className="submission-list">
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
          </div>
        ) : (
          <div className="profile-empty"><span>◌</span><strong>{t('profile', 'emptyTitle')}</strong><p>{t('profile', 'emptyBody')}</p></div>
        )}
      </section>
    </div>
  )
}

export default Profile
