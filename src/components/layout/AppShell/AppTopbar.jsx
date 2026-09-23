import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Link } from 'react-router-dom'

import GlobalSearch from './GlobalSearch'
import { getCurrentPlayer, clearLocalPlayer } from '../../../services/playerStore.js'
import { logoutAccount } from '../../../services/authStore.js'
import { getCompletedChallenges } from '../../../services/submissionStore'
import { useI18n } from '../../../i18n/useI18n'
import ThemeToggle from '../../ui/ThemeToggle'
import LanguageToggle from '../../ui/LanguageToggle'
import { SpotlightCard, ShinyText, AnimatedCounter } from '../../reactbits'

function AppTopbar() {
  const { t } = useI18n()
  const [player, setPlayer] = useState(getCurrentPlayer)
  const [recentSubmissions, setRecentSubmissions] = useState(() =>
    getCompletedChallenges()
      .slice()
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 3),
  )
  const navigate = useNavigate()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.key === '/' &&
        !event.target.matches('input, textarea')
      ) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    const refresh = () => {
      setPlayer(getCurrentPlayer())
      setRecentSubmissions(
        getCompletedChallenges()
          .slice()
          .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
          .slice(0, 3),
      )
    }

    window.addEventListener('bug-arena:submission-updated', refresh)
    window.addEventListener('bug-arena:player-updated', refresh)

    return () => {
      window.removeEventListener('bug-arena:submission-updated', refresh)
      window.removeEventListener('bug-arena:player-updated', refresh)
    }
  }, [])

  return (
    <header className="app-topbar">

      <div className="topbar-left">

        <button
          type="button"
          className="search-trigger"
          onClick={() => setSearchOpen(true)}
        >
          <span>⌕</span>

          <span>
            {t('search', 'placeholder')}
          </span>

          <kbd>
            /
          </kbd>
        </button>

      </div>

      <div className="topbar-right">

        <div className="topbar-status">
          <span className="topbar-status-dot" />
          <ShinyText text={t('nav', 'systemOnline')} speed={3.4} />
        </div>

        <div className="notification-wrapper">

            <button
              type="button"
              className="notification-button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label={t('notifications', 'title')}
              aria-expanded={notificationsOpen}
            >
              ◇

              {recentSubmissions.length > 0 && (
                <span className="notification-count">
                  {recentSubmissions.length}
                </span>
              )}
            </button>

            {notificationsOpen && (
              <div className="notification-panel">

                <div className="notification-header">
                  <strong>{t('notifications', 'title')}</strong>
                  <span>{recentSubmissions.length} {t('notifications', 'recent')}</span>
                </div>

                {recentSubmissions.length > 0 ? recentSubmissions.map((submission) => (
                  <Link
                    key={`${submission.challengeId}-${submission.submittedAt}`}
                    to={`/challenges/${submission.challengeId}`}
                    className="notification-item"
                    onClick={() => setNotificationsOpen(false)}
                  >
                    <span className="notification-dot" />
                    <div>
                      <strong>{submission.challengeTitle}</strong>
                      <small>{t('notifications', 'score')} +{submission.score}</small>
                    </div>
                  </Link>
                )) : (
                  <div className="notification-item">
                    <span className="notification-dot" />
                    <div>
                      <strong>{t('notifications', 'noActivity')}</strong>
                      <small>{t('notifications', 'noActivityBody')}</small>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

        <LanguageToggle />

        <ThemeToggle
          aria-label={t('theme', 'toggle')}
        />

        <div className="user-menu-wrapper">

          <SpotlightCard
            as="button"
            type="button"
            className="topbar-profile"
            spotlightColor="rgba(var(--accent-rgb), 0.25)"
            onClick={() =>
              setUserMenuOpen(!userMenuOpen)
            }
          >
            <div className="profile-avatar">
              {player.displayName.charAt(0).toUpperCase()}
            </div>

            <div className="profile-info">

              <strong>
                {player.displayName}
              </strong>

              <span className="profile-info-score">
                <AnimatedCounter
                  value={player.score}
                  duration={1.5}
                  delay={0.2}
                />
              </span>

            </div>
          </SpotlightCard>

          {userMenuOpen && (
            <div className="user-menu">

              <div className="user-menu-header">
                <strong>
                  {player.displayName}
                </strong>

                <span>
                  SCORE {player.score}
                </span>
              </div>

              <Link
                to="/profile"
                onClick={() => setUserMenuOpen(false)}
              >
                <span>●</span>
                {t('nav', 'profile')}
              </Link>

              <Link
                to="/achievements"
                onClick={() => setUserMenuOpen(false)}
              >
                <span>◇</span>
                {t('nav', 'achievements')}
              </Link>

              <Link
                to="/settings"
                onClick={() => setUserMenuOpen(false)}
              >
                <span>⚙</span>
                {t('nav', 'settings')}
              </Link>

              <div className="user-menu-divider" />

              <button
                type="button"
                className="logout-button"
                onClick={async () => {
                  await logoutAccount()
                  clearLocalPlayer()
                  setUserMenuOpen(false)
                  navigate('/login', { replace: true })
                }}
              >
                <span>↪</span>
                {t('auth', 'signOut')}
              </button>

            </div>
          )}

        </div>

      </div>

      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />

    </header>
  )
}

export default AppTopbar