import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext } from './ToastContext.js'
import { useI18n } from '../../../i18n/useI18n'
import { faNumber } from '../../../lib/vibefarsi-utils'

function ToastCard({ toast, onClose, closeLabel }) {
  const icon = toast.variant === 'success'
    ? '✓'
    : toast.variant === 'error'
      ? '!'
      : 'i'

  return (
    <div className={`vf-toast vf-toast-${toast.variant || 'default'}`} role="status">
      <span className="vf-toast-icon" aria-hidden="true">{icon}</span>

      <div className="vf-toast-content">
        <strong>{toast.title}</strong>
        {toast.description && <span>{toast.description}</span>}
      </div>

      {toast.action && (
        <button
          type="button"
          className="vf-toast-action"
          onClick={() => {
            toast.action.onClick()
            onClose()
          }}
        >
          {toast.action.label}
        </button>
      )}

      <button
        type="button"
        className="vf-toast-close"
        onClick={onClose}
        aria-label={closeLabel}
      >
        ×
      </button>
    </div>
  )
}

function ToastProvider({
  children,
  max = 3,
  position = 'bottom-start',
}) {
  const { t, language } = useI18n()
  const [items, setItems] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setItems((current) => current.filter((item) => item.id !== id))

    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const dismissAll = useCallback(() => {
    setItems([])
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }, [])

  const toast = useCallback((options) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const item = {
      id,
      duration: 4000,
      variant: 'default',
      ...options,
    }

    setItems((current) => [...current, item].slice(-max))

    const timer = window.setTimeout(() => dismiss(id), item.duration)
    timers.current.set(id, timer)

    return id
  }, [dismiss, max])

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current.clear()
  }, [])

  const value = { toast, dismiss, dismissAll }
  const closeLabel = t('common', 'close')
  const countLabel = language === 'fa'
    ? faNumber(items.length)
    : String(items.length)

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className={`vf-toast-region vf-toast-${position}`} aria-live="polite">
        {items.map((item) => (
          <ToastCard
            key={item.id}
            toast={item}
            onClose={() => dismiss(item.id)}
            closeLabel={closeLabel}
          />
        ))}

        {items.length > 1 && (
          <button
            type="button"
            className="vf-toast-dismiss-all"
            onClick={dismissAll}
          >
            {t('common', 'dismissAll')} ({countLabel})
          </button>
        )}
      </div>
    </ToastContext.Provider>
  )
}

export { ToastProvider }
