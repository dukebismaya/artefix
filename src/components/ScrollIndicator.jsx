import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollIndicator() {
  const [visible, setVisible] = useState(true)
  const [highlight, setHighlight] = useState(true)
  const { pathname } = useLocation()

  // Reset indicator on route change (top of page shows again)
  useEffect(() => {
    // Only render on Home
    if (pathname !== '/') {
      setVisible(false)
      setHighlight(false)
      return
    }
    setVisible(true)
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      setHighlight(false)
    } else {
      // Brief glow on load
      const t = setTimeout(() => setHighlight(false), 10000)
      return () => clearTimeout(t)
    }
  }, [pathname])

  // Hide after user scrolls down a bit
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || window.pageYOffset
      if (y > 80) { setVisible(false); setHighlight(false) }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (pathname !== '/' || !visible) return null

  const onClick = () => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const behavior = prefersReduced ? 'auto' : 'smooth'
    const header = document.querySelector('header.sticky')
    const offset = header ? header.offsetHeight : 0
    const by = window.innerHeight * 0.9 - offset
    window.scrollBy({ top: by, behavior })
    setVisible(false)
    setHighlight(false)
  }

  return (
    <button
      onClick={onClick}
      aria-label="Scroll down"
      className="fixed left-1/2 -translate-x-1/2 bottom-24 md:bottom-28 lg:bottom-32 z-30 group"
    >
      <div className="relative w-9 h-14 rounded-[1.25rem] border border-white/30 bg-[rgba(18,24,38,0.55)] backdrop-blur-sm shadow-[0_10px_24px_-12px_rgba(56,189,248,0.35)] hover:shadow-[0_14px_30px_-14px_rgba(56,189,248,0.5)] transition-all duration-300">
        {/* Glow ring for initial attention */}
        <span className={`absolute -inset-3 rounded-[1.6rem] blur-md transition-opacity ${highlight ? 'opacity-100 animate-[glow_1.6s_ease-in-out_infinite]' : 'opacity-0'}`} style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.35), transparent 60%)' }} />
        {/* Wheel centered */}
        <span className="absolute left-1/2 top-1/2 w-1.5 h-2 rounded-full bg-white/90 group-hover:bg-white animate-[wheel_1.8s_ease-in-out_infinite]"></span>
      </div>
      <style>{`
        @keyframes wheel {
          0% { transform: translate(-50%, -50%); opacity: 0.95 }
          50% { transform: translate(-50%, -35%); opacity: 1 }
          100% { transform: translate(-50%, -50%); opacity: 0.95 }
        }
        @keyframes glow {
          0% { transform: scale(0.96); opacity: 0.6 }
          50% { transform: scale(1.04); opacity: 1 }
          100% { transform: scale(0.96); opacity: 0.6 }
        }
      `}</style>
    </button>
  )
}
