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

/* Panel-collapse glyph for the inline (expanded-state) trigger.
   stroke="currentColor" -> inherits theme colors; the RTL flip is
   handled in CSS (html[dir='rtl']) instead of utility classes. */
function SidebarCollapseIcon() {
  return (
    <svg
      className="sidebar-collapse-icon"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6 2V14M5.2 2H10.8C11.9201 2 12.4802 2 12.908 2.21799C13.2843 2.40973 13.5903 2.71569 13.782 3.09202C14 3.51984 14 4.0799 14 5.2V10.8C14 11.9201 14 12.4802 13.782 12.908C13.5903 13.2843 13.2843 13.5903 12.908 13.782C12.4802 14 11.9201 14 10.8 14H5.2C4.07989 14 3.51984 14 3.09202 13.782C2.71569 13.5903 2.40973 13.2843 2.21799 12.908C2 12.4802 2 11.9201 2 10.8V5.2C2 4.07989 2 3.51984 2.21799 3.09202C2.40973 2.71569 2.71569 2.40973 3.09202 2.21799C3.51984 2 4.0799 2 5.2 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.33"
      />
    </svg>
  )
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

      {/* Collapsed state only: the floating edge toggle comes back —
          it straddles the rail border and expands the sidebar again. */}
      {collapsed && (
        <button
          type="button"
          className="sidebar-collapse"
          onClick={toggleCollapsed}
          aria-label={t('nav', 'expandSidebar')}
          aria-expanded="false"
          title={t('nav', 'expandSidebar')}
        >
          <span className="sidebar-collapse-chevron" aria-hidden="true">❮</span>
        </button>
      )}

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

          <span className="app-logo-mini" aria-hidden="true">
            B<span>//</span>A
          </span>
        </Link>

        {/* Expanded state only: the inline panel-collapse trigger
            (SVG glyph) lives inside the sidebar, beside the version. */}
        {!collapsed && (
          <div className="sidebar-top-actions">
            

            <button
              type="button"
              className="sidebar-collapse-inline"
              onClick={toggleCollapsed}
              aria-label={t('nav', 'collapseSidebar')}
              aria-expanded="true"
              title={t('nav', 'collapseSidebar')}
            >
              <SidebarCollapseIcon />
            </button>
          </div>
        )}

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