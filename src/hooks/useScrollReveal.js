import { useEffect } from 'react'

/**
 * Reveals `.reveal` elements as they scroll into view.
 *
 * Robustness: content must never stay invisible. If IntersectionObserver is
 * missing, the user prefers reduced motion, or an element is somehow never
 * intersected (zoomed pages, print, screenshots, background tabs), a
 * failsafe timer reveals everything.
 */
function useScrollReveal() {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll('.reveal'))
    if (!elements.length) return undefined

    const revealAll = () => elements.forEach((element) => element.classList.add('visible'))

    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced || typeof IntersectionObserver === 'undefined') {
      revealAll()
      return undefined
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -4% 0px' },
    )

    elements.forEach((element) => observer.observe(element))
    const failsafe = window.setTimeout(revealAll, 4000)

    return () => {
      window.clearTimeout(failsafe)
      observer.disconnect()
    }
  }, [])
}

export default useScrollReveal
