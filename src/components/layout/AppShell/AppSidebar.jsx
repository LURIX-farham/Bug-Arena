import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useI18n } from '../../../i18n/useI18n'

const mainNavigation = [
  {
    label: 'Home',
    icon: '⌂',
    path: '/home',
  },
  {
    label: 'Challenges',
    icon: '◈',
    path: '/challenges',
  },
  {
    label: 'Duel',
    icon: '⚔',
    path: '/duel',
  },
  {
    label: 'Leaderboard',
    icon: '◆',
    path: '/leaderboard',
  },
  {
    label: 'Replays',
    icon: '▷',
    path: '/replays',
  },
  {
    label: 'Profile',
    icon: '℗',
    path: '/profile',
  },
  {
    label: 'Analytics',
    icon: '⌁',
    path: '/analytics',
  },
]

const secondaryNavigation = [
  {
    label: 'Tournaments',
    icon: '◎',
    path: '/tournaments',
  },
  {
    label: 'Achievements',
    icon: '◇',
    path: '/achievements',
  },
]

function AppSidebar() {
  const { t } = useI18n()
  const [setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [setOnline])
  const labels = { home: t('nav', 'home'), challenges: t('nav', 'challenges'), duel: t('nav', 'duelPage'), leaderboard: t('nav', 'leaderboard'), compete: t('nav', 'competePage'), replays: t('nav', 'replays'), profile: t('nav', 'profile'), analytics: t('nav', 'analytics'), tournaments: t('nav', 'tournaments'), achievements: t('nav', 'achievements') }
  const main = mainNavigation.map((item) => ({ ...item, label: labels[item.label.toLowerCase()] || item.label }))
  const secondary = secondaryNavigation.map((item) => ({ ...item, label: labels[item.label.toLowerCase()] || item.label }))

  return (
    <aside className="app-sidebar">

      <div className="sidebar-top">

        <Link
          to="/home"
          className="app-logo"
        >
          BUG<span>//</span>ARENA
        </Link>

        <span className="sidebar-version">
          v1.1
        </span>

      </div>

      <nav className="sidebar-navigation">

        <span className="sidebar-label">
          {t('nav', 'main')}
        </span>

        {main.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-link active'
                : 'sidebar-link'
            }
          >
            <span className="sidebar-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </NavLink>
        ))}

        <span className="sidebar-label secondary">
          {t('nav', 'compete')}
        </span>

        {secondary.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-link active'
                : 'sidebar-link'
            }
          >
            <span className="sidebar-icon">
              {item.icon}
            </span>

            <span>
              {item.label}
            </span>
          </NavLink>
        ))}

      </nav>

      <div className="sidebar-bottom">

        <div className="sidebar-status">

          <span className="status-dot" />

          <div>
            <strong>
              {t('nav', 'systemOnline')}
            </strong>

            <small>
              {t('nav', 'allSystems')}
            </small>
          </div>

        </div>

        <NavLink
          to="/system"
          className="sidebar-settings"
        >
          ◌
          {t('nav', 'system')}
        </NavLink>

        <NavLink
          to="/settings"
          className="sidebar-settings"
        >
          ⚙
          {t('nav', 'settings')}
        </NavLink>

      </div>

    </aside>
  )
}

export default AppSidebar