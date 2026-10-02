import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, Link, useParams, useNavigate } from 'react-router-dom'
import { apiRequest } from '../../services/apiClient.js'
import { getAuthUser } from '../../services/authStore.js'
import './Admin.css'

const TABS = [
  { id: 'overview', label: 'Overview', icon: '◆' },
  { id: 'users', label: 'Users', icon: '●' },
  { id: 'challenges', label: 'Challenges', icon: '◈' },
  { id: 'submissions', label: 'Submissions', icon: '▷' },
  { id: 'duels', label: 'Duels', icon: '⚔' },
  { id: 'events', label: 'Events', icon: '⌁' },
  { id: 'system', label: 'System', icon: '⚙' },
]

function fmt(n) {
  return (Number(n) || 0).toLocaleString()
}

function Admin() {
  const authUser = getAuthUser()
  const isAdmin = Boolean(authUser?.isAdmin)

  const params = useParams()
  const navigate = useNavigate()
  const section = (params.section || 'overview').toLowerCase()
  const validTabs = new Set(TABS.map((t) => t.id))
  const tab = validTabs.has(section) ? section : 'overview'
  const setTab = (id) => navigate(id === 'overview' ? '/admin' : `/admin/${id}`)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [challenges, setChallenges] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [duels, setDuels] = useState([])
  const [events, setEvents] = useState([])
  const [system, setSystem] = useState(null)
  const [userQuery, setUserQuery] = useState('')
  const [userStatus, setUserStatus] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [editUser, setEditUser] = useState(null)
  const [editChallenge, setEditChallenge] = useState(null)
  const [saving, setSaving] = useState(false)

  const notify = (msg) => {
    setToast(msg)
    window.setTimeout(() => setToast(''), 2800)
  }

  const loadOverview = useCallback(async () => {
    setOverview(await apiRequest('/admin/overview'))
  }, [])
  const loadUsers = useCallback(async () => {
    const q = new URLSearchParams()
    if (userQuery) q.set('q', userQuery)
    if (userStatus) q.set('status', userStatus)
    q.set('limit', '100')
    const data = await apiRequest(`/admin/users?${q}`)
    setUsers(data.users || [])
  }, [userQuery, userStatus])
  const loadChallenges = useCallback(async () => {
    const data = await apiRequest('/admin/challenges')
    setChallenges(data.challenges || [])
  }, [])
  const loadSubmissions = useCallback(async () => {
    const q = subStatus ? `?status=${encodeURIComponent(subStatus)}&limit=80` : '?limit=80'
    const data = await apiRequest(`/admin/submissions${q}`)
    setSubmissions(data.submissions || [])
  }, [subStatus])
  const loadDuels = useCallback(async () => {
    const data = await apiRequest('/admin/duels?limit=50')
    setDuels(data.duels || [])
  }, [])
  const loadEvents = useCallback(async () => {
    const data = await apiRequest('/admin/events?limit=60')
    setEvents(data.events || [])
  }, [])
  const loadSystem = useCallback(async () => {
    setSystem(await apiRequest('/admin/system'))
  }, [])

  useEffect(() => {
    if (!isAdmin) return undefined
    let alive = true

    ;(async () => {
      try {
        if (tab === 'overview') await loadOverview()
        if (tab === 'users') await loadUsers()
        if (tab === 'challenges') await loadChallenges()
        if (tab === 'submissions') await loadSubmissions()
        if (tab === 'duels') await loadDuels()
        if (tab === 'events') await loadEvents()
        if (tab === 'system') await loadSystem()
      } catch (err) {
        if (alive) setError(err?.message || err?.code || 'Failed to load')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [isAdmin, tab, loadOverview, loadUsers, loadChallenges, loadSubmissions, loadDuels, loadEvents, loadSystem])

  const patchUser = async (id, body) => {
    setSaving(true)
    setError('')
    try {
      await apiRequest(`/admin/users/${id}`, { method: 'POST', body: JSON.stringify(body) })
      notify('User updated')
      setEditUser(null)
      await loadUsers()
      if (tab === 'overview') await loadOverview()
    } catch (err) {
      setError(err?.message || err?.code || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const toggleChallenge = async (id, isActive) => {
    try {
      await apiRequest(`/admin/challenges/${id}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ isActive: !isActive }),
      })
      notify(isActive ? 'Challenge disabled' : 'Challenge enabled')
      await loadChallenges()
    } catch (err) {
      setError(err?.message || 'Toggle failed')
    }
  }

  const saveChallenge = async (id, body) => {
    setSaving(true)
    try {
      await apiRequest(`/admin/challenges/${id}`, { method: 'POST', body: JSON.stringify(body) })
      notify('Challenge saved')
      setEditChallenge(null)
      await loadChallenges()
    } catch (err) {
      setError(err?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const cancelDuel = async (id) => {
    try {
      await apiRequest(`/admin/duels/${id}/cancel`, { method: 'POST', body: '{}' })
      notify('Duel cancelled')
      await loadDuels()
    } catch (err) {
      setError(err?.message || 'Cancel failed')
    }
  }

  const stats = overview?.stats || {}
  const statCards = useMemo(() => [
    { label: 'Users', value: stats.users, sub: `${stats.activeUsers ?? 0} active` },
    { label: 'Banned', value: stats.bannedUsers, sub: `${stats.admins ?? 0} admins` },
    { label: 'Challenges', value: stats.challenges, sub: `${stats.activeChallenges ?? 0} live` },
    { label: 'Submissions', value: stats.submissions, sub: `${stats.acceptedSubmissions ?? 0} accepted` },
    { label: 'Duels', value: stats.duels, sub: `${stats.activeDuels ?? 0} active` },
    { label: 'Events 24h', value: stats.events24h, sub: `${stats.replays ?? 0} replays` },
  ], [stats])

  if (!authUser) return <Navigate to="/login" replace />
  if (!isAdmin) {
    return (
      <div className="admin-page">
        <div className="admin-forbidden">
          <strong>403</strong>
          <p>This panel is only for platform admins.</p>
          <Link to="/home">Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">CONTROL PLANE</span>
          <h1>Admin Dashboard</h1>
          <p>
            Signed in as <strong>{authUser.username}</strong>
            {overview?.serverTime ? ` · server ${new Date(overview.serverTime).toLocaleString()}` : ''}
          </p>
        </div>
        <button type="button" className="admin-btn" onClick={() => {
          setTab(tab)
          setLoading(true)
          // re-trigger effect by forcing reload
          if (tab === 'overview') loadOverview().finally(() => setLoading(false))
          if (tab === 'users') loadUsers().finally(() => setLoading(false))
          if (tab === 'challenges') loadChallenges().finally(() => setLoading(false))
          if (tab === 'submissions') loadSubmissions().finally(() => setLoading(false))
          if (tab === 'duels') loadDuels().finally(() => setLoading(false))
          if (tab === 'events') loadEvents().finally(() => setLoading(false))
          if (tab === 'system') loadSystem().finally(() => setLoading(false))
        }}>
          Refresh
        </button>
      </header>

      <nav className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`admin-tab${tab === item.id ? ' active' : ''}`}
            onClick={() => setTab(item.id)}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      {toast && <div className="admin-toast">{toast}</div>}
      {error && <div className="admin-error">{error}</div>}
      {loading && <div className="admin-loading">Loading…</div>}

      {!loading && tab === 'overview' && (
        <>
          <div className="admin-stats">
            {statCards.map((s) => (
              <div className="admin-stat" key={s.label}>
                <span>{s.label}</span>
                <strong>{fmt(s.value)}</strong>
                <small>{s.sub}</small>
              </div>
            ))}
          </div>

          <div className="admin-grid-2">
            <section className="admin-panel">
              <div className="admin-panel-head"><h2>Top players</h2></div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>#</th><th>Player</th><th>Score</th><th>XP</th><th>Lvl</th></tr>
                  </thead>
                  <tbody>
                    {(overview?.topPlayers || []).map((p, i) => (
                      <tr key={p.username}>
                        <td>{i + 1}</td>
                        <td><strong>{p.username}</strong></td>
                        <td>{fmt(p.score)}</td>
                        <td>{fmt(p.xp)}</td>
                        <td>{p.level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel-head"><h2>Challenge difficulty</h2></div>
              <div className="admin-diff-list">
                {(overview?.difficultyBreakdown || []).map((d) => (
                  <div className="admin-diff-row" key={d.difficulty}>
                    <strong>{d.difficulty}</strong>
                    <span>{d.active} / {d.total} active</span>
                    <div className="admin-diff-bar">
                      <i style={{ width: `${Math.min(100, (Number(d.active) / Math.max(1, Number(d.total))) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="admin-panel">
            <div className="admin-panel-head"><h2>Recent users</h2></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>User</th><th>Status</th><th>Joined</th><th>Last active</th></tr>
                </thead>
                <tbody>
                  {(overview?.recentUsers || []).map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.username}</strong>
                        {u.isAdmin && <span className="admin-badge admin-badge--ok">admin</span>}
                      </td>
                      <td>
                        <span className={`admin-badge admin-badge--${u.status === 'active' ? 'ok' : 'danger'}`}>
                          {u.status}
                        </span>
                      </td>
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
                  <tr><th>User</th><th>Challenge</th><th>Status</th><th>Score</th><th>When</th></tr>
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
            <h2>Users ({users.length})</h2>
            <div className="admin-filters">
              <input
                className="admin-search"
                placeholder="Search username…"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <select className="admin-search" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="banned">Banned</option>
              </select>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Score</th>
                  <th>XP</th>
                  <th>Lvl</th>
                  <th>Solved</th>
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
                      <div className="admin-muted">{u.displayName}</div>
                    </td>
                    <td>{fmt(u.score)}</td>
                    <td>{fmt(u.xp)}</td>
                    <td>{u.level}</td>
                    <td>{u.solved}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${u.status === 'active' ? 'ok' : 'danger'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td>{u.isAdmin ? 'admin' : u.isBot ? 'bot' : 'user'}</td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" className="admin-btn" onClick={() => setEditUser({ ...u, newPassword: '' })}>
                          Edit
                        </button>
                        {u.status === 'active' ? (
                          <button type="button" className="admin-btn admin-btn--danger" onClick={() => patchUser(u.id, { status: 'banned' })}>
                            Ban
                          </button>
                        ) : (
                          <button type="button" className="admin-btn" onClick={() => patchUser(u.id, { status: 'active' })}>
                            Unban
                          </button>
                        )}
                        {!u.isAdmin && (
                          <button type="button" className="admin-btn" onClick={() => patchUser(u.id, { isAdmin: true })}>
                            Make admin
                          </button>
                        )}
                        {u.isAdmin && u.username !== authUser.username && (
                          <button type="button" className="admin-btn admin-btn--danger" onClick={() => patchUser(u.id, { isAdmin: false })}>
                            Revoke admin
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
          <div className="admin-panel-head"><h2>Challenges ({challenges.length})</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th>Type</th>
                  <th>Score</th>
                  <th>XP</th>
                  <th>Subs</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {challenges.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td><strong>{c.title}</strong><div className="admin-muted">{c.slug}</div></td>
                    <td>{c.difficulty}</td>
                    <td>{c.bugType}</td>
                    <td>{c.baseScore}</td>
                    <td>{c.xpReward}</td>
                    <td>{c.acceptedCount}/{c.submissionCount}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${c.isActive ? 'ok' : 'danger'}`}>
                        {c.isActive ? 'on' : 'off'}
                      </span>
                    </td>
                    <td>
                      <div className="admin-actions">
                        <button type="button" className="admin-btn" onClick={() => setEditChallenge({ ...c })}>Edit</button>
                        <button type="button" className="admin-btn" onClick={() => toggleChallenge(c.id, c.isActive)}>
                          {c.isActive ? 'Disable' : 'Enable'}
                        </button>
                        <Link className="admin-btn" to={`/challenges/${c.id}`}>Open</Link>
                      </div>
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
          <div className="admin-panel-head">
            <h2>Submissions</h2>
            <select className="admin-search" value={subStatus} onChange={(e) => setSubStatus(e.target.value)}>
              <option value="">All</option>
              <option value="accepted">Accepted</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>User</th><th>Challenge</th><th>Status</th><th>Score</th><th>When</th></tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.username}</strong></td>
                    <td>
                      <Link to={`/challenges/${s.challengeId}`}>{s.challengeTitle}</Link>
                    </td>
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
            {!submissions.length && <div className="admin-empty">No submissions</div>}
          </div>
        </section>
      )}

      {!loading && tab === 'duels' && (
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>Duels ({duels.length})</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>ID</th><th>Status</th><th>Created</th><th>Finished</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {duels.map((d) => (
                  <tr key={d.id}>
                    <td>{d.id}</td>
                    <td>
                      <span className={`admin-badge admin-badge--${d.status === 'active' || d.status === 'pending' ? 'warn' : 'ok'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td>{d.createdAt}</td>
                    <td>{d.finishedAt || '—'}</td>
                    <td>
                      {(d.status === 'pending' || d.status === 'active') && (
                        <button type="button" className="admin-btn admin-btn--danger" onClick={() => cancelDuel(d.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!duels.length && <div className="admin-empty">No duels recorded</div>}
          </div>
        </section>
      )}

      {!loading && tab === 'events' && (
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>Arena events</h2></div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>When</th><th>User</th><th>Type</th><th>Payload</th></tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.createdAt}</td>
                    <td>{e.username || '—'}</td>
                    <td><strong>{e.eventType}</strong></td>
                    <td className="admin-payload">{typeof e.payload === 'object' ? JSON.stringify(e.payload) : String(e.payload || '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!events.length && <div className="admin-empty">No events</div>}
          </div>
        </section>
      )}

      {!loading && tab === 'system' && system && (
        <section className="admin-panel">
          <div className="admin-panel-head"><h2>System health</h2></div>
          <div className="admin-system-grid">
            <div className="admin-stat"><span>PHP</span><strong>{system.php}</strong></div>
            <div className="admin-stat"><span>Database</span><strong>{system.database || '—'}</strong></div>
            <div className="admin-stat"><span>Timezone</span><strong>{system.timezone}</strong></div>
            <div className="admin-stat"><span>Server time</span><strong className="admin-stat-sm">{system.serverTime}</strong></div>
          </div>
          <div className="admin-table-wrap" style={{ marginTop: 16 }}>
            <table className="admin-table">
              <thead>
                <tr><th>Table</th><th>Present</th></tr>
              </thead>
              <tbody>
                {Object.entries(system.tables || {}).map(([name, ok]) => (
                  <tr key={name}>
                    <td><strong>{name}</strong></td>
                    <td>
                      <span className={`admin-badge admin-badge--${ok ? 'ok' : 'danger'}`}>
                        {ok ? 'yes' : 'missing'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {editUser && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="admin-panel-head">
              <h2>Edit {editUser.username}</h2>
              <button type="button" className="admin-btn" onClick={() => setEditUser(null)}>Close</button>
            </div>
            <div className="admin-form">
              <label>
                Display name
                <input
                  value={editUser.displayName || ''}
                  onChange={(e) => setEditUser({ ...editUser, displayName: e.target.value })}
                />
              </label>
              <label>
                XP
                <input
                  type="number"
                  value={editUser.xp ?? 0}
                  onChange={(e) => setEditUser({ ...editUser, xp: Number(e.target.value) })}
                />
              </label>
              <label>
                Total score
                <input
                  type="number"
                  value={editUser.totalScore ?? editUser.score ?? 0}
                  onChange={(e) => setEditUser({ ...editUser, totalScore: Number(e.target.value) })}
                />
              </label>
              <label>
                Level
                <input
                  type="number"
                  value={editUser.level ?? 1}
                  onChange={(e) => setEditUser({ ...editUser, level: Number(e.target.value) })}
                />
              </label>
              <label>
                Duel points
                <input
                  type="number"
                  value={editUser.duelPoints ?? 0}
                  onChange={(e) => setEditUser({ ...editUser, duelPoints: Number(e.target.value) })}
                />
              </label>
              <label>
                Rating
                <input
                  type="number"
                  value={editUser.rating ?? 1000}
                  onChange={(e) => setEditUser({ ...editUser, rating: Number(e.target.value) })}
                />
              </label>
              <label>
                New password (optional)
                <input
                  type="text"
                  value={editUser.newPassword || ''}
                  onChange={(e) => setEditUser({ ...editUser, newPassword: e.target.value })}
                  placeholder="Leave empty to keep"
                />
              </label>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={saving}
                onClick={() => patchUser(editUser.id, {
                  displayName: editUser.displayName,
                  xp: editUser.xp,
                  totalScore: editUser.totalScore ?? editUser.score,
                  level: editUser.level,
                  duelPoints: editUser.duelPoints,
                  rating: editUser.rating,
                  ...(editUser.newPassword ? { password: editUser.newPassword } : {}),
                })}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editChallenge && (
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="admin-panel-head">
              <h2>Edit challenge #{editChallenge.id}</h2>
              <button type="button" className="admin-btn" onClick={() => setEditChallenge(null)}>Close</button>
            </div>
            <div className="admin-form">
              <label>
                Title
                <input
                  value={editChallenge.title || ''}
                  onChange={(e) => setEditChallenge({ ...editChallenge, title: e.target.value })}
                />
              </label>
              <label>
                Difficulty
                <select
                  value={editChallenge.difficulty}
                  onChange={(e) => setEditChallenge({ ...editChallenge, difficulty: e.target.value })}
                >
                  {['Easy', 'Medium', 'Hard', 'Expert'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>
              <label>
                Base score
                <input
                  type="number"
                  value={editChallenge.baseScore ?? 0}
                  onChange={(e) => setEditChallenge({ ...editChallenge, baseScore: Number(e.target.value) })}
                />
              </label>
              <label>
                XP reward
                <input
                  type="number"
                  value={editChallenge.xpReward ?? 0}
                  onChange={(e) => setEditChallenge({ ...editChallenge, xpReward: Number(e.target.value) })}
                />
              </label>
              <button
                type="button"
                className="admin-btn admin-btn--primary"
                disabled={saving}
                onClick={() => saveChallenge(editChallenge.id, {
                  title: editChallenge.title,
                  difficulty: editChallenge.difficulty,
                  baseScore: editChallenge.baseScore,
                  xpReward: editChallenge.xpReward,
                })}
              >
                {saving ? 'Saving…' : 'Save challenge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Admin
