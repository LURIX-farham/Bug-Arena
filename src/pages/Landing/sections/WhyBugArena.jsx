import { useI18n } from '../../../i18n/useI18n'
import SpotlightCard from '../../../components/reactbits/SpotlightCard'

function WhyBugArena() {
  const { t } = useI18n()

  return (
    <section className="landing-section why-bug-arena">

      <div className="section-heading">
        <span className="section-number">{t('landing', 'whyEyebrow')}</span>

        <h2>
          {t('landing', 'whyTitle1')}
          <br />
          <span>{t('landing', 'whyTitleAccent')}</span>
        </h2>

        <p>
          {t('landing', 'whyDesc')}
        </p>
      </div>

      <div className="comparison">

        <SpotlightCard className="comparison-side traditional" spotlightColor="rgba(148, 163, 184, 0.15)">
          <div className="comparison-header">
            <span>{t('landing', 'comparisonTraditional')}</span>
            <span>01</span>
          </div>

          <div className="comparison-flow">
            <div>{t('landing', 'flowProblem')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowWriteCode')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowSubmit')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowDone')}</div>
          </div>
        </SpotlightCard>

        <div className="comparison-divider">
          {t('landing', 'comparisonVs')}
        </div>

        <SpotlightCard className="comparison-side arena" spotlightColor="rgba(99, 102, 241, 0.22)">
          <div className="comparison-header">
            <span>BUG//ARENA</span>
            <span>02</span>
          </div>

          <div className="comparison-flow">
            <div>{t('landing', 'flowBrokenCode')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowInvestigate')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowUnderstand')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowExperiment')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowDebug')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowTest')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowFix')}</div>
            <span>↓</span>
            <div>{t('landing', 'flowCompete')}</div>
          </div>
        </SpotlightCard>

      </div>

      <div className="why-statement">
        <span>{t('landing', 'whyIdeaLabel')}</span>

        <p>
          {t('landing', 'whyStatement1')}
          <strong> {t('landing', 'whyStatement2')}</strong>
        </p>
      </div>

    </section>
  )
}

export default WhyBugArena
