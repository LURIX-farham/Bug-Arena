import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getAchievementProgress } from '../../services/achievementStore'
import { useI18n } from '../../i18n/useI18n'
import './Achievements.css'

function Achievements() {
  const { t } = useI18n()
  const items = getAchievementProgress(Object.keys(challenges).length)
  const unlocked = items.filter((item) => item.unlocked).length

  return (
    <div className="achievements-page">
      <header className="achievements-header">
        <div>
          <span className="eyebrow">{t('achievements', 'eyebrow')}</span>
          <h1>{t('nav', 'achievements')}</h1>
          <p>{t('achievements', 'description')}</p>
        </div>
        <div className="achievement-count"><span>{t('achievements', 'unlocked')}</span><strong>{unlocked}/{items.length}</strong></div>
      </header>
      <section className="achievement-grid">
        {items.map((item) => (
          <article className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`} key={item.id}>
            <div className="achievement-icon">{item.icon}</div>
            <div className="achievement-copy">
              <span>{item.unlocked ? t('achievements', 'unlocked') : t('achievements', 'locked')}</span>
              <h2>{t('achievements', item.id)}</h2>
              <p>{t('achievements', `${item.id}Body`)}</p>
            </div>
            <div className="achievement-state">{item.unlocked ? '✓' : '—'}</div>
          </article>
        ))}
      </section>
      <section className="achievement-footer-panel">
        <div><span>{t('achievements', 'keepGoing')}</span><h2>{t('achievements', 'footerTitle')}</h2></div>
        <Link to="/challenges">{t('achievements', 'browse')}</Link>
      </section>
    </div>
  )
}

export default Achievements
