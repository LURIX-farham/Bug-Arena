import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiRequest } from '../../services/apiClient.js'
import { getAuthUser } from '../../services/authStore.js'
import { useI18n } from '../../i18n/useI18n'
import './Admin.css'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'submissions', label: 'Submissions' },
]

function Admin() {
  const { t } = useI18n()
  const authUser = getAuthUser()
  const isAdmin = Boolean(authUser?.isAdmin)

  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [challenges, setChallenges] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [userQuery, setUserQuery] = useState('')

  const loadOverview = useCallback(async () => {
    const data = await apiRequest('/admin/overview')
    setOverview(data)
  }, [])

  const loadUsers = useCallback(async (q = '') => {
    const data = await apiRequest(`/admin/users?q=${encodeURIComponent(q)}&limit=80`)
    setUsers(data.users || [])
  }, [])

  const loadChallenges = useCallback(async () => {
    const data = await apiRequest('/admin/challenges')
    setChallenges(data.challenges || [])
  }, [])

  const loadSubmissions = useCallback(async () => {
    const data = await apiRequest('/admin/submissions?limit=50')
    setSubmissions(data.submissions || [])
  }, [])

  useEffect(() => {
    if (!isAdmin) return undefined
    let alive = true
    ;(async () => {
      try {
        if (tab === 'overview') await loadOverview()
        if (tab === 'users') await loadUsers(userQuery)
        if (tab === 'challenges') await loadChallenges()
        if (tab === 'submissions') await loadSubmissions()
      } catch (err) {
        if (alive) setError(err?.message || 'Failed to load admin data')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [isAdmin, tab, loadOverview, loadUsers, loadChallenges, loadSubmissions, userQuery])

  if (!authUser) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-forbidden">
          <strong>403</strong>
          <p>{t('admin', 'forbidden') || 'Admin access required.'}</p>
        </div>
      </div>
    )
  }

  const banUser = async (id, status) => {
    try {
      await apiRequest(`/admin/users/${id}`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      })
      await loadUsers(userQuery)
    } catch (err) {
      setError(err?.message || 'Update failed')
    }
  }

  const toggleChallenge = async (id, isActive) => {
    try {
      await apiRequest(`/admin/challenges/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ isActive: !isActive }),
      })
      await loadChallenges()
    } catch (err) {
      setError(err?.message || 'Toggle failed')
    }
  }

  const stats = overview?.stats || {}

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <h1>{t('admin', 'title') || 'Admin Dashboard'}</h1>
          <p>{t('admin', 'subtitle') || 'Manage users, challenges, submissions and platform health.'}</p>
        </div>
      </header>

      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-tab${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            {t('admin', item.id) || item.label}
          </button>
        ))}
      </div>

      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">{t('common', 'loading') || 'Loading…'}</div>}

      {!loading && tab === 'overview' && (
        <>
          <div className="admin-stats">
            <div className="admin-stat"><span>Users</span><strong>{stats.users ?? '—'}</strong></div>
            <div className="admin-stat"><span>Challenges</span><strong>{stats.challenges ?? '—'}</strong></div>
            <div className="admin-stat"><span>Submissions</span><strong>{stats.submissions ?? '—'}</strong></div>
            <div className="admin-stat"><span>Accepted</span><strong>{stats.acceptedSubmissions ?? '—'}</strong></div>
            <div className="admin-stat"><span>Duels</span><strong>{stats.duels ?? '—'}</strong></div>
            <div className="admin-stat"><span>Active Duels</span><strong>{stats.activeDuels ?? '—'}</strong></div>
          </div>

          <section className="admin-panel">
            <div className="admin-panel-head"><h2>Recent users</h2></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Joined</th>
                    <th>Last active</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentUsers || []).map((u) => (
                    <tr key={u.id}>
                      <td><strong>{u.username}</strong> · {u.displayName}</td>
                      <td>{u.createdAt}</td>
                      <td>{u.lastActiveAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head"><h2>Recent submissions</h2></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Challenge</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentSubmissions || []).map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.username}</strong></td>
                      <td>{s.challengeTitle}</td>
                      <td>
                        <span className={`admin-badge admin-badge--${s.status === 'accepted' ? 'ok' : 'warn'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>{s.score}</td>
                      <td>{s.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {!loading && tab === 'users' && (
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Users</h2>
            <input
              className="admin-search"
              placeholder="Search username…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Score</th>
                  <th>XP</th>
                  <th>Level</th>
                  <th>Status</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.username}</strong>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.displayName}</div>
                    </td>
                    <td>{u.score}</td>
                    <td>{u.xp}</td>
                    <td>{u.level}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${u.status === 'active' ? 'ok' : 'danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{u.isAdmin ? 'admin' : u.isBot ? 'bot' : 'user'}</td>
                    <td>
                      <div className="admin-actions">
                        {u.status === 'active' ? (
                          <button type="button" className="admin-btn admin-btn--danger" onClick={() => banUser(u.id, 'banned')}>
                            Ban
                          </button>
                        ) : (
                          <button type="button" className="admin-btn" onClick={() => banUser(u.id, 'active')}>
                            Unban
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!users.length && <div className="admin-empty">No users found</div>}
          </div>
        </section>
      )}

      {!loading && tab === 'challenges' && (
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>Challenges</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td><strong>{c.title}</strong></td>
                    <td>{c.difficulty}</td>
                    <td>{c.bugType}</td>
                    <td>{c.baseScore}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${c.isActive ? 'ok' : 'danger'}`}>
                        {c.isActive ? 'on' : 'off'}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="admin-btn" onClick={() => toggleChallenge(c.id, c.isActive)}>
                        {c.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === 'submissions' && (
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>Submissions</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Challenge</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.username}</strong></td>
                    <td>{s.challengeTitle}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${s.status === 'accepted' ? 'ok' : 'warn'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>{s.score}</td>
                    <td>{s.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!submissions.length && <div className="admin-empty">No submissions yet</div>}
          </div>
        </section>
      )}
    </div>
  )
}

export default Admin
