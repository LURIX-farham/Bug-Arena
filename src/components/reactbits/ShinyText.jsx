import './ShinyText.css'

/**
 * ShinyText — ReactBits-style shimmering text.
 *
 * A light band sweeps across the text on a loop. Base/shine colors come
 * from CSS custom properties so it adapts to theme and context:
 *   --shiny-base  (default: currentColor-ish muted)
 *   --shiny-shine (default: white)
 *
 * Props:
 *  - text: string — the text to render
 *  - speed: number — seconds per shine sweep (default 4)
 *  - disabled: boolean — render plain text
 *  - className: string
 */
const ShinyText = ({ text, speed = 4, disabled = false, className = '' }) => (
  <span
    className={`shiny-text${disabled ? ' shiny-text--disabled' : ''} ${className}`.trim()}
    style={{ '--shiny-speed': `${speed}s` }}
  >
    {text}
  </span>
)

export default ShinyText
