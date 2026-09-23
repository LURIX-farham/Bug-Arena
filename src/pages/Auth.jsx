import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { getStoredPlayer } from '../services/playerStore'
import { loginAccount, registerAccount } from '../services/authStore.js'
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
    method_not_allowed: 'errMethodNotAllowed',
    payload_too_large: 'errPayloadTooLarge',
  }

  const messageKey = messageKeys[error]
  if (messageKey) return t('auth', messageKey)

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

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        await registerAccount({ username, displayName, password })
      } else {
        await loginAccount({ username, password })
      }
      await refreshDatabase()
      navigate('/home', { replace: true })
    } catch (requestError) {
      setError(authMessage(requestError?.data?.error || requestError?.message, t))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <span className="auth-eyebrow">{t('auth', 'eyebrow')}</span>
        <h1>{isRegister ? t('auth', 'registerTitle') : t('auth', 'loginTitle')}</h1>
        <p>{isRegister ? t('auth', 'registerBody') : t('auth', 'loginBody')}</p>
        <form onSubmit={submit}>
          <label>{t('auth', 'username')}<input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="programmer" autoComplete="username" required /></label>
          {isRegister && <label>{t('auth', 'displayName')}<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="PROGRAMMER" autoComplete="name" /></label>}
          <label>{t('auth', 'password')}<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={isRegister ? 'new-password' : 'current-password'} required minLength={8} /></label>
          {error && <div className="auth-error">{error}</div>}
          <Button type="submit" variant="brand" size="lg" disabled={loading}>
            {loading ? t('auth', 'connecting') : (isRegister ? t('auth', 'createAccount') : t('auth', 'signIn'))}
            <span className="vf-directional-arrow" aria-hidden="true">→</span>
          </Button>
        </form>
        <div className="auth-footer">{isRegister ? <>{t('auth', 'alreadyRegistered')} <Link to="/login">{t('auth', 'signInLink')}</Link></> : <>{t('auth', 'newHere')} <Link to="/register">{t('auth', 'createAccountLink')}</Link></>}</div>
      </div>
    </main>
  )
}
export default Auth
