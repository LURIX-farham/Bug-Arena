import { useTheme } from '../../theme/useTheme'
import { useI18n } from '../../i18n/useI18n'

/**
 * Compact icon button that toggles between dark and light themes.
 * Renders a sun when the current theme is dark (action: switch to light)
 * and a moon when the current theme is light (action: switch to dark).
 *
 * Props:
 *  - variant: 'icon'   → just the icon (topbar / navbar)
 *             'pill'   → icon + label, used on settings page
 *  - className: extra class names appended to the button
 *  - ariaLabel: override the default aria-label
 */
function ThemeToggle({ variant = 'icon', className = '', ariaLabel }) {
  const { theme, toggleTheme, isDark } = useTheme()
  const { t } = useI18n()

  const baseClass = variant === 'pill' ? 'theme-toggle pill' : 'theme-toggle icon'
  const classes = [baseClass, className].filter(Boolean).join(' ')

  const label = isDark
    ? (ariaLabel || t('theme', 'switchToLight'))
    : (ariaLabel || t('theme', 'switchToDark'))

  return (
    <button
      type="button"
      className={classes}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      data-theme-current={theme}
    >
      <span className="theme-toggle-track" aria-hidden="true">
        <span className="theme-toggle-thumb">
          {isDark ? (
            // Moon
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            // Sun
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          )}
        </span>
      </span>
      {variant === 'pill' && (
        <span className="theme-toggle-label">
          {isDark ? t('theme', 'light') : t('theme', 'dark')}
        </span>
      )}
    </button>
  )
}

export default ThemeToggle
