import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { getStoredPlayer } from '../services/playerStore'
import { bootstrapAuth, loginAccount, registerAccount } from '../services/authStore.js'
import { useI18n } from '../i18n/useI18n'
import { refreshDatabase } from '../services/databaseSync.js'
import './Auth.css'
import Button from '../components/ui/vibefarsi/Button'

function authMessage(error, t) {
  const messageKeys = {
    invalid_credentials: 'errInvalidCredentials',
    username_taken: 'errUsernameTaken',
    invalid_username: 'errInvalidUsername',
    invalid_password: 'errInvalidPassword',
    database_unavailable: 'errDatabaseUnavailable',
    authentication_required: 'errAuthenticationRequired',
    api_unreachable: 'errApiUnreachable',
    api_timeout: 'errApiUnreachable',
    method_not_allowed: 'errMethodNotAllowed',
    payload_too_large: 'errPayloadTooLarge',
  }

  const messageKey = messageKeys[error]
  if (messageKey) return t('auth', messageKey)
  if (error === 'rate_limited') return t('ux', 'rateLimited')
  if (['csrf_failed', 'origin_not_allowed', 'unauthorized'].includes(error)) return t('ux', 'genericAuthError')
  // Network failures carry a long technical message; keep it readable.
  if (typeof error === 'string' && error.startsWith('Cannot reach')) return t('auth', 'errApiUnreachable')

  return `${t('auth', 'errFailedPrefix')}${error || t('auth', 'errUnknown')}`
}

function Auth() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const isRegister = location.pathname === '/register'
  const existing = getStoredPlayer()
  const [username, setUsername] = useState(isRegister ? '' : existing.username)
  const [displayName, setDisplayName] = useState(isRegister ? '' : existing.displayName)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const redirectTo = typeof location.state?.from?.pathname === 'string'
    ? `${location.state.from.pathname}${location.state.from.search || ''}`
    : '/home'

  // Already signed in? Skip the form.
  useEffect(() => {
    let active = true
    bootstrapAuth().then((user) => {
      if (active && user) navigate(user.isAdmin ? '/admin' : redirectTo, { replace: true })
    })
    return () => { active = false }
  }, [navigate, redirectTo])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      let user
      if (isRegister) {
        user = await registerAccount({ username, displayName, password })
      } else {
        user = await loginAccount({ username, password })
      }
      await refreshDatabase()
      // Admins land in the exclusive control plane, not the player arena.
      navigate(user?.isAdmin ? '/admin' : redirectTo, { replace: true })
    } catch (requestError) {
      setError(authMessage(requestError?.data?.error || requestError?.message, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page bp-grid">
      <div className="auth-card tick-frame">
        <span className="auth-eyebrow">{t('auth', 'eyebrow')}</span>
        <h1>{isRegister ? t('auth', 'registerTitle') : t('auth', 'loginTitle')}</h1>
        <p>{isRegister ? t('auth', 'registerBody') : t('auth', 'loginBody')}</p>
        <form onSubmit={submit}>
          <label>{t('auth', 'username')}<input className="field-input" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="programmer" autoComplete="username" autoCapitalize="none" spellCheck="false" minLength={3} maxLength={20} pattern="[A-Za-z0-9_\-]{3,20}" title={t('ux', 'usernameHint')} required />{isRegister && <small className="field-hint">{t('ux', 'usernameHint')}</small>}</label>
          {isRegister && <label>{t('auth', 'displayName')}<input className="field-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="PROGRAMMER" autoComplete="name" /></label>}
          <label>{t('auth', 'password')}
            <span className="password-field">
              <input className="field-input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} maxLength={200} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? t('ux', 'hidePassword') : t('ux', 'showPassword')} aria-pressed={showPassword}>
                {showPassword ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
              </button>
            </span>
            {isRegister && <small className="field-hint">{t('ux', 'passwordHint')}</small>}
          </label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <Button type="submit" variant="brand" size="lg" disabled={loading} aria-busy={loading} className="auth-submit cut-corner-sm">
            <span>{loading ? t('auth', 'connecting') : (isRegister ? t('auth', 'createAccount') : t('auth', 'signIn'))}</span>
            <ArrowRight size={16} strokeWidth={1.75} className="vf-directional-arrow" aria-hidden="true" />
          </Button>
        </form>
        <div className="auth-footer">{isRegister ? <>{t('auth', 'alreadyRegistered')} <Link to="/login">{t('auth', 'signInLink')}</Link></> : <>{t('auth', 'newHere')} <Link to="/register">{t('auth', 'createAccountLink')}</Link></>}</div>
      </div>
    </main>
  )
}
export default Auth
