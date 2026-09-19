import { NavLink } from 'react-router-dom'
import { useI18n } from '../../../i18n/useI18n'

const navigation = [
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
    label: 'Compete',
    icon: '⚔',
    path: '/compete',
  },
  {
    label: 'Duel',
    icon: '⚔',
    path: '/duel',
  },
  {
    label: 'Ranks',
    icon: '◆',
    path: '/leaderboard',
  },
  {
    label: 'Profile',
    icon: '●',
    path: '/profile',
  },
]

function AppMobileNav() {
  const { t } = useI18n()
  const labels = { Home: t('nav', 'home'), Challenges: t('nav', 'challenges'), Compete: t('nav', 'competePage'), Duel: t('nav', 'duelPage'), Ranks: t('nav', 'leaderboard'), Profile: t('nav', 'profile') }
  return (
    <nav className="app-mobile-nav">

      {navigation.map((item) => (
        <NavLink
          key={`${item.path}-${labels[item.label] || item.label}`}
          to={item.path}
          className={({ isActive }) =>
            isActive
              ? 'mobile-nav-link active'
              : 'mobile-nav-link'
          }
        >
          <span>
            {item.icon}
          </span>

          <small>
            {labels[item.label] || item.label}
          </small>
        </NavLink>
      ))}

    </nav>
  )
}

export default AppMobileNav