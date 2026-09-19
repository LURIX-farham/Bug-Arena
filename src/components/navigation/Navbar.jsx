import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useI18n } from '../../i18n/useI18n'
import ThemeToggle from '../ui/ThemeToggle'
import LanguageToggle from '../ui/LanguageToggle'

function Navbar() {
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }

    window.addEventListener('scroll', handleScroll)

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <header
      className={
        scrolled
          ? 'site-navbar scrolled'
          : 'site-navbar'
      }
    >
      <div className="navbar-inner">

        <Link to="/" className="navbar-logo">
          BUG<span>//</span>ARENA
        </Link>

        <nav
          className={
            mobileOpen
              ? 'navbar-links open'
              : 'navbar-links'
          }
        >
          <a href="#modes">{t('nav', 'home')}</a>
          <a href="#challenges">{t('nav', 'challenges')}</a>
          <a href="#leaderboard">{t('nav', 'leaderboard')}</a>
          <a href="#replays">{t('nav', 'replays')}</a>
        </nav>

        <div className="navbar-actions">

          <LanguageToggle />

          <ThemeToggle
            aria-label={t('theme', 'toggle')}
          />

          <Link
            to="/login"
            className="navbar-login"
          >
            {t('auth', 'login')}
          </Link>

          <Link
            to="/register"
            className="navbar-cta"
          >
            {t('auth', 'enterArena')}
          </Link>

          <button
            className="navbar-menu"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t('auth', 'toggleNavigation')}
          >
            <span />
            <span />
          </button>

        </div>

      </div>
    </header>
  )
}

export default Navbar
