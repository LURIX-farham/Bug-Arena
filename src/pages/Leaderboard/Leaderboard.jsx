import { useEffect, useState } from 'react'
import { getCurrentPlayer } from '../../services/playerStore'
import { getLeaderboard, isLeaderboardLoaded, hydrateLeaderboardFromServer } from '../../services/leaderboardStore.js'
import { useI18n } from '../../i18n/useI18n'
import './Leaderboard.css'

function Leaderboard() {
  const { t } = useI18n()
  const [, setRevision] = useState(0)

  useEffect(() => {
    const refresh = () => setRevision((revision) => revision + 1)
    hydrateLeaderboardFromServer()
    window.addEventListener('bug-arena:leaderboard-updated', refresh)
    window.addEventListener('bug-arena:player-updated', refresh)
    window.addEventListener('bug-arena:server-stats', refresh)
    window.addEventListener('bug-arena:submission-updated', refresh)
    return () => {
      window.removeEventListener('bug-arena:leaderboard-updated', refresh)
      window.removeEventListener('bug-arena:player-updated', refresh)
      window.removeEventListener('bug-arena:server-stats', refresh)
      window.removeEventListener('bug-arena:submission-updated', refresh)
    }
  }, [])

  const me = getCurrentPlayer()
  const remote = getLeaderboard()

  // Server rows are the single source of truth. Local player is only appended
  // when the API list does not yet include them (e.g. brand-new account), and
  // even then we map from serverStats-backed getCurrentPlayer fields — never
  // from decorative / hardcoded data.
  const leaderboard = remote.length
    ? (remote.some((player) => player.id === me.id)
        ? remote.slice()
        : [...remote, {
            id: me.id,
            username: me.username,
            displayName: me.displayName,
            level: me.level,
            score: me.score,
            xp: me.xp,
            solved: me.solved,
            wins: me.wins || 0,
            losses: me.losses || 0,
          }])
    : [{
        id: me.id,
        username: me.username,
        displayName: me.displayName,
        level: me.level,
        score: me.score,
        xp: me.xp,
        solved: me.solved,
        wins: me.wins || 0,
        losses: me.losses || 0,
      }]

  // Rank primarily by score (challenge + duel points from DB), then XP.
  leaderboard.sort(
    (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)
      || (Number(b.xp) || 0) - (Number(a.xp) || 0),
  )
  const ranked = leaderboard.map((player, index) => ({ ...player, rank: index + 1 }))

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <div>
          <span className="leaderboard-eyebrow">{t('leaderboard', 'eyebrow')}</span>
          <h1>{t('nav', 'leaderboard')}</h1>
          <p>{t('leaderboard', 'description')}</p>
        </div>
        <div className="leaderboard-count">
          <span>{t('leaderboard', 'players')}</span>
          <strong>{ranked.length}</strong>
        </div>
      </div>
      <section className="leaderboard-table">
        <div className="leaderboard-table-head">
          <span>{t('home', 'rank')}</span>
          <span>{t('leaderboard', 'colPlayer')}</span>
          <span>{t('leaderboard', 'colLevel')}</span>
          <span>{t('profile', 'score')}</span>
          <span>{t('leaderboard', 'colXp')}</span>
          <span>{t('competitive', 'wl')}</span>
        </div>
        {ranked.map((player) => (
          <div
            key={player.id}
            className={`leaderboard-row ${player.id === me.id ? 'current-player' : ''}`}
          >
            <div className="leaderboard-rank">{String(player.rank).padStart(2, '0')}</div>
            <div className="leaderboard-player">
              <div className="player-avatar">
                {String(player.displayName || player.username || '?').charAt(0).toUpperCase()}
              </div>
              <div>
                <strong>{player.username}</strong>
                {player.id === me.id && <span>{t('leaderboard', 'you')}</span>}
              </div>
            </div>
            <div className="leaderboard-level">
              {t('leaderboard', 'lvl')} {player.level || 1}
            </div>
            {/* score = total_score + duel_points from player_statistics */}
            <div className="leaderboard-score">{Number(player.score) || 0}</div>
            {/* xp = challenge deltas + achievement rewards + duel xp */}
            <div className="leaderboard-xp">{Number(player.xp) || 0}</div>
            <div className="leaderboard-solved">
              {player.wins || 0} / {player.losses || 0}
            </div>
          </div>
        ))}
        {!isLeaderboardLoaded() && (
          <div className="profile-empty">{t('leaderboard', 'loading')}</div>
        )}
      </section>
    </div>
  )
}

export default Leaderboard
