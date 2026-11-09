import { useEffect, useLayoutEffect, useRef } from 'react'

/** Keep a parameter edit in place through its asynchronous reply. Explicit
 * wheel/touch/keyboard scrolling cancels the reservation immediately. */
export function useInteractionViewport(busy: boolean) {
  const saved = useRef<{
    x: number
    y: number
    area: HTMLElement | null
    top: number
    until: number
  } | null>(null)
  useEffect(() => {
    const cancel = () => {
      saved.current = null
    }
    const key = (e: KeyboardEvent) => {
      if (
        [
          'PageDown',
          'PageUp',
          'Home',
          'End',
          'ArrowDown',
          'ArrowUp',
          ' ',
        ].includes(e.key)
      )
        cancel()
    }
    window.addEventListener('wheel', cancel, { passive: true })
    window.addEventListener('touchmove', cancel, { passive: true })
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('wheel', cancel)
      window.removeEventListener('touchmove', cancel)
      window.removeEventListener('keydown', key)
    }
  }, [])
  useLayoutEffect(() => {
    const at = saved.current
    if (!at) return
    if (performance.now() > at.until) {
      saved.current = null
      return
    }
    window.scrollTo({ left: at.x, top: at.y, behavior: 'instant' })
    if (at.area?.isConnected) at.area.scrollTop = at.top
    // The pending state starts in a passive effect, so keep the reservation
    // through the first render and release only after a settled animation frame.
    if (!busy) {
      const frame = requestAnimationFrame(() => {
        if (saved.current === at) saved.current = null
      })
      return () => cancelAnimationFrame(frame)
    }
  })
  return () => {
    const area = document.querySelector<HTMLElement>('.results-expanded')
    saved.current = {
      x: window.scrollX,
      y: window.scrollY,
      area,
      top: area?.scrollTop ?? 0,
      until: performance.now() + 10000,
    }
  }
}
