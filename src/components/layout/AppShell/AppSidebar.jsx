import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { useI18n } from '../../../i18n/useI18n'
import { getCurrentPlayer } from '../../../services/playerStore'
import { GradientText, ShinyText, AnimatedCounter } from '../../reactbits'

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

// Sidebar collapse preference survives reloads (pure UI preference —
// never touches business state).
const SIDEBAR_COLLAPSE_KEY = 'bugarena.sidebarCollapsed'

function readCollapsedPreference() {
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1'
  } catch {
    return false
  }
}

function writeCollapsedPreference(collapsed) {
  try {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0')
  } catch {
    /* storage unavailable — session-only state is fine */
  }
}

function AppSidebar() {
  const { t } = useI18n()
  const [collapsed, setCollapsed] = useState(readCollapsedPreference)
  const [setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false)

  const toggleCollapsed = () => {
    setCollapsed((current) => {
      const next = !current
      writeCollapsedPreference(next)
      return next
    })
  }

  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [setOnline])

  const labels = { home: t('nav', 'home'), challenges: t('nav', 'challenges'), duel: t('nav', 'duelPage'), leaderboard: t('nav', 'leaderboard'), compete: t('nav', 'competePage'), replays: t('nav', 'replays'), profile: t('nav', 'profile'), analytics: t('nav', 'analytics'), tournaments: t('nav', 'tournaments'), achievements: t('nav', 'achievements') }
  const main = mainNavigation.map((item) => ({ ...item, label: labels[item.label.toLowerCase()] || item.label }))
  const secondary = secondaryNavigation.map((item) => ({ ...item, label: labels[item.label.toLowerCase()] || item.label }))

  // Real player identity — same server-backed snapshot the topbar uses.
  const player = getCurrentPlayer()
  const levelProgress = player.levelProgress || {}
  const xpPercent = Math.max(0, Math.min(100, levelProgress.percent || 0))
  const online = typeof navigator === 'undefined' || navigator.onLine !== false

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>

      {/* Edge-mounted collapse toggle — straddles the sidebar border,
          so it never eats into the content width of either state. */}
      <button
        type="button"
        className="sidebar-collapse"
        onClick={toggleCollapsed}
        aria-label={collapsed ? t('nav', 'expandSidebar') : t('nav', 'collapseSidebar')}
        aria-expanded={!collapsed}
        title={collapsed ? t('nav', 'expandSidebar') : t('nav', 'collapseSidebar')}
      >
        <span className="sidebar-collapse-chevron" aria-hidden="true">❮</span>
      </button>

      <div className="sidebar-top">

        <Link
          to="/home"
          className="app-logo"
          aria-label="Bug Arena"
        >
          <span className="app-logo-full">
            
            <GradientText
              as="span"
              className="app-logo-arena"
              colors={['var(--accent)', 'var(--secondary)', 'var(--tertiary)']}
              animationSpeed={8}
              pauseOnHover
            >
              BUG<span>//</span>ARENA
            </GradientText>
            
          </span>

          {/* فقط در حالت جمع‌شده دیده می‌شود */}
          <span className="app-logo-mini" aria-hidden="true">
            B<span>//</span>A
          </span>
        </Link>

        <span className="sidebar-version">
          <ShinyText text="v1.9" speed={5.5} />
        </span>

      </div>

      <nav className="sidebar-navigation">

        <span className="sidebar-label">
          {t('nav', 'main')}
        </span>

        {main.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-link active'
                : 'sidebar-link'
            }
          >
            <span className="sidebar-index" aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>

            <span className="sidebar-icon" data-tip={item.label}>
              {item.icon}
            </span>

            <span className="sidebar-text">
              {item.label}
            </span>
          </NavLink>
        ))}

        <span className="sidebar-label secondary">
          {t('nav', 'compete')}
        </span>

        {secondary.map((item, index) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive
                ? 'sidebar-link active'
                : 'sidebar-link'
            }
          >
            <span className="sidebar-index" aria-hidden="true">
              {String(index + 8).padStart(2, '0')}
            </span>

            <span className="sidebar-icon" data-tip={item.label}>
              {item.icon}
            </span>

            <span className="sidebar-text">
              {item.label}
            </span>
          </NavLink>
        ))}

      </nav>

      {/* Live identity card — real player snapshot, mirrors the topbar. */}
      <Link to="/profile" className="sidebar-player" aria-label={t('nav', 'profile')}>
        <span className="sidebar-player-avatar" aria-hidden="true">
          {player.displayName.charAt(0).toUpperCase()}
        </span>

        <span className="sidebar-player-body">
          <strong className="sidebar-player-name">{player.displayName}</strong>
          <span className="sidebar-player-meta">
            {t('home', 'heroLevel')} {Number(player.level) || 1}
            <i aria-hidden="true">·</i>
            <AnimatedCounter
              as="b"
              value={player.score}
              duration={1.6}
            />
          </span>
          <span
            className="sidebar-player-xp"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={xpPercent}
          >
            <span className="sidebar-player-xp-fill" style={{ width: `${xpPercent}%` }} />
          </span>
        </span>

        <span className={`sidebar-player-state${online ? ' online' : ''}`} aria-hidden="true" />
      </Link>

      {/* <div className="sidebar-bottom">

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

      </div> */}

    </aside>
  )
}

export default AppSidebar