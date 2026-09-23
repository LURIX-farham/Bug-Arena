import { useRef } from 'react'
import './SpotlightCard.css'

/**
 * Mouse-following spotlight card.
 * Use `as={Link}` (or any component) when the card itself must be a link.
 */
const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(var(--accent-rgb, 99, 102, 241), 0.18)',
  as: Component = 'div',
  ...rest
}) => {
  const ref = useRef(null)

  const handleMouseMove = (e) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    el.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    el.style.setProperty('--spotlight-color', spotlightColor)
  }

  return (
    <Component
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`card-spotlight ${className}`.trim()}
      {...rest}
    >
      {children}
    </Component>
  )
}

export default SpotlightCard
