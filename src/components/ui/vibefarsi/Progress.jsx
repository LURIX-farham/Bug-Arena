import { useI18n } from '../../../i18n/useI18n'
import { faPercent } from '../../../lib/vibefarsi-utils'

/**
 * VibeFarsi-style Progress bar — fills from the start edge (right in RTL).
 * Shows Persian percent when language is fa.
 */
function Progress({
  value = 0,
  max = 100,
  label,
  showValue = true,
  className = '',
}) {
  const { language } = useI18n()
  const pct = Math.min(100, Math.max(0, (Number(value) / Number(max || 1)) * 100))
  const display = showValue
    ? faPercent(pct, pct % 1 === 0 ? 0 : 1, language)
    : null

  return (
    <div className={['vf-progress', className].filter(Boolean).join(' ')}>
      {(label || showValue) && (
        <div className="vf-progress-meta">
          {label && <span className="vf-progress-label">{label}</span>}
          {display && <span className="vf-progress-value vf-num">{display}</span>}
        </div>
      )}
      <div
        className="vf-progress-track"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="vf-progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default Progress
export { Progress }
