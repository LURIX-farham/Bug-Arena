import { useEffect, useRef, useState } from 'react'

/**
 * useInViewOnce — flips to true the first time the attached element
 * enters the viewport. Powers one-shot draw-in animations (charts,
 * progress fills, meter bars) so they animate when actually seen.
 *
 * Reduced-motion safe: consumers should treat `inView` as a trigger,
 * and gate the animation itself behind their own motion checks.
 */
export default function useInViewOnce(threshold = 0.3) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return undefined

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, { threshold })

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return [ref, inView]
}
