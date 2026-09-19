import { useI18n } from '../../../i18n/useI18n'

function HowItWorks() {
  const { t } = useI18n()

  return (
    <section id="how-it-works" className="landing-section how-it-works">

      <div className="section-heading">
        <span className="section-number">{t('landing', 'howEyebrow')}</span>

        <h2>
          {t('landing', 'howTitle1')}
          <br />
          <span>{t('landing', 'howTitleAccent')}</span>
        </h2>

        <p>
          {t('landing', 'howDesc')}
        </p>
      </div>

      <div className="process">

        <article className="process-item">
          <div className="process-number">01</div>

          <div className="process-content">
            <span className="process-label">{t('landing', 'processInvestigateLabel')}</span>

            <h3>{t('landing', 'processFindTitle')}</h3>

            <p>
              {t('landing', 'processFindDesc')}
            </p>
          </div>
        </article>

        <article className="process-item">
          <div className="process-number">02</div>

          <div className="process-content">
            <span className="process-label">{t('landing', 'processRepairLabel')}</span>

            <h3>{t('landing', 'processFixTitle')}</h3>

            <p>
              {t('landing', 'processFixDesc')}
            </p>
          </div>
        </article>

        <article className="process-item">
          <div className="process-number">03</div>

          <div className="process-content">
            <span className="process-label">{t('landing', 'processCompeteLabel')}</span>

            <h3>{t('landing', 'processDominateTitle')}</h3>

            <p>
              {t('landing', 'processDominateDesc')}
            </p>
          </div>
        </article>

      </div>

    </section>
  )
}

export default HowItWorks
