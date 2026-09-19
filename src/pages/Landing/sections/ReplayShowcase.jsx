import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

const stepKeys = [
  { time: '00:21', action: 'stepInspected', line: '14' },
  { time: '00:38', action: 'stepTestRun', line: '14' },
  { time: '01:12', action: 'stepEdited', line: '18' },
  { time: '01:31', action: 'stepTestPassed', line: '18' },
]

function ReplayShowcase() {
  const { t } = useI18n()
  const [activeStep, setActiveStep] = useState(2)

  const currentStep = stepKeys[activeStep]

  return (
    <section
      id="replays"
      className="landing-section replay-showcase"
    >

      <div className="section-heading">
        <span className="section-number">
          {t('landing', 'replaysEyebrow')}
        </span>

        <h2>
          {t('landing', 'replaysTitle1')}
          <br />
          <span>{t('landing', 'replaysTitleAccent')}</span>
        </h2>

        <p>
          {t('landing', 'replaysDesc')}
        </p>
      </div>

      <div className="replay-card">

        <div className="replay-editor">

          <div className="replay-header">

            <div className="editor-dots">
              <span />
              <span />
              <span />
            </div>

            <span>{t('landing', 'replayHeader')}</span>

            <span>02:41</span>

          </div>

          <div className="replay-code">

            <div className="editor-line">
              <span>15</span>
              <code>
                if len(data) == 0:
              </code>
            </div>

            <div className="editor-line">
              <span>16</span>
              <code>
                &nbsp;&nbsp;&nbsp;&nbsp;return 0
              </code>
            </div>

            <div className="editor-line">
              <span>17</span>
              <code>
                total = sum(data)
              </code>
            </div>

            <div
              className={
                currentStep.line === '18'
                  ? 'editor-line active'
                  : 'editor-line'
              }
            >
              <span>18</span>
              <code>
                return total / len(data)
              </code>
            </div>

            <div className="editor-line">
              <span>19</span>
              <code>
                # solution
              </code>
            </div>

          </div>

        </div>

        <div className="replay-timeline">

          <div className="timeline-top">
            <span>{t('landing', 'debuggingSession')}</span>
            <span>{t('landing', 'replayPlayer')} ALEX</span>
          </div>

          <div className="timeline">

            {stepKeys.map((step, index) => (
              <button
                key={step.time}
                className={
                  index === activeStep
                    ? 'timeline-step active'
                    : 'timeline-step'
                }
                onClick={() => setActiveStep(index)}
              >
                <span className="timeline-dot" />

                <div>
                  <strong>{t('landing', step.action)}</strong>
                  <small>
                    {step.time} · {t('landing', 'lineLabel')} {step.line}
                  </small>
                </div>
              </button>
            ))}

          </div>

          <div className="timeline-current">

            <span>{t('landing', 'currentAction')}</span>

            <strong>
              {t('landing', currentStep.action)}
            </strong>

            <small>
              {currentStep.time} · {t('landing', 'lineLabel')} {currentStep.line}
            </small>

          </div>

          <Link
            to="/replays"
            className="replay-action"
          >
            {t('landing', 'replaysCta')}
            <span>→</span>
          </Link>

        </div>

      </div>

    </section>
  )
}

export default ReplayShowcase
