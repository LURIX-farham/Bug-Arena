import { useI18n } from '../../../i18n/useI18n'

const rankKeys = [
  'rankBronze',
  'rankSilver',
  'rankGold',
  'rankPlatinum',
  'rankDiamond',
  'rankMaster',
]

function CompetitiveSystem() {
  const { t } = useI18n()

  return (
    <section className="landing-section competitive-system">

      <div className="section-heading">
        <span className="section-number">
          {t('landing', 'progressionEyebrow')}
        </span>

        <h2>
          {t('landing', 'progressionTitle1')}
          <br />
          <span>{t('landing', 'progressionTitleAccent')}</span>
        </h2>

        <p>
          {t('landing', 'progressionDesc')}
        </p>
      </div>

      <div className="rank-system">

        <div className="rank-path">

          {rankKeys.map((rankKey, index) => (
            <div
              className={
                index === 5
                  ? 'rank-node current'
                  : 'rank-node'
              }
              key={rankKey}
            >
              <div className="rank-dot">
                {index + 1}
              </div>

              <span>{t('landing', rankKey)}</span>
            </div>
          ))}

        </div>

      </div>

      <div className="player-progress">

        <div className="rating-card">

          <span>{t('landing', 'currentRating')}</span>

          <strong>1842</strong>

          <div className="rating-change">
            <span>+27</span>
            <small>{t('landing', 'afterLastWin')}</small>
          </div>

        </div>

        <div className="progress-stats">

          <div>
            <span>{t('landing', 'bugsSolved')}</span>
            <strong>384</strong>
          </div>

          <div>
            <span>{t('landing', 'accuracy')}</span>
            <strong>73%</strong>
          </div>

          <div>
            <span>{t('landing', 'avgTime')}</span>
            <strong>04:21</strong>
          </div>

          <div>
            <span>{t('landing', 'winRate')}</span>
            <strong>68%</strong>
          </div>

        </div>

      </div>

    </section>
  )
}

export default CompetitiveSystem
