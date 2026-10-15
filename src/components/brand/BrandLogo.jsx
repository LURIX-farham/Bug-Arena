import { Link } from 'react-router-dom'

/**
 * BrandLogo — shared mark for BUG//ARENA.
 *
 * The original logo.png is preserved untouched; theme variants are
 * generated from it (logo-mark.png navy / logo-mark-white.png white)
 * and swapped via CSS so the mark always sits on a correct surface:
 *   • dark theme  → white mark (readable on navy)
 *   • light theme → navy mark  (readable on paper)
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
          className="brand-logo-img-light"
          src="/logo-mark.png"
          alt=""
          width={40}
          height={40}
          decoding="async"
          draggable={false}
        />
        <img
          className="brand-logo-img-dark"
          src="/logo-mark-white.png"
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
