import { forwardRef, useEffect, useRef } from 'react'

/**
 * VibeFarsi-style Textarea with optional auto-grow and character counter.
 * Counter uses Persian digits when lang=fa via CSS / parent locale.
 */
const Textarea = forwardRef(function Textarea(
  {
    className = '',
    error,
    maxLength,
    value,
    onChange,
    autoGrow = false,
    showCount = false,
    ...props
  },
  ref,
) {
  const innerRef = useRef(null)

  useEffect(() => {
    if (!autoGrow) return
    const el = innerRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, autoGrow])

  const setRefs = (node) => {
    innerRef.current = node
    if (typeof ref === 'function') ref(node)
    else if (ref) ref.current = node
  }

  const length = value != null ? String(value).length : 0
  const classes = ['vf-textarea', error ? 'vf-textarea-error' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="vf-textarea-wrap">
      <textarea
        ref={setRefs}
        className={classes}
        maxLength={maxLength}
        value={value}
        onChange={onChange}
        aria-invalid={error ? true : undefined}
        {...props}
      />
      {showCount && maxLength != null && (
        <span className="vf-textarea-count" aria-live="polite">
          <span className="vf-num">{length}</span>
          {' / '}
          <span className="vf-num">{maxLength}</span>
        </span>
      )}
    </div>
  )
})

export default Textarea
export { Textarea }
