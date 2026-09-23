import { useEffect, useId, useRef } from 'react'
import { useI18n } from '../../../i18n/useI18n'

function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  role = 'dialog',
  className = '',
}) {
  const { t } = useI18n()
  const panelRef = useRef(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!open) return undefined

    const previousActiveElement = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    panelRef.current
      ?.querySelector('[data-autofocus], button, input, textarea, select, a[href]')
      ?.focus()

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      if (previousActiveElement instanceof HTMLElement) {
        previousActiveElement.focus()
      }
    }
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="vf-dialog-overlay"
      onMouseDown={() => {
        if (role === 'dialog') onOpenChange(false)
      }}
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        className={['vf-dialog', className].filter(Boolean).join(' ')}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {(title || role === 'dialog') && (
          <div className="vf-dialog-header">
            <div className="vf-dialog-heading">
              {title && <h2 id={titleId}>{title}</h2>}
              {description && <p id={descriptionId}>{description}</p>}
            </div>

            {role === 'dialog' && (
              <button
                type="button"
                className="vf-dialog-close"
                onClick={() => onOpenChange(false)}
                aria-label={t('common', 'close')}
              >
                ×
              </button>
            )}
          </div>
        )}

        {children && <div className="vf-dialog-body">{children}</div>}
        {footer && <div className="vf-dialog-footer">{footer}</div>}
      </div>
    </div>
  )
}

export default Dialog
export { Dialog }
