import { Link } from 'react-router-dom'

import { useI18n } from '../i18n/useI18n'

import './NotFound.css'

function NotFound() {
  const { t } = useI18n()

  return (
    <main className="not-found bp-grid">
      <span className="not-found-code" aria-hidden="true">404</span>
      <h1>{t('ux', 'pageNotFound')}</h1>
      <p>{t('ux', 'pageNotFoundBody')}</p>
      <Link className="not-found-link cut-corner-sm" to="/home">{t('ux', 'goHome')} →</Link>
    </main>
  )
}

export default NotFound
