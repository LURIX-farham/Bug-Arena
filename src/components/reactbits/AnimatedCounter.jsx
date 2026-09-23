import { useEffect, useRef, useState } from 'react'
import { useInView, animate } from 'motion/react'
import './AnimatedCounter.css'

/**
 * AnimatedCounter — ReactBits-style count-up component.
 *
 * Animates a numeric value from 0 (or `start`) to `value` when the element
 * scrolls into view. Uses an easing curve for a premium, restrained feel.
 *
 * Why this exists: dashboards feel alive when key numbers animate on mount.
 * The project already uses `motion` for BlurText/GradientText, so this stays
 * inside the existing dependency graph — no new packages.
 *
 * Props:
 *  - value: number — target value (required)
 *  - start: number — value to animate from (default 0)
 *  - duration: number — seconds for the animation (default 1.4)
 *  - delay: number — seconds before the animation starts (default 0)
 *  - formatValue: (n: number) => string — custom formatter (default: locale-aware)
 *  - className: string
 *  - as: keyof JSX.IntrinsicElements — element to render (default 'span')
 *  - once: boolean — only animate the first time it enters view (default true)
 */
const AnimatedCounter = ({
  value = 0,
  start = 0,
  duration = 1.4,
  delay = 0,
  formatValue,
  className = '',
  as = 'span',
  once = true,
}) => {
  const ref = useRef(null)
  const inView = useInView(ref, { once, margin: '0px 0px -10% 0px' })
  const prefersReducedMotion = usePrefersReducedMotion()

  // `animatedDisplay` is only ever written from inside the animation's
  // onUpdate callback (asynchronous), never synchronously in the effect.
  // When we're not animating — because the element hasn't entered view, or
  // because the user prefers reduced motion — we bypass state entirely and
  // render `value` directly. This keeps the effect free of synchronous
  // setState calls.
  const shouldAnimate = inView && !prefersReducedMotion
  const [animatedDisplay, setAnimatedDisplay] = useState(start)

  useEffect(() => {
    if (!shouldAnimate) return undefined

    const controls = animate(start, value, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setAnimatedDisplay(v),
    })

    return () => controls.stop()
  }, [shouldAnimate, value, start, duration, delay])

  const display = shouldAnimate ? animatedDisplay : value
  const formatted = formatValue ? formatValue(display) : formatNumber(display)

  const Tag = as
  return (
    <Tag ref={ref} className={`animated-counter ${className}`.trim()}>
      {formatted}
    </Tag>
  )
}

function formatNumber(n) {
  const rounded = Math.round(n)
  // Keep locale-aware grouping so 1,250 / ۱٬۲۵۰ both work natively.
  if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
    const locale = document.documentElement.lang === 'fa' ? 'fa-IR' : 'en-US'
    return new Intl.NumberFormat(locale).format(rounded)
  }
  return String(rounded)
}

function usePrefersReducedMotion() {
  const [prefers, setPrefers] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefers(mq.matches)
    update()
    mq.addEventListener?.('change', update)
    return () => mq.removeEventListener?.('change', update)
  }, [])
  return prefers
}

export default AnimatedCounter
