import { getCurrentPlayer } from '../../services/playerStore'
import { getProgressionStats } from '../../services/progressionStore'
import { getCompletedChallenges } from '../../services/submissionStore'
import { getCompetitiveStats } from '../../services/competitiveStore'
import { getLeaderboard, isLeaderboardLoaded } from '../../services/leaderboardStore.js'
import { useI18n } from '../../i18n/useI18n'
import './Leaderboard.css'

function Leaderboard() {
  const { t } = useI18n()
  const currentPlayer = getCurrentPlayer()
  const progression = getProgressionStats(getCompletedChallenges())
  const competitive = getCompetitiveStats()
  const remote = getLeaderboard()
  const me = { ...currentPlayer, level: progression.level, rating: competitive.rating, wins: competitive.wins, losses: competitive.losses }
  const leaderboard = remote.length
    ? remote.map((player) => (player.id === me.id ? { ...player, ...me } : player))
    : [me]
  leaderboard.sort((a, b) => b.rating - a.rating || b.wins - a.wins || String(a.createdAt || '').localeCompare(String(b.createdAt || '')))
  const ranked = leaderboard.map((player, index) => ({ ...player, rank: index + 1 }))

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header"><div><span className="leaderboard-eyebrow">{t('leaderboard', 'eyebrow')}</span><h1>{t('nav', 'leaderboard')}</h1><p>{t('leaderboard', 'description')}</p></div><div className="leaderboard-count"><span>{t('leaderboard', 'players')}</span><strong>{ranked.length}</strong></div></div>
      <section className="leaderboard-table">
        <div className="leaderboard-table-head"><span>{t('home', 'rank')}</span><span>{t('leaderboard', 'colPlayer')}</span><span>{t('leaderboard', 'colLevel')}</span><span>{t('competitive', 'rating')}</span><span>{t('competitive', 'wl')}</span></div>
        {ranked.map((player) => <div key={player.id} className={`leaderboard-row ${player.id === me.id ? 'current-player' : ''}`}>
          <div className="leaderboard-rank">{String(player.rank).padStart(2, '0')}</div>
          <div className="leaderboard-player"><div className="player-avatar">{String(player.displayName || player.username || '?').charAt(0).toUpperCase()}</div><div><strong>{player.username}</strong>{player.id === me.id && <span>{t('leaderboard', 'you')}</span>}</div></div>
          <div className="leaderboard-level">{t('leaderboard', 'lvl')} {player.level || 1}</div><div className="leaderboard-score">{player.rating || 1000}</div>
          <div className="leaderboard-solved">{player.wins || 0} / {player.losses || 0}</div>
        </div>)}
        {!isLeaderboardLoaded() && <div className="profile-empty">{t('leaderboard', 'loading')}</div>}
      </section>
    </div>
  )
}
export default Leaderboard
