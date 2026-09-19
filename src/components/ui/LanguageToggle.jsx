import { useI18n } from '../../i18n/useI18n'

function LanguageToggle({ className = '' }) {
  const { language, setLanguage, t } = useI18n()
  const classes = ['language-toggle', className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="group" aria-label={t('language', 'interface')}>
      <button
        type="button"
        className={language === 'en' ? 'language-toggle-option active' : 'language-toggle-option'}
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        aria-label="English"
      >
        E
      </button>
      <span className="language-toggle-divider" aria-hidden="true" />
      <button
        type="button"
        className={language === 'fa' ? 'language-toggle-option active' : 'language-toggle-option'}
        onClick={() => setLanguage('fa')}
        aria-pressed={language === 'fa'}
        aria-label="Persian"
      >
        P
      </button>
    </div>
  )
}

export default LanguageToggle
