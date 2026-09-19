import { useEffect, useState } from 'react'
import { getCurrentPlayer, savePlayer } from '../../services/playerStore'
import { useI18n } from '../../i18n/useI18n'
import { useTheme } from '../../theme/useTheme'
import './Settings.css'

function Settings() {
  const { t } = useI18n()
  const { setTheme, isDark, isLight } = useTheme()
  const [player, setPlayer] = useState(getCurrentPlayer)
  const [username, setUsername] = useState(player.username || '')
  const [displayName, setDisplayName] = useState(player.displayName || '')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const refresh = () => {
      const current = getCurrentPlayer()
      setPlayer(current)
      setUsername(current.username || '')
      setDisplayName(current.displayName || '')
    }
    window.addEventListener('bug-arena:player-updated', refresh)
    return () => window.removeEventListener('bug-arena:player-updated', refresh)
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    const ok = await savePlayer({ username, displayName })
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
      setPlayer(getCurrentPlayer())
    }
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <span className="settings-eyebrow">{t('settings', 'eyebrow')}</span>
        <h1>{t('settings', 'title')}</h1>
        <p>{t('settings', 'description')}</p>
      </header>

      <form className="settings-card account-settings-card" onSubmit={handleSave}>
        <div className="settings-card-copy">
          <span className="settings-label">{t('settings', 'accountLabel')}</span>
          <h2>{t('settings', 'accountTitle')}</h2>
          <p>{t('settings', 'accountDescription')}</p>
        </div>
        <div className="account-fields">
          <label>
            <span>{t('settings', 'username')}</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={20} autoComplete="username" />
          </label>
          <label>
            <span>{t('settings', 'displayName')}</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={24} autoComplete="nickname" />
          </label>
          <button className="settings-save-button" type="submit">
            {saved ? t('settings', 'savedAccount') : t('common', 'save')}
          </button>
        </div>
      </form>

      <section className="settings-card">
        <div className="settings-card-copy">
          <span className="settings-label">{t('theme', 'label')}</span>
          <h2>{t('theme', 'title')}</h2>
          <p>{t('theme', 'description')}</p>
        </div>
        <div className="theme-switcher" role="group" aria-label={t('theme', 'label')}>
          <button className={isDark ? 'theme-option active' : 'theme-option'} onClick={() => setTheme('dark')} type="button">
            <span className="theme-option-icon" aria-hidden="true">◐</span>
            <strong>{t('theme', 'dark')}</strong>
            <span>{t('theme', 'darkBody')}</span>
          </button>
          <button className={isLight ? 'theme-option active' : 'theme-option'} onClick={() => setTheme('light')} type="button">
            <span className="theme-option-icon" aria-hidden="true">☼</span>
            <strong>{t('theme', 'light')}</strong>
            <span>{t('theme', 'lightBody')}</span>
          </button>
        </div>
      </section>

      <section className="settings-card settings-card-muted account-meta-card">
        <div>
          <span className="settings-label">{t('settings', 'accountStatus')}</span>
          <h2>{player.displayName}</h2>
          <p>{player.username} · {player.rating} {t('competitive', 'rating')}</p>
        </div>
        <span className="settings-saved">{saved ? t('settings', 'savedAccount') : t('settings', 'accountReady')}</span>
      </section>
    </div>
  )
}

export default Settings
