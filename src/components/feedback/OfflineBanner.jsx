import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

import { useI18n } from '../../i18n/useI18n'

/** Slim, non-blocking notice shown while the browser has no connection. */
function OfflineBanner() {
  const { t } = useI18n()
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && navigator.onLine === false,
  )

  useEffect(() => {
    const goOffline = () => setOffline(true)
    const goOnline = () => setOffline(false)
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (!offline) return null

  return (
    <div className="offline-banner" role="status" aria-live="polite">
      <WifiOff size={14} strokeWidth={1.75} aria-hidden="true" />
      <span>{t('ux', 'offline')}</span>
    </div>
  )
}

export default OfflineBanner
