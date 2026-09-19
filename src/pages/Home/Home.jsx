import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getCurrentPlayer } from '../../services/playerStore'
import { getCompletedChallenges } from '../../services/submissionStore'
import { players } from '../../data/players'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'
import './Home.css'

function Home() {
  const { t, language } = useI18n()
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
  const chartPoints = scorePoints.length
    ? scorePoints.map((value, index) => {
        const x = scorePoints.length === 1 ? 250 : (index / (scorePoints.length - 1)) * 500
        const y = 140 - (value / chartMax) * 110
        return `${x},${y}`
      }).join(' ')
    : '0,140 500,140'

  const difficultyLabel = (d) => {
    if (!isFa) return d.toUpperCase()
    if (d === 'easy') return 'آسان'
    if (d === 'medium') return 'متوسط'
    if (d === 'hard') return 'سخت'
    return d.toUpperCase()
  }

  return (
    <div className="home-page">
      <section className="home-header">
        <div>
          <span className="home-eyebrow">{t('home', 'eyebrow')}</span>
          <h1>{t('home', 'welcome')}<span> {player.displayName}.</span></h1>
          <p>{t('home', 'welcomeBody')}</p>
        </div>
        <div className="home-header-actions">
          <Link to="/profile" className="secondary-action">{t('home', 'viewProfile')}</Link>
          <Link to="/duel" className="secondary-action duel-action">⚔ {t('home', 'duelCta')}</Link>
          <Link to={`/arena/${nextChallenge.id}`} className="primary-action">{t('home', 'startChallenge')}</Link>
        </div>
      </section>

      <section className="home-stats">
        <div className="stat-card"><span className="stat-label">{t('home', 'statsTotalScore')}</span><strong className="stat-value">{player.score}</strong><span className="stat-meta accent">{t('home', 'points')}</span></div>
        <div className="stat-card"><span className="stat-label">{t('home', 'statsSolved')}</span><strong className="stat-value">{player.solved}</strong><span className="stat-meta">{t('home', 'of')} {allChallenges.length}</span></div>
        <div className="stat-card"><span className="stat-label">{t('home', 'statsAttempts')}</span><strong className="stat-value">{player.attempts}</strong><span className="stat-meta">{t('home', 'totalRuns')}</span></div>
        <div className="stat-card"><span className="stat-label">{t('home', 'statsProgress')}</span><strong className="stat-value">{solvedPercent}%</strong><span className="stat-meta accent">{t('home', 'mvpTrack')}</span></div>
      </section>

      <section className="home-main-grid">
        <div className="home-panel active-challenge">
          <div className="panel-header"><div><span className="panel-eyebrow">{t('home', 'activeEyebrow')}</span><h2>{t('home', 'activeTitle')}</h2></div><span className="live-indicator">{t('home', 'ready')}</span></div>
          <div className="challenge-preview">
            <div className="challenge-top"><span className="challenge-id">{t('home', 'bugId')} #{nextChallenge.id}</span><span className="challenge-difficulty">{difficultyLabel(nextChallenge.difficulty)}</span></div>
            <h3>{nextChallenge.title}</h3><p>{nextChallenge.description}</p>
            <div className="challenge-tags"><span>{nextChallenge.language.toUpperCase()}</span><span>{nextChallenge.tags?.[1]?.toUpperCase() || t('home', 'logic')}</span><span>{Math.floor(nextChallenge.timeLimit / 60)} {t('home', 'min')}</span></div>
            <Link to={`/arena/${nextChallenge.id}`} className="challenge-start">{t('home', 'enterChallenge')} <span>→</span></Link>
          </div>
        </div>

        <div className="home-panel performance-panel">
          <div className="panel-header"><div><span className="panel-eyebrow">{t('home', 'progressEyebrow')}</span><h2>{t('home', 'progressTitle')}</h2></div><span className="panel-period">{t('home', 'mvp')}</span></div>
          <div className="rating-number"><strong>{player.score}</strong><span>{t('home', 'points')}</span></div>
          <div className="rating-chart"><div className="chart-grid"><span /><span /><span /><span /></div><svg viewBox="0 0 500 160" preserveAspectRatio="none"><polyline points={chartPoints} fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
          <div className="chart-labels"><span>{t('home', 'start')}</span><span>{scoreHistory.length ? `${scoreHistory.length} ${t('home', 'solved')}` : t('home', 'noData')}</span><span>{player.score} {t('home', 'points')}</span></div>
        </div>
      </section>

      <section className="home-panel matches-panel">
        <div className="panel-header"><div><span className="panel-eyebrow">{t('home', 'activityEyebrow')}</span><h2>{t('home', 'activityTitle')}</h2></div><Link to="/profile" className="panel-link">{t('home', 'viewAll')} →</Link></div>
        <div className="matches-list">
          {recent.length ? recent.map((item) => (
            <div className="match-row" key={`${item.challengeId}-${item.submittedAt}`}>
              <div className="match-result win">✓</div>
              <div className="match-info"><strong>{item.challengeTitle}</strong><span>{t('home', 'pythonLabel')}{challenges[item.challengeId]?.difficulty || t('home', 'challengeLabel')}</span></div>
              <span className="match-rating positive">+{item.score}</span>
              <span className="match-time">{new Date(item.submittedAt).toLocaleDateString(isFa ? 'fa-IR' : 'en-US')}</span>
            </div>
          )) : <div className="profile-empty"><strong>{t('home', 'noSubmissions')}</strong><p>{t('home', 'noSubmissionsBody')}</p></div>}
        </div>
      </section>

      <section className="home-bottom-grid">
        <div className="home-panel mini-panel"><div className="panel-header"><div><span className="panel-eyebrow">{t('home', 'rankingEyebrow')}</span><h2>{t('home', 'rankingTitle')}</h2></div><span className="rank-position">{t('home', 'rank')} #{String(playerRank).padStart(2, '0')}</span></div><div className="rank-progress"><div className="rank-track"><span style={{ width: `${Math.min(100, Math.max(4, solvedPercent))}%` }} /></div><div className="rank-info"><span>{player.score} {t('home', 'points')}</span><span>{player.solved} {t('home', 'solved')} · #{playerRank}</span></div></div></div>
        <div className="home-panel mini-panel recommended-panel"><div className="panel-header"><div><span className="panel-eyebrow">{t('home', 'forYouEyebrow')}</span><h2>{t('home', 'forYouTitle')}</h2></div><span className="recommend-icon">✦</span></div><div className="recommended-content"><div><strong>{nextChallenge.title}</strong><span>{nextChallenge.language} · {difficultyLabel(nextChallenge.difficulty)} · {Math.floor(nextChallenge.timeLimit / 60)} {t('home', 'min')}</span></div><Link to={`/arena/${nextChallenge.id}`}>→</Link></div></div>
      </section>
    </div>
  )
}
export default Home
