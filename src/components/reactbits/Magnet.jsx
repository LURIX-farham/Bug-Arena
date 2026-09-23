import { useEffect, useRef, useState } from 'react'

/**
 * Magnet — ReactBits-style magnetic hover wrapper.
 *
 * Children are gently pulled toward the pointer while it hovers nearby,
 * then spring back on leave. Gives primary actions a tactile, physical
 * feel without changing layout (the wrapper is an inline-flex span).
 *
 * Props:
 *  - padding: number — capture radius around the element in px (default 40)
 *  - magnetStrength: number — higher = subtler pull (default 4)
 *  - maxOffset: number — hard clamp for the translation in px (default 10)
 *  - disabled: boolean — force disable
 */
const Magnet = ({
  children,
  padding = 40,
  magnetStrength = 4,
  maxOffset = 10,
  disabled = false,
}) => {
  const ref = useRef(null)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (disabled || typeof window === 'undefined') return undefined

    // Skip on touch devices and for reduced-motion users.
    const coarse = window.matchMedia?.('(pointer: coarse)').matches
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (coarse || reduced) return undefined

    const handleMove = (event) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const distX = Math.abs(centerX - event.clientX)
      const distY = Math.abs(centerY - event.clientY)

      if (distX < rect.width / 2 + padding && distY < rect.height / 2 + padding) {
        const rawX = (event.clientX - centerX) / magnetStrength
        const rawY = (event.clientY - centerY) / magnetStrength
        const clamp = (v) => Math.max(-maxOffset, Math.min(maxOffset, v))
        setOffset({ x: clamp(rawX), y: clamp(rawY) })
        setActive(true)
      } else if (active) {
        setOffset({ x: 0, y: 0 })
        setActive(false)
      }
    }

    const handleLeaveWindow = () => {
      setOffset({ x: 0, y: 0 })
      setActive(false)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseout', handleLeaveWindow)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseout', handleLeaveWindow)
    }
  }, [padding, magnetStrength, maxOffset, disabled, active])

  return (
    <span
      ref={ref}
      className={`magnet${active ? ' magnet--active' : ''}`}
      style={{
        display: 'inline-flex',
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: active
          ? 'transform 0.18s cubic-bezier(0.22, 1, 0.36, 1)'
          : 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
      }}
    >
      {children}
    </span>
  )
}

export default Magnet
