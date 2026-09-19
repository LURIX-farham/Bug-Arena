import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getCompletedChallenges } from '../../services/submissionStore'
import { getCompetitiveStats, getCurrentSeason, getCompetitiveMatches, COMPETITIVE_MODES, COMPETITIVE_OPPONENTS } from '../../services/competitiveStore'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'
import './Competitive.css'

const MODE_KEYS = {
  ranked: 'rankedKicker',
  blitz: 'blitzKicker',
  survival: 'enduranceKicker',
}

function Competitive() {
  const { t, language } = useI18n()
  const stats = getCompetitiveStats()
  const season = getCurrentSeason()
  const matches = getCompetitiveMatches().slice(0, 5)
  const completed = getCompletedChallenges()
  const nextChallenge = getLocalizedChallenge(Object.values(challenges).find((challenge) => !completed.some((item) => Number(item.challengeId) === challenge.id)) || Object.values(challenges)[0], language)

  const startLink = (mode, opponentId) => `/arena/${nextChallenge.id}?mode=${mode}&opponent=${opponentId}`

  return (
    <div className="competitive-page">
      <header className="competitive-header">
        <div>
          <span className="competitive-eyebrow">{t('competitive', 'eyebrow')}</span>
          <h1>{t('competitive', 'title')}</h1>
          <p>{t('competitive', 'description')}</p>
        </div>
        <div className="season-card"><span>{t('competitive', 'season')}</span><strong>{season.id}</strong><small>{season.daysRemaining} {t('competitive', 'daysLeft')}</small></div>
      </header>

      <section className="competitive-stats">
        <div><span>{t('competitive', 'rating')}</span><strong>{stats.rating}</strong><small>{t('competitive', 'mmr')}</small></div>
        <div><span>{t('competitive', 'winRate')}</span><strong>{stats.winRate}%</strong><small>{stats.games} {t('competitive', 'matches')}</small></div>
        <div><span>{t('competitive', 'wl')}</span><strong>{stats.wins} / {stats.losses}</strong><small>{stats.draws} {t('competitive', 'draws')}</small></div>
        <div><span>{t('competitive', 'streak')}</span><strong>{stats.streak}</strong><small>{t('competitive', 'best')} {stats.bestStreak}</small></div>
      </section>

      <section className="mode-grid">
        <article className="mode-card active"><span className="mode-number">01</span><span className="mode-kicker">{t('competitive', 'rankedKicker')}</span><h2>{t('competitive', 'rankedTitle')}</h2><p>{t('competitive', 'rankedBody')}</p><Link to={startLink(COMPETITIVE_MODES.ranked.id, COMPETITIVE_OPPONENTS[2].id)} className="mode-action">{t('competitive', 'rankedAction')}</Link></article>
        <article className="mode-card"><span className="mode-number">02</span><span className="mode-kicker">{t('competitive', 'blitzKicker')}</span><h2>{t('competitive', 'blitzTitle')}</h2><p>{t('competitive', 'blitzBody')}</p><Link to={startLink(COMPETITIVE_MODES.blitz.id, COMPETITIVE_OPPONENTS[3].id)} className="mode-action">{t('competitive', 'blitzAction')}</Link></article>
        <article className="mode-card"><span className="mode-number">03</span><span className="mode-kicker">{t('competitive', 'enduranceKicker')}</span><h2>{t('competitive', 'survivalTitle')}</h2><p>{t('competitive', 'survivalBody')}</p><Link to={startLink(COMPETITIVE_MODES.survival.id, COMPETITIVE_OPPONENTS[4].id)} className="mode-action">{t('competitive', 'survivalAction')}</Link></article>
      </section>

      <section className="competitive-main-grid">
        <div className="competitive-panel">
          <div className="competitive-panel-head"><div><span>{t('competitive', 'rivalQueue')}</span><h2>{t('competitive', 'chooseOpponent')}</h2></div><strong>{nextChallenge.title}</strong></div>
          <div className="opponent-list">
            {COMPETITIVE_OPPONENTS.map((opponent) => (
              <div className="opponent-row" key={opponent.id}>
                <div className="opponent-avatar">{opponent.username[0]}</div>
                <div className="opponent-info"><strong>{opponent.username}</strong><span>{t('competitive', 'rating')} {opponent.rating} · {Math.round(opponent.solveRate * 100)}% {t('competitive', 'form')}</span></div>
                <span className="opponent-diff">{opponent.rating - stats.rating >= 0 ? '+' : ''}{opponent.rating - stats.rating}</span>
                <Link to={startLink(COMPETITIVE_MODES.ranked.id, opponent.id)} className="challenge-button">{t('competitive', 'fight')}</Link>
              </div>
            ))}
          </div>
        </div>

        <div className="competitive-panel match-history">
          <div className="competitive-panel-head"><div><span>{t('competitive', 'matchHistory')}</span><h2>{t('competitive', 'recentBattles')}</h2></div><Link to="/leaderboard">{t('nav', 'leaderboard')} →</Link></div>
          {matches.length ? matches.map((match) => (
            <div className="history-row" key={match.id}><span className={`history-result ${match.result}`}>{match.result === 'win' ? t('competitive', 'resultWin') : match.result === 'loss' ? t('competitive', 'resultLoss') : t('competitive', 'resultDraw')}</span><div><strong>{t('competitive', 'vs')} {match.opponentName}</strong><span>{match.challengeTitle} · {MODE_KEYS[match.mode?.toLowerCase()] ? t('competitive', MODE_KEYS[match.mode.toLowerCase()]) : match.mode}</span></div><strong className={match.ratingDelta >= 0 ? 'delta-positive' : 'delta-negative'}>{match.ratingDelta >= 0 ? '+' : ''}{match.ratingDelta}</strong></div>
          )) : <div className="history-empty">{t('competitive', 'historyEmpty')}</div>}
        </div>
      </section>
    </div>
  )
}

export default Competitive
