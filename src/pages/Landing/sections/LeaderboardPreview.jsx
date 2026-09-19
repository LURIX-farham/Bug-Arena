import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

const players = [
  { rank: '01', name: 'ALEX', rating: '2418', win: '82%' },
  { rank: '02', name: 'REZA', rating: '2371', win: '79%' },
  { rank: '03', name: 'SARAH', rating: '2314', win: '77%' },
  { rank: '04', name: 'AMIR', rating: '2287', win: '75%' },
]

function LeaderboardPreview() {
  const { t } = useI18n()

  return (
    <section
      id="leaderboard"
      className="landing-section leaderboard-preview"
    >

      <div className="section-heading">
        <span className="section-number">
          {t('landing', 'leaderboardEyebrow')}
        </span>

        <h2>
          {t('landing', 'leaderboardTitle1')}
          <br />
          <span>{t('landing', 'leaderboardTitleAccent')}</span>
        </h2>

        <p>
          {t('landing', 'leaderboardDesc')}
        </p>
      </div>

      <div className="leaderboard">

        <div className="leaderboard-header">
          <span>{t('landing', 'globalRanking')}</span>
          <span>{t('landing', 'season')}</span>
        </div>

        <div className="leaderboard-columns">
          <span>{t('landing', 'colRank')}</span>
          <span>{t('landing', 'colPlayer')}</span>
          <span>{t('landing', 'colRating')}</span>
          <span>{t('landing', 'colWinRate')}</span>
        </div>

        {players.map((player) => (
          <div
            className="leaderboard-row"
            key={player.rank}
          >
            <span className="player-rank">
              {player.rank}
            </span>

            <strong>{player.name}</strong>

            <span>{player.rating}</span>

            <span className="player-win">
              {player.win}
            </span>
          </div>
        ))}

        <div className="leaderboard-divider">
          <span>•••</span>
        </div>

        <div className="leaderboard-row current-player">
          <span className="player-rank">
            127
          </span>

          <strong>{t('landing', 'lbYou')}</strong>

          <span>1842</span>

          <span className="player-win">
            68%
          </span>
        </div>

        <div className="leaderboard-footer">
          <Link to="/leaderboard">
            {t('landing', 'viewFullLeaderboard')}
            <span>→</span>
          </Link>
        </div>

      </div>

    </section>
  )
}

export default LeaderboardPreview
