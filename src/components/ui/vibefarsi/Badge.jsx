const variants = {
  default: 'vf-badge-default',
  secondary: 'vf-badge-secondary',
  outline: 'vf-badge-outline',
  success: 'vf-badge-success',
  warning: 'vf-badge-warning',
  destructive: 'vf-badge-destructive',
  brand: 'vf-badge-brand',
}

/**
 * VibeFarsi-style Badge / status pill.
 */
function Badge({
  children,
  variant = 'default',
  className = '',
  ...props
}) {
  const classes = ['vf-badge', variants[variant] || variants.default, className]
    .filter(Boolean)
    .join(' ')

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}

export default Badge
export { Badge }
