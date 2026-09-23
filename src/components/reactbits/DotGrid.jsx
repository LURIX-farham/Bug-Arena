import { useEffect, useRef } from 'react'
import './DotGrid.css'

/**
 * DotGrid — ReactBits-style interactive dot field.
 *
 * A canvas layer that renders a grid of dots which light up and swell
 * as the pointer approaches, with a restrained ripple pulse on click.
 * It listens on `window` (not the canvas) so it keeps working underneath
 * overlay content and behind pointer-events:none wrappers.
 *
 * Props:
 *  - gap: number — spacing between dots in CSS px (default 26)
 *  - dotSize: number — base dot radius in CSS px (default 1.6)
 *  - baseColor: string — idle dot color (any canvas fillStyle)
 *  - activeColor: string — dot color when the pointer is near
 *  - proximity: number — activation radius in CSS px (default 130)
 *  - maxActive: number — glow size multiplier at the pointer (default 2.4)
 *  - className: string — applied to the root canvas
 */
const DotGrid = ({
  gap = 26,
  dotSize = 1.6,
  baseColor = 'rgba(154, 161, 172, 0.22)',
  activeColor = 'rgba(124, 255, 107, 0.85)',
  proximity = 130,
  maxActive = 2.4,
  className = '',
}) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || typeof window === 'undefined') return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

    let dots = []
    let raf = 0
    let running = true
    let visible = true

    const pointer = { x: -9999, y: -9999, inside: false }
    const pulses = []

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      // Rebuild the dot lattice for the new size.
      dots = []
      const cols = Math.ceil(rect.width / gap) + 1
      const rows = Math.ceil(rect.height / gap) + 1
      const offsetX = (rect.width - (cols - 1) * gap) / 2
      const offsetY = (rect.height - (rows - 1) * gap) / 2
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          dots.push({
            x: offsetX + col * gap,
            y: offsetY + row * gap,
            t: 0, // activation 0..1
          })
        }
      }

      if (reducedMotion) drawFrame(0)
    }

    const drawFrame = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Click ripples — a restrained ring that expands and fades.
      const now = performance.now()
      for (let p = pulses.length - 1; p >= 0; p -= 1) {
        const pulse = pulses[p]
        const age = (now - pulse.t0) / 900
        if (age >= 1) {
          pulses.splice(p, 1)
          continue
        }
        const radius = 12 + age * 150
        ctx.beginPath()
        ctx.arc(pulse.x, pulse.y, radius, 0, Math.PI * 2)
        ctx.strokeStyle = activeColor.replace(/[\d.]+\)$/, `${(1 - age) * 0.28})`)
        ctx.lineWidth = 1
        ctx.stroke()
      }

      for (let i = 0; i < dots.length; i += 1) {
        const dot = dots[i]
        let target = 0
        if (pointer.inside) {
          const dx = dot.x - pointer.x
          const dy = dot.y - pointer.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < proximity) target = 1 - dist / proximity
        }
        // Ease activation toward its target for a soft trail.
        dot.t += (target - dot.t) * (target > dot.t ? 0.14 : 0.06)
        if (dot.t < 0.004) dot.t = 0

        if (dot.t <= 0) {
          ctx.fillStyle = baseColor
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2)
          ctx.fill()
        } else {
          // Base dot keeps its place; the active glow is layered on top.
          ctx.fillStyle = baseColor
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = activeColor
          ctx.beginPath()
          ctx.arc(dot.x, dot.y, dotSize + dot.t * (dotSize * maxActive), 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }

    const tick = () => {
      if (!running) return
      if (visible) drawFrame()
      raf = window.requestAnimationFrame(tick)
    }

    const handleMove = (event) => {
      const rect = canvas.getBoundingClientRect()
      pointer.x = event.clientX - rect.left
      pointer.y = event.clientY - rect.top
      pointer.inside =
        pointer.x >= -40 && pointer.y >= -40
        && pointer.x <= rect.width + 40 && pointer.y <= rect.height + 40
    }

    const handleLeave = () => {
      pointer.inside = false
      pointer.x = -9999
      pointer.y = -9999
    }

    const handleDown = () => {
      if (!pointer.inside) return
      pulses.push({ x: pointer.x, y: pointer.y, t0: performance.now() })
      if (pulses.length > 4) pulses.shift()
    }

    const handleVisibility = () => {
      visible = !document.hidden
    }

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const sectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && !document.hidden
    }, { threshold: 0.02 })
    sectionObserver.observe(canvas)

    if (!reducedMotion) {
      window.addEventListener('mousemove', handleMove, { passive: true })
      window.addEventListener('pointerdown', handleDown, { passive: true })
      window.addEventListener('blur', handleLeave)
      document.addEventListener('visibilitychange', handleVisibility)
      raf = window.requestAnimationFrame(tick)
    }

    return () => {
      window.cancelAnimationFrame(raf)
      observer.disconnect()
      sectionObserver.disconnect()
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('pointerdown', handleDown)
      window.removeEventListener('blur', handleLeave)
      document.removeEventListener('visibilitychange', handleVisibility)
      running = false
    }
  }, [gap, dotSize, baseColor, activeColor, proximity, maxActive])

  return <canvas ref={canvasRef} className={`dot-grid ${className}`.trim()} aria-hidden="true" />
}

export default DotGrid
