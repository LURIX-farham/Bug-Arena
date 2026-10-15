import { NavLink } from 'react-router-dom'
import { House, Bug, Swords, Trophy, User } from 'lucide-react'
import { useI18n } from '../../../i18n/useI18n'

const navigation = [
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
    label: 'Ranks',
    Icon: Trophy,
    path: '/leaderboard',
  },
  {
    label: 'Profile',
    Icon: User,
    path: '/profile',
  },
]

function AppMobileNav() {
  const { t } = useI18n()
  const labels = {
    Home: t('nav', 'home'),
    Challenges: t('nav', 'challenges'),
    Duel: t('nav', 'duelPage'),
    Ranks: t('nav', 'leaderboard'),
    Profile: t('nav', 'profile'),
  }
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
            <item.Icon size={18} strokeWidth={1.75} aria-hidden="true" />
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
