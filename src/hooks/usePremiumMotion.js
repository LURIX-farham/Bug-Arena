import { useEffect } from 'react'

const SURFACE_SELECTORS = [
  '.stat-card',
  '.home-panel',
  '.challenge-card',
  '.challenge-count',
  '.mode-card',
  '.mode-selector',
  '.comparison-side',
  '.replay-card',
  '.leaderboard',
  '.rating-card',
  '.competitive-card',
  '.competitive-panel',
  '.system-card',
  '.system-panel',
  '.analytics-card',
  '.analytics-panel',
  '.settings-card',
  '.profile-progress-panel',
  '.profile-history',
  '.achievement-card',
  '.auth-card',
  '.details-panel',
  '.score-card',
  '.result-card',
  '.app-error-card',
]

const SELECTOR = SURFACE_SELECTORS.join(',')

function shouldReduceMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function usePremiumMotion() {
  useEffect(() => {
    if (typeof window === 'undefined' || shouldReduceMotion()) return undefined

    const root = document.documentElement
    const landing = document.querySelector('.landing')
    const surfaces = Array.from(document.querySelectorAll(SELECTOR))

    surfaces.forEach((surface, index) => {
      surface.classList.add('motion-surface')
      surface.style.setProperty('--motion-delay', `${Math.min(index * 18, 220)}ms`)

      const handlePointerMove = (event) => {
        const rect = surface.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        surface.style.setProperty('--motion-x', `${x}%`)
        surface.style.setProperty('--motion-y', `${y}%`)
      }

      const resetPointer = () => {
        surface.style.setProperty('--motion-x', '50%')
        surface.style.setProperty('--motion-y', '50%')
      }

      surface.addEventListener('pointermove', handlePointerMove, { passive: true })
      surface.addEventListener('pointerleave', resetPointer)
      surface.__bugArenaMotionCleanup = () => {
        surface.removeEventListener('pointermove', handlePointerMove)
        surface.removeEventListener('pointerleave', resetPointer)
      }
    })

    let raf = 0
    let maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)

    const updateScrollBounds = () => {
      maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
    }

    const tick = (time) => {
      const drift = Math.sin(time * 0.00022) * 18 + Math.cos(time * 0.00011) * 10
      const secondaryDrift = Math.cos(time * 0.00017) * 14
      const scrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll))

      if (landing) {
        landing.style.setProperty('--ambient-x', `${drift}px`)
        landing.style.setProperty('--ambient-y', `${secondaryDrift}px`)
      }

      root.style.setProperty('--scroll-progress', `${scrollProgress}`)
      raf = window.requestAnimationFrame(tick)
    }

    window.addEventListener('resize', updateScrollBounds, { passive: true })
    raf = window.requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('resize', updateScrollBounds)
      if (raf) window.cancelAnimationFrame(raf)
      surfaces.forEach((surface) => {
        surface.__bugArenaMotionCleanup?.()
        delete surface.__bugArenaMotionCleanup
      })
    }
  }, [])
}

export default usePremiumMotion
