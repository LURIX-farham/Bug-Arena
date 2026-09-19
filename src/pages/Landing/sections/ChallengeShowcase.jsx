import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

function ChallengeShowcase() {
  const { t } = useI18n()

  const challengeStats = [
    {
      value: t('landing', 'challengeStatDifficultyValue'),
      label: t('landing', 'challengeStatDifficultyLabel'),
    },
    {
      value: '~08',
      label: t('landing', 'challengeStatMinutesLabel'),
    },
    {
      value: '+68',
      label: t('landing', 'challengeStatMaxRatingLabel'),
    },
  ]

  return (
    <section
      id="challenges"
      className="landing-section challenge-showcase"
    >

      <div className="section-heading">
        <span className="section-number">
          {t('landing', 'challengeEyebrow')}
        </span>

        <h2>
          {t('landing', 'challengeTitle1')}
          <br />
          <span>{t('landing', 'challengeTitleAccent')}</span>
        </h2>
      </div>

      <div className="challenge-card">

        <div className="challenge-info">

          <div className="challenge-top">

            <span className="challenge-id">
              {t('landing', 'challengeId')}
            </span>

            <span className="challenge-language">
              {t('landing', 'challengeLanguage')}
            </span>

          </div>

          <h3>{t('landing', 'challengeName')}</h3>

          <p>
            {t('landing', 'challengeDesc1')}
          </p>

          <p>
            {t('landing', 'challengeDesc2')}
          </p>

          <div className="challenge-stats">
            {challengeStats.map((stat) => (
              <div key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>

          <Link
            to="/challenges/1001"
            className="challenge-action"
          >
            {t('landing', 'challengeCta')}
            <span>→</span>
          </Link>

        </div>

        <div className="challenge-editor">

          <div className="editor-header">

            <div className="editor-dots">
              <span />
              <span />
              <span />
            </div>

            <span>broken_average.py</span>

            <span>{t('landing', 'challengeLanguage')}</span>

          </div>

          <div className="editor-code">

            <div className="editor-line">
              <span>01</span>
              <code>
                def calculate_average(data):
              </code>
            </div>

            <div className="editor-line">
              <span>02</span>
              <code>
                &nbsp;&nbsp;&nbsp;&nbsp;total = 0
              </code>
            </div>

            <div className="editor-line">
              <span>03</span>
              <code>
                &nbsp;&nbsp;&nbsp;&nbsp;for value in data:
              </code>
            </div>

            <div className="editor-line error">
              <span>04</span>
              <code>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;total += value
              </code>
            </div>

            <div className="editor-line">
              <span>05</span>
              <code>
                &nbsp;&nbsp;&nbsp;&nbsp;return total
              </code>
            </div>

          </div>

          <div className="editor-footer">

            <span className="editor-error">
              {t('landing', 'editorTestsFailed')}
            </span>

            <span>
              08:42
            </span>

          </div>

        </div>

      </div>

    </section>
  )
}

export default ChallengeShowcase
