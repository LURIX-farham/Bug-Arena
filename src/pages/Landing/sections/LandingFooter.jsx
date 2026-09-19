import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

function LandingFooter() {
  const { t } = useI18n()

  return (
    <>
      <section className="final-cta">

        <div className="final-cta-grid" />

        <div className="final-cta-content">

          <span>
            {t('landing', 'finalCtaEyebrow')}
          </span>

          <h2>
            {t('landing', 'finalCtaTitle1')}
            <br />
            {t('landing', 'finalCtaTitle2')}
          </h2>

          <p>
            {t('landing', 'finalCtaDesc')}
          </p>

          <Link
            to="/challenges"
            className="final-cta-button"
          >
            {t('landing', 'finalCtaButton')}
            <span>→</span>
          </Link>

        </div>

      </section>

      <footer className="landing-footer">

        <div className="footer-main">

          <div className="footer-brand">

            <Link
              to="/"
              className="footer-logo"
            >
              BUG<span>//</span>ARENA
            </Link>

            <p>
              {t('landing', 'heroTitle1')}
              <br />
              {t('landing', 'heroTitleAccent')}
              <br />
              {t('landing', 'heroTitle3')}
            </p>

          </div>

          <div className="footer-links">

            <div>
              <span>{t('landing', 'footerProduct')}</span>

              <Link to="/challenges">
                {t('landing', 'footerLinkChallenges')}
              </Link>

              <Link to="/arena">
                {t('landing', 'footerLinkArena')}
              </Link>

              <Link to="/replays">
                {t('landing', 'footerLinkReplays')}
              </Link>
            </div>

            <div>
              <span>{t('landing', 'footerCompete')}</span>

              <Link to="/leaderboard">
                {t('landing', 'footerLinkLeaderboard')}
              </Link>

              <Link to="/tournaments">
                {t('landing', 'footerLinkTournaments')}
              </Link>

              <Link to="/achievements">
                {t('landing', 'footerLinkAchievements')}
              </Link>
            </div>

            <div>
              <span>{t('landing', 'footerCommunity')}</span>

              <a href="#">
                {t('landing', 'footerLinkDiscord')}
              </a>

              <a href="#">
                {t('landing', 'footerLinkGitHub')}
              </a>

              <a href="#">
                {t('landing', 'footerLinkBlog')}
              </a>
            </div>

            <div>
              <span>{t('landing', 'footerLegal')}</span>

              <Link to="/privacy">
                {t('landing', 'footerLinkPrivacy')}
              </Link>

              <Link to="/terms">
                {t('landing', 'footerLinkTerms')}
              </Link>
            </div>

          </div>

        </div>

        <div className="footer-bottom">

          <span>
            {t('landing', 'footerCopyright')}
          </span>

          <span>
            {t('landing', 'footerBuiltFor')}
          </span>

          <span>
            {t('landing', 'footerStatus')}
          </span>

        </div>

      </footer>
    </>
  )
}

export default LandingFooter
