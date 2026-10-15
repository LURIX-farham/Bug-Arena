import { useEffect, useState } from 'react'

import { useI18n } from '../../i18n/useI18n'

/**
 * Full-screen loading state used while the session boots and while a lazily
 * loaded route chunk downloads. After a few seconds it explains that the
 * server is slow instead of looking frozen.
 */
function BootScreen({ label }) {
  const { t } = useI18n()
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 6000)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div className="boot-screen-inner">
        <span className="boot-screen-mark" aria-hidden="true">BUG<i>//</i>ARENA</span>
        <span className="boot-screen-bar" aria-hidden="true"><span /></span>
        <span className="boot-screen-label">{label || t('ux', 'connecting')}</span>
        {slow && <span className="boot-screen-slow">{t('ux', 'slowServer')}</span>}
      </div>
    </div>
  )
}

export default BootScreen
