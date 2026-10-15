import { useEffect, useRef, useState } from 'react'
import './AnimatedList.css'

const AnimatedList = ({
  children,
  delay = 90,
  initialDelay = 140,
  as: Tag = 'div',
  className = '',
}) => {
  const ref = useRef(null)
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    const el = ref.current
    if (!el || typeof window === 'undefined') return undefined
    if (visible) return undefined

    const reveal = () => setVisible(true)

    try {
      const rect = el.getBoundingClientRect()
      const vh = window.innerHeight || document.documentElement.clientHeight
      if (rect.top < vh && rect.bottom > 0) {
        reveal()
        return undefined
      }
    } catch {
      // fall through
    }

    let observer
    if (typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            reveal()
            observer.disconnect()
          }
        },
        { threshold: 0, rootMargin: '40px 0px' }
      )
      observer.observe(el)
    }

    const timer = window.setTimeout(reveal, 600)

    return () => {
      window.clearTimeout(timer)
      observer?.disconnect()
    }
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