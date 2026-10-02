import { Link } from 'react-router-dom'

/**
 * BrandLogo — shared mark for Bug Arena.
 *
 * Props:
 *  - to: link target (default "/")
 *  - size: "sm" | "md" | "lg" (default "md")
 *  - showWordmark: show "BUG//ARENA" text next to the mark (default true)
 *  - compact: icon-only (for collapsed sidebar)
 *  - className: extra class on the root link
 */
function BrandLogo({
  to = '/',
  size = 'md',
  showWordmark = true,
  compact = false,
  className = '',
  ariaLabel = 'Bug Arena',
}) {
  return (
    <Link
      to={to}
      className={`brand-logo brand-logo--${size}${compact ? ' brand-logo--compact' : ''} ${className}`.trim()}
      aria-label={ariaLabel}
    >
      <span className="brand-logo-mark" aria-hidden="true">
        <img
          src="/logo.png"
          alt=""
          width={40}
          height={40}
          decoding="async"
          draggable={false}
        />
      </span>

      {!compact && showWordmark && (
        <span className="brand-logo-wordmark">
          BUG<span>//</span>ARENA
        </span>
      )}
    </Link>
  )
}

export default BrandLogo
