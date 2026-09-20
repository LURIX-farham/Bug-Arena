import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

const players = [
  { rank: '01', name: 'ALEX', xp: '12,480', win: '82%' },
  { rank: '02', name: 'REZA', xp: '11,290', win: '79%' },
  { rank: '03', name: 'SARAH', xp: '10,470', win: '77%' },
  { rank: '04', name: 'AMIR', xp: '9,860', win: '75%' },
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
          <span>{t('landing', 'colXp')}</span>
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

            <span>{player.xp}</span>

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

          <span>8,420</span>

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
