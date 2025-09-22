import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Smoothly scrolls to top or to a hash target on route changes.
// Respects prefers-reduced-motion and offsets for sticky header height.
export default function SmoothScroll() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = prefersReduced ? 'auto' : 'smooth'

    // Delay a tick to ensure content is in the DOM (for hash targets)
    const id = setTimeout(() => {
      if (hash) {
        const el = document.querySelector(hash)
        if (el) {
          // Measure sticky header height (if any)
          const header = document.querySelector('header.sticky')
          const offset = header ? header.offsetHeight + 8 : 0
          const top = el.getBoundingClientRect().top + window.scrollY - offset
          window.scrollTo({ top, behavior })
          return
        }
      }
      // Default: scroll to top on route changes
      window.scrollTo({ top: 0, behavior })
    }, 0)

    return () => clearTimeout(id)
  }, [pathname, hash])

  return null
}
