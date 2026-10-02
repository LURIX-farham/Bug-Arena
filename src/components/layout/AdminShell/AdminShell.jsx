import { NavLink, Outlet, Navigate, Link, useNavigate } from 'react-router-dom'
import { getAuthUser, isAuthenticated, logoutAccount } from '../../../services/authStore.js'
import BrandLogo from '../../brand/BrandLogo'
import './AdminShell.css'

const NAV = [
  { to: '/admin', end: true, label: 'Overview', icon: '◆' },
  { to: '/admin/users', label: 'Users', icon: '●' },
  { to: '/admin/challenges', label: 'Challenges', icon: '◈' },
  { to: '/admin/submissions', label: 'Submissions', icon: '▷' },
  { to: '/admin/duels', label: 'Duels', icon: '⚔' },
  { to: '/admin/events', label: 'Events', icon: '⌁' },
  { to: '/admin/system', label: 'System', icon: '⚙' },
]

function AdminShell() {
  const navigate = useNavigate()
  const user = getAuthUser()

  if (!isAuthenticated()) return <Navigate to="/login" replace />
  if (!user?.isAdmin) {
    return (
      <div className="admin-shell-denied">
        <div>
          <strong>403 — Admin only</strong>
          <p>This control plane is not available for your account.</p>
          <Link to="/home">Return to player arena</Link>
        </div>
      </div>
    )
  }

  const signOut = async () => {
    await logoutAccount()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-shell-side">
        <div className="admin-shell-brand">
          <BrandLogo to="/admin" size="sm" className="admin-shell-logo" />
          <div>
            <strong>Control Plane</strong>
            <span>Bug Arena Admin</span>
          </div>
        </div>

        <nav className="admin-shell-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-shell-link${isActive ? ' active' : ''}`}
            >
              <span className="admin-shell-link-icon" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-shell-foot">
          <div className="admin-shell-user">
            <strong>{user.username}</strong>
            <span>Administrator</span>
          </div>
          <Link to="/home" className="admin-shell-exit">Player app →</Link>
          <button type="button" className="admin-shell-logout" onClick={signOut}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="admin-shell-main">
        <header className="admin-shell-top">
          <div>
            <span className="admin-shell-kicker">PLATFORM MANAGEMENT</span>
            <h1 className="admin-shell-title">Admin Console</h1>
          </div>
          <div className="admin-shell-top-actions">
            <span className="admin-shell-live">
              <i /> LIVE
            </span>
            <Link to="/home" className="admin-shell-chip">Arena</Link>
          </div>
        </header>

        <main className="admin-shell-content">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav for admin only */}
      <nav className="admin-shell-mobile-nav" aria-label="Admin sections">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `admin-shell-m-link${isActive ? ' active' : ''}`}
          >
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default AdminShell
