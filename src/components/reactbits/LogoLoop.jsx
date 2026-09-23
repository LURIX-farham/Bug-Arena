import './LogoLoop.css'

/**
 * LogoLoop — ReactBits-style seamless marquee.
 *
 * Renders a horizontally scrolling track that loops its content forever.
 * The root is forced to `dir="ltr"` so the translateX loop math stays
 * correct inside RTL pages (item content itself can be any language).
 *
 * Props:
 *  - children: the sequence of items (rendered twice for the seamless loop)
 *  - duration: number — seconds for one full loop (default 34)
 *  - reverse: boolean — scroll right instead of left
 *  - pauseOnHover: boolean (default true)
 *  - className: string
 */
const LogoLoop = ({
  children,
  duration = 34,
  reverse = false,
  pauseOnHover = true,
  className = '',
}) => (
  <div
    dir="ltr"
    className={[
      'logo-loop',
      reverse ? 'logo-loop--reverse' : '',
      pauseOnHover ? 'logo-loop--pause' : '',
      className,
    ].filter(Boolean).join(' ')}
    style={{ '--loop-duration': `${duration}s` }}
  >
    <div className="logo-loop__track">
      <div className="logo-loop__content">{children}</div>
      <div className="logo-loop__content" aria-hidden="true">{children}</div>
    </div>
  </div>
)

export default LogoLoop
