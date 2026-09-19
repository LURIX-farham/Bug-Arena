import { Link, useParams } from 'react-router-dom'

import './ChallengeDetails.css'

import { challenges } from '../../data/challenges'
import { getSubmission } from '../../services/submissionStore'
import { useI18n } from '../../i18n/useI18n'
import { getLocalizedChallenge } from '../../i18n/languageUtils'

function ChallengeDetails() {
  const { id } = useParams()
  const { t, language } = useI18n()

  const challenge = getLocalizedChallenge(challenges[id], language)
  const submission = challenge ? getSubmission(challenge.id) : null

  if (!challenge) {
    return (
      <div className="challenge-not-found">
        <h1>{t('challengeDetails', 'notFound')}</h1>

        <Link to="/challenges">
          {t('challengeDetails', 'back')}
        </Link>
      </div>
    )
  }

  return (
    <div className="challenge-details-page">

      {/* BACK */}

      <Link
        to="/challenges"
        className="details-back"
      >
        {t('challengeDetails', 'back')}
      </Link>


      {/* HEADER */}

      <section className="details-header">

        <div className="details-header-main">

          <div className="details-meta">

            <span>
              BUG #{challenge.id}
            </span>

            <span className={`details-live ${submission ? 'details-completed' : ''}`}>
              ● {submission ? t('challengeDetails', 'completed') : t('challengeDetails', 'available')}
            </span>

          </div>

          <h1>
            {challenge.title}
          </h1>

          <p>
            {challenge.description}
          </p>

        </div>


        <div className="details-action">

          <Link
            to={`/arena/${challenge.id}`}
            className="enter-arena-button"
          >
            {submission ? t('challengeDetails', 'replay') : t('challengeDetails', 'enter')}
            <span>→</span>
          </Link>

          <span className="action-hint">
            {t('challengeDetails', 'timeLimit')} {Math.floor(challenge.timeLimit / 60)} {t('challengeDetails', 'min')}
          </span>

        </div>

      </section>


      {/* MAIN INFO */}

      <section className="details-main-grid">

        {/* LEFT */}

        <div className="details-content">

          {/* {t('challengeDetails', 'challengeBrief')} */}

          <div className="details-panel">

            <div className="details-panel-header">

              <div>
                <span>
                  {t('challengeDetails', 'challengeBrief')}
                </span>

                <h2>
                  {t('challengeDetails', 'fixTheBug')}
                </h2>
              </div>

              <span className="brief-number">
                01
              </span>

            </div>


            <div className="brief-content">

              <p>
                {t('challengeDetails', 'brief1')}
              </p>

              <p>
                {t('challengeDetails', 'brief2')}
              </p>


              <div className="brief-warning">

                <span>
                  !
                </span>

                <div>

                  <strong>
                    {t('challengeDetails', 'fixCode')}
                  </strong>

                  <p>
                    {t('challengeDetails', 'automatedTests')}
                  </p>

                </div>

              </div>

            </div>

          </div>


          {/* HOW SCORING WORKS */}

          <div className="details-panel">

            <div className="details-panel-header">

              <div>

                <span>
                  {t('challengeDetails', 'scoring')}
                </span>

                <h2>
                  {t('challengeDetails', 'scoringTitle')}
                </h2>

              </div>

              <span className="brief-number">
                02
              </span>

            </div>


            <div className="skills-grid">

              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'coreFixLabel')}
                </strong>

                <span>
                  {t('challengeDetails', 'coreFixBody')}
                </span>

              </div>


              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'speedLabel')}
                </strong>

                <span>
                  {t('challengeDetails', 'speedBody')}
                </span>

              </div>


              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'attemptsLabel')}
                </strong>

                <span>
                  {t('challengeDetails', 'attemptsBody')}
                </span>

              </div>


              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'hardeningLabel')}
                </strong>

                <span>
                  {t('challengeDetails', 'hardeningBody')}
                </span>

              </div>

            </div>

          </div>


          {/* SKILLS */}

          <div className="details-panel">

            <div className="details-panel-header">

              <div>

                <span>
                  {t('challengeDetails', 'skills')}
                </span>

                <h2>
                  {t('challengeDetails', 'skillsTitle')}
                </h2>

              </div>

              <span className="brief-number">
                03
              </span>

            </div>


            <div className="skills-grid">

              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'debugging')}
                </strong>

                <span>
                  {t('challengeDetails', 'debuggingBody')}
                </span>

              </div>


              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'logic')}
                </strong>

                <span>
                  {t('challengeDetails', 'logicBody')}
                </span>

              </div>


              <div className="skill-item">

                <strong>
                  {challenge.language}
                </strong>

                <span>
                  {t('challengeDetails', 'pythonBody')}
                </span>

              </div>


              <div className="skill-item">

                <strong>
                  {t('challengeDetails', 'problemSolving')}
                </strong>

                <span>
                  {t('challengeDetails', 'problemSolvingBody')}
                </span>

              </div>

            </div>

          </div>


          {/* TAGS */}

          <div className="details-panel">

            <div className="details-panel-header">

              <div>

                <span>
                  {t('challengeDetails', 'tags')}
                </span>

                <h2>
                  {t('challengeDetails', 'tagsTitle')}
                </h2>

              </div>

              <span className="brief-number">
                04
              </span>

            </div>


            <div className="challenge-tags">

              {challenge.tags.map((tag) => (

                <span
                  key={tag}
                  className="challenge-tag"
                >
                  #{tag}
                </span>

              ))}

            </div>

          </div>

        </div>


        {/* RIGHT */}

        <aside className="details-sidebar">

          {/* STATS */}

          <div className="details-panel">

            <div className="details-panel-header">

              <div>

                <span>
                  {t('challengeDetails', 'data')}
                </span>

                <h2>
                  {t('challengeDetails', 'statsTitle')}
                </h2>

              </div>

            </div>


            <div className="detail-stat-list">

              <div>

                <span>
                  {t('challengeDetails', 'difficulty')}
                </span>

                <strong
                  className={
                    `difficulty-${challenge.difficulty.toLowerCase()}`
                  }
                >
                  {challenge.difficulty}
                </strong>

              </div>


              <div>

                <span>
                  {t('challengeDetails', 'language')}
                </span>

                <strong>
                  {challenge.language}
                </strong>

              </div>


              <div>

                <span>
                  {t('challengeDetails', 'points')}
                </span>

                <strong>
                  {challenge.baseScore}
                </strong>

              </div>


              <div>

                <span>
                  {t('challengeDetails', 'baseScore')}
                </span>

                <strong>
                  {challenge.baseScore}
                </strong>

              </div>


              <div>

                <span>
                  {t('challengeDetails', 'hardeningBonus')}
                </span>

                <strong className="success-rate">
                  +{challenge.hardeningBonus}
                </strong>

              </div>


              <div>

                <span>
                  {t('challengeDetails', 'timeLimit')}
                </span>

                <strong>
                  {Math.floor(challenge.timeLimit / 60)} {t('challengeDetails', 'min')}
                </strong>

              </div>

            </div>

          </div>


          {/* TESTS */}

          <div className="details-panel">

            <div className="details-panel-header">

              <div>

                <span>
                  {t('challengeDetails', 'evaluation')}
                </span>

                <h2>
                  {t('challengeDetails', 'coverageTitle')}
                </h2>

              </div>

            </div>


            <div className="detail-stat-list">

              <div>

                <span>
                  {t('challengeDetails', 'visibleTests')}
                </span>

                <strong>
                  {
                    challenge.evaluation.tests.filter(
                      (test) => test.type === 'core'
                    ).length
                  }
                </strong>

              </div>


              <div>

                <span>
                  {t('challengeDetails', 'hiddenTests')}
                </span>

                <strong>
                  {
                    challenge.evaluation.tests.filter(
                      (test) => test.type === 'hidden'
                    ).length
                  }
                </strong>

              </div>

            </div>

          </div>


          {/* WARNING */}

          <div className="details-side-warning">

            <span className="warning-icon">
              ◈
            </span>

            <div>

              <strong>
                {t('challengeDetails', 'readyTitle')}
              </strong>

              <p>
                {t('challengeDetails', 'readyBody')}
              </p>

            </div>

          </div>


          {/* HARDENING INFO */}

          <div className="details-side-warning">

            <span className="warning-icon">
              +
            </span>

            <div>

              <strong>
                {t('challengeDetails', 'optionalHardening')}
              </strong>

              <p>
                {t('challengeDetails', 'optionalHardeningBody')} +{challenge.hardeningBonus}
              </p>

            </div>

          </div>

        </aside>

      </section>

    </div>
  )
}

export default ChallengeDetails

