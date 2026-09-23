import './StarBorder.css'

/**
 * StarBorder — ReactBits-style animated border beams.
 *
 * Wraps content in a 1px ring where two conic light beams orbit the
 * border at different speeds. The ring replaces the element's own
 * border — the inner content carries the surface background.
 *
 * Props:
 *  - as: element/component to render (default 'div')
 *  - color: string — primary beam color, any CSS color (default accent)
 *  - secondaryColor: string — trailing beam color (default secondary)
 *  - speed: number — seconds per full orbit for the main beam (default 7)
 *  - className: string — applied to the root
 *  - children: content
 */
const StarBorder = ({
  as: Component = 'div',
  color = 'rgba(var(--accent-rgb, 124, 255, 107), 0.9)',
  secondaryColor = 'rgba(var(--secondary-rgb, 94, 167, 255), 0.5)',
  speed = 7,
  className = '',
  children,
  ...rest
}) => (
  <Component
    className={`star-border ${className}`.trim()}
    style={{ '--sb-color': color, '--sb-color-2': secondaryColor, '--sb-speed': `${speed}s` }}
    {...rest}
  >
    <span className="star-border__beams" aria-hidden="true">
      <span className="star-border__beam star-border__beam--a" />
      <span className="star-border__beam star-border__beam--b" />
    </span>
    <div className="star-border__content">{children}</div>
  </Component>
)

export default StarBorder
