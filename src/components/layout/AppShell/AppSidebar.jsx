import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  House,
  Bug,
  Swords,
  Trophy,
  Play,
  User,
  Activity,
  Target,
  Award,
  Settings,
  PanelLeftClose,
} from 'lucide-react'
import { useI18n } from '../../../i18n/useI18n'
import { getCurrentPlayer } from '../../../services/playerStore'
import { getAuthUser } from '../../../services/authStore.js'
import { AnimatedCounter } from '../../reactbits'
import BrandLogo from '../../brand/BrandLogo'

const mainNavigation = [
  {
    label: 'Home',
    Icon: House,
    path: '/home',
  },
  {
    label: 'Challenges',
    Icon: Bug,
    path: '/challenges',
  },
  {
    label: 'Duel',
    Icon: Swords,
    path: '/duel',
  },
  {
    label: 'Leaderboard',
    Icon: Trophy,
    path: '/leaderboard',
  },
  {
    label: 'Replays',
    Icon: Play,
    path: '/replays',
  },
  {
    label: 'Profile',
    Icon: User,
    path: '/profile',
  },
  {
    label: 'Analytics',
    Icon: Activity,
    path: '/analytics',
  },
]

const secondaryNavigation = [
  {
    label: 'Tournaments',
    Icon: Target,
    path: '/tournaments',
  },
  {
    label: 'Achievements',
    Icon: Award,
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
  return <PanelLeftClose className="sidebar-collapse-icon" size={16} strokeWidth={1.75} aria-hidden="true" />
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

  const labels = { home: t('nav', 'home'), challenges: t('nav', 'challenges'), duel: t('nav', 'duelPage'), leaderboard: t('nav', 'leaderboard'), compete: t('nav', 'competePage'), replays: t('nav', 'replays'), profile: t('nav', 'profile'), analytics: t('nav', 'analytics'), tournaments: t('nav', 'tournaments'), achievements: t('nav', 'achievements'), admin: t('nav', 'admin') || 'Admin' }
  const main = mainNavigation.map((item) => ({ ...item, label: labels[item.label.toLowerCase()] || item.label }))
  const secondary = secondaryNavigation.map((item) => ({ ...item, label: labels[item.label.toLowerCase()] || item.label }))
  const authUser = getAuthUser()
  if (authUser?.isAdmin) {
    secondary.push({ label: labels.admin || 'Admin', Icon: Settings, path: '/admin' })
  }

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

        <span className="app-logo-full">
          <BrandLogo to="/home" size="md" className="app-logo" />
        </span>
        <span className="app-logo-mini" aria-hidden="true">
          <BrandLogo to="/home" size="sm" compact className="app-logo" />
        </span>

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
              <item.Icon aria-hidden="true" />
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
              <item.Icon aria-hidden="true" />
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

    </aside>
  )
}

export default AppSidebar
