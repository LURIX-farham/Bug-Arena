const variants = {
  info: 'vf-alert-info',
  success: 'vf-alert-success',
  warning: 'vf-alert-warning',
  destructive: 'vf-alert-destructive',
}

const defaultIcons = {
  info: 'i',
  success: '✓',
  warning: '!',
  destructive: '×',
}

/**
 * VibeFarsi-style inline Alert.
 */
function Alert({
  variant = 'info',
  title,
  children,
  icon,
  className = '',
}) {
  const classes = ['vf-alert', variants[variant] || variants.info, className]
    .filter(Boolean)
    .join(' ')

  const iconContent = icon ?? defaultIcons[variant] ?? defaultIcons.info

  return (
    <div className={classes} role="status">
      <span className="vf-alert-icon" aria-hidden="true">{iconContent}</span>
      <div className="vf-alert-body">
        {title && <strong className="vf-alert-title">{title}</strong>}
        {children && <div className="vf-alert-desc">{children}</div>}
      </div>
    </div>
  )
}

export default Alert
export { Alert }
