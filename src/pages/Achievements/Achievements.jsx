import { Link } from 'react-router-dom'
import { challenges } from '../../data/challenges'
import { getAchievementProgress } from '../../services/achievementStore'
import { useI18n } from '../../i18n/useI18n'
import {
  AnimatedCounter,
  AnimatedList,
  BlurText,
  DotGrid,
  GradientText,
  Magnet,
  SpotlightCard,
  StarBorder,
} from '../../components/reactbits'
import { useTheme } from '../../theme/useTheme'
import './Achievements.css'

function Achievements() {
  const { t } = useI18n()
  const { isDark } = useTheme()
  const items = getAchievementProgress(Object.keys(challenges).length)
  const unlocked = items.filter((item) => item.unlocked).length
  const percent = items.length ? Math.round((unlocked / items.length) * 100) : 0

  // DotGrid palette — concrete colors for the canvas layer.
  const dotBase = isDark ? 'rgba(154, 161, 172, 0.16)' : 'rgba(71, 85, 105, 0.13)'
  const dotActive = isDark ? 'rgba(124, 255, 107, 0.7)' : 'rgba(37, 99, 235, 0.45)'

  return (
    <div className="achievements-page">

      {/* ============ HERO — PROGRESSION FIELD ============ */}
      <section className="achievements-hero" aria-labelledby="achievements-hero-title">
        <div className="achievements-hero-layers" aria-hidden="true">
          <DotGrid
            className="achievements-hero-dots"
            gap={24}
            dotSize={1.4}
            baseColor={dotBase}
            activeColor={dotActive}
            proximity={120}
          />
          <div className="achievements-hero-vignette" />
        </div>

        <header className="achievements-header">
          <div>
            <BlurText
              as="span"
              className="eyebrow"
              text={t('achievements', 'eyebrow')}
              animateBy="words"
              delay={22}
              direction="bottom"
              stepDuration={0.2}
            />
            <h1 id="achievements-hero-title">
              <GradientText
                as="span"
                colors={['var(--accent)', '#59f3c4', '#7c5cff']}
                animationSpeed={7}
                pauseOnHover
              >
                {t('nav', 'achievements')}
              </GradientText>
            </h1>
            <BlurText
              as="p"
              text={t('achievements', 'description')}
              animateBy="words"
              delay={26}
              direction="bottom"
              stepDuration={0.3}
            />
          </div>

          <div className="achievement-count">
            <span>{t('achievements', 'unlocked')}</span>
            <strong>
              <AnimatedCounter
                value={unlocked}
                duration={1.4}
              />
              <em className="achievement-count-sep">/</em>
              {items.length}
            </strong>
            <div
              className="achievement-count-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              aria-label={`${t('achievements', 'unlocked')} ${percent}%`}
            >
              <span className="achievement-count-fill" style={{ width: `${percent}%` }} />
            </div>
            <small className="achievement-count-meta">{percent}%</small>
          </div>
        </header>
      </section>

      {/* ============ TROPHY GRID ============ */}
      <AnimatedList className="achievement-grid" delay={60} initialDelay={120}>
        {items.map((item) => (
          <SpotlightCard
            as="article"
            key={item.id}
            className={`achievement-card ${item.unlocked ? 'unlocked' : 'locked'}`}
            spotlightColor={item.unlocked ? 'rgba(var(--accent-rgb), 0.18)' : 'rgba(var(--secondary-rgb), 0.08)'}
          >
            <div className="achievement-icon">{item.icon}</div>
            <div className="achievement-copy">
              <span>{item.unlocked ? t('achievements', 'unlocked') : t('achievements', 'locked')}</span>
              <h2>{t('achievements', item.id)}</h2>
              <p>{t('achievements', `${item.id}Body`)}</p>
            </div>
            <div className="achievement-state">{item.unlocked ? '✓' : '—'}</div>
          </SpotlightCard>
        ))}
      </AnimatedList>

      {/* ============ CTA BAND ============ */}
      <StarBorder
        className="achievement-footer-arena"
        speed={9}
        color="rgba(var(--accent-rgb), 0.8)"
        secondaryColor="rgba(var(--secondary-rgb), 0.4)"
      >
        <SpotlightCard as="section" className="achievement-footer-panel" spotlightColor="rgba(var(--accent-rgb), 0.1)">
          <div><span>{t('achievements', 'keepGoing')}</span><h2>{t('achievements', 'footerTitle')}</h2></div>
          <Magnet padding={22} magnetStrength={4} maxOffset={5}>
            <Link to="/challenges">{t('achievements', 'browse')}</Link>
          </Magnet>
        </SpotlightCard>
      </StarBorder>
    </div>
  )
}

export default Achievements
