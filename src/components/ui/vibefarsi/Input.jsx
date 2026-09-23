import { forwardRef } from 'react'

/**
 * VibeFarsi-style Input — Persian-first, works in both languages.
 * Use dir="ltr" for phone/email/code fields.
 */
const Input = forwardRef(function Input(
  {
    className = '',
    startAddon,
    endAddon,
    error,
    id,
    ...props
  },
  ref,
) {
  const hasAddon = startAddon || endAddon
  const classes = [
    'vf-input',
    error ? 'vf-input-error' : '',
    hasAddon ? 'vf-input-with-addon' : '',
    className,
  ].filter(Boolean).join(' ')

  const control = (
    <input
      ref={ref}
      id={id}
      className={hasAddon ? 'vf-input-control' : classes}
      aria-invalid={error ? true : undefined}
      {...props}
    />
  )

  if (!hasAddon) return control

  return (
    <div className={classes}>
      {startAddon && <span className="vf-input-addon vf-input-addon-start">{startAddon}</span>}
      {control}
      {endAddon && <span className="vf-input-addon vf-input-addon-end">{endAddon}</span>}
    </div>
  )
})

function Field({ label, htmlFor, hint, error, children, className = '' }) {
  return (
    <div className={['vf-field', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="vf-field-label" htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error && <p className="vf-field-error" role="alert">{error}</p>}
      {!error && hint && <p className="vf-field-hint">{hint}</p>}
    </div>
  )
}

export default Input
export { Input, Field }
