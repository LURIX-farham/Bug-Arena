import { useI18n } from '../../../i18n/useI18n'

function ProductStats() {
  const { t } = useI18n()

  return (
    <section className="product-stats">
      <div className="stat-intro">
        <span>{t('landing', 'statsEyebrow')}</span>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <strong>{t('landing', 'statSolo')}</strong>
          <span>{t('landing', 'statSoloDesc')}</span>
        </div>

        <div className="stat-item">
          <strong>{t('landing', 'stat1v1')}</strong>
          <span>{t('landing', 'stat1v1Desc')}</span>
        </div>

        <div className="stat-item">
          <strong>{t('landing', 'statBoss')}</strong>
          <span>{t('landing', 'statBossDesc')}</span>
        </div>

        <div className="stat-item">
          <strong>{t('landing', 'statRanked')}</strong>
          <span>{t('landing', 'statRankedDesc')}</span>
        </div>
      </div>
    </section>
  )
}

export default ProductStats
