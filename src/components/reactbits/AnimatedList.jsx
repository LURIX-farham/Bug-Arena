import { useEffect, useRef, useState } from 'react'
import './AnimatedList.css'

/**
 * AnimatedList — ReactBits-style staggered reveal list.
 *
 * Children are revealed one-by-one (fade + slide) when the list scrolls
 * into view. Used for feeds such as recent submissions where each row
 * deserves its own entrance beat.
 *
 * Props:
 *  - children: one element per row
 *  - delay: number — ms between rows (default 90)
 *  - initialDelay: number — ms before the first row starts (default 140)
 *  - as: element to render (default 'div')
 *  - className: string
 */
const AnimatedList = ({
  children,
  delay = 90,
  initialDelay = 140,
  as: Tag = 'div',
  className = '',
}) => {
  const ref = useRef(null)
  // Reduced-motion users get everything visible immediately; reading the
  // media query lazily here keeps the effect free of sync setState calls.
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return undefined
    if (visible) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  const items = Array.isArray(children) ? children : [children]

  return (
    <Tag
      ref={ref}
      className={`animated-list${visible ? ' animated-list--visible' : ''} ${className}`.trim()}
    >
      {items.map((item, index) => (
        <div
          className="animated-list__item"
          key={item?.key ?? index}
          style={{ '--anim-delay': `${initialDelay + index * delay}ms` }}
        >
          {item}
        </div>
      ))}
    </Tag>
  )
}

export default AnimatedList
