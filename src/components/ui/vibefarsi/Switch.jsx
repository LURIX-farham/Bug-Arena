import { forwardRef, useId } from 'react'

/**
 * VibeFarsi-style Switch — thumb moves toward start edge in RTL.
 */
const Switch = forwardRef(function Switch(
  {
    checked = false,
    onCheckedChange,
    disabled = false,
    label,
    id,
    className = '',
    ...props
  },
  ref,
) {
  const autoId = useId()
  const switchId = id || autoId

  return (
    <label
      className={['vf-switch', disabled ? 'vf-switch-disabled' : '', className]
        .filter(Boolean)
        .join(' ')}
      htmlFor={switchId}
    >
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={['vf-switch-track', checked ? 'vf-switch-on' : ''].filter(Boolean).join(' ')}
        onClick={() => {
          if (!disabled && onCheckedChange) onCheckedChange(!checked)
        }}
        {...props}
      >
        <span className="vf-switch-thumb" />
      </button>
      {label && <span className="vf-switch-label">{label}</span>}
    </label>
  )
})

export default Switch
export { Switch }
