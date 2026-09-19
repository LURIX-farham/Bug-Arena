import { Link } from 'react-router-dom'

import { useI18n } from '../../../i18n/useI18n'

const TITLE_KEYS = {
  Tournaments: 'tournaments',
  Privacy: 'privacy',
  Terms: 'terms',
}

function ComingSoon({ title = 'Coming soon' }) {
  const { t } = useI18n()
  const heading = title && TITLE_KEYS[title]
    ? t('comingSoon', TITLE_KEYS[title])
    : t('comingSoon', 'defaultTitle')

  return (
    <div className="challenge-not-found">
      <span className="eyebrow">{t('comingSoon', 'eyebrow')}</span>
      <h1>{heading}</h1>
      <p>{t('comingSoon', 'body')}</p>
      <Link to="/home">{t('comingSoon', 'back')}</Link>
    </div>
  )
}

export default ComingSoon
