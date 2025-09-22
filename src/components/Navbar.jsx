import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useToast } from './Toast.jsx'
import { useUI } from '../context/UIContext.jsx'

export default function Navbar() {
  const { auth, logout } = useAuth()
  const isBuyer = auth?.role === 'buyer'
  const isSeller = auth?.role === 'seller'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef(null)
  const navRef = useRef(null)
  const [needsHamburger, setNeedsHamburger] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const loginRef = useRef(null)
  const { cartCount, wishlistCount } = useUI()
  const { push } = useToast()

  useEffect(() => {
    // Lock body scroll when drawer open
    document.body.classList.toggle('modal-open', mobileOpen)
    return () => document.body.classList.remove('modal-open')
  }, [mobileOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 50)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Detect when nav items overflow available width to decide showing hamburger on desktop
  useEffect(() => {
    const el = navRef.current
    if (!el) return
    const check = () => {
      const style = window.getComputedStyle(el)
      // If nav is hidden (mobile), always show hamburger
      if (style.display === 'none') {
        setNeedsHamburger(true)
        return
      }
      const isOverflowing = el.scrollWidth - el.clientWidth > 2
      setNeedsHamburger(isOverflowing)
    }
    check()
    const ro = new ResizeObserver(() => check())
    ro.observe(el)
    window.addEventListener('resize', check)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', check)
    }
  }, [])

  // Close 3-dot overflow on outside click
  useEffect(() => {
    if (!overflowOpen) return
    const handler = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) {
        setOverflowOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [overflowOpen])

  // Close Login dropdown on outside click
  useEffect(() => {
    if (!loginOpen) return
    const handler = (e) => {
      if (loginRef.current && !loginRef.current.contains(e.target)) {
        setLoginOpen(false)
      }
    }
    const onEsc = (e) => { if (e.key === 'Escape') setLoginOpen(false) }
    document.addEventListener('click', handler)
    document.addEventListener('keydown', onEsc)
    return () => { document.removeEventListener('click', handler); document.removeEventListener('keydown', onEsc) }
  }, [loginOpen])

  function onSearchSubmit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const query = (data.get('q') || '').toString()
    if (query.trim()) navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`)
    setMobileOpen(false)
  }

  return (
  <>
  <header className={`sticky top-0 z-40 transition-all duration-300 backdrop-blur-soft border-b ${scrolled ? 'border-white/10 shadow-lg' : 'border-transparent shadow-none'} gpu-hint`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2 group nav-3d">
            <ion-icon name="diamond-outline" class="text-3xl text-slate-200 group-hover:animate-pulse"></ion-icon>
            <span className="text-lg sm:text-xl font-semibold gradient-text">Artifex</span>
          </NavLink>

          <form onSubmit={onSearchSubmit} className="hidden md:flex items-center gap-2 flex-1 max-w-xl">
            <input name="q" defaultValue={q} className="input focus:w-full w-2/3 transition-all duration-300" placeholder="Search handcrafted products..." />
            <button className="btn btn-outline btn-icon nav-3d-icon nav-glow-icon" aria-label="Search"><ion-icon name="search-outline"></ion-icon></button>
          </form>

          {/* Hamburger: always on mobile; on desktop only if nav overflows */}
          <div className={`block ${needsHamburger ? 'md:block' : 'md:hidden'}`}>
            <button className="btn btn-icon btn-outline nav-3d-icon nav-glow-icon" aria-label="Open Menu" onClick={() => setMobileOpen(true)}>
              <ion-icon name="menu-outline"></ion-icon>
            </button>
          </div>

          <nav ref={navRef} className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg nav-3d ${isActive ? 'nav-glow-active bg-white/10 text-slate-200' : 'nav-glow text-gray-300 hover:bg-white/5'} flex items-center gap-1.5`
              }
            >
              <ion-icon name="home-outline" class="text-lg"></ion-icon>
              <span>Home</span>
            </NavLink>
            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg nav-3d ${isActive ? 'nav-glow-active bg-white/10 text-slate-200' : 'nav-glow text-gray-300 hover:bg-white/5'} flex items-center gap-1.5`
              }
            >
              <ion-icon name="bag-handle-outline" class="text-lg"></ion-icon>
              <span>Marketplace</span>
            </NavLink>
            <NavLink
              to="/workshops"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg nav-3d ${isActive ? 'nav-glow-active bg-white/10 text-slate-200' : 'nav-glow text-gray-300 hover:bg-white/5'} flex items-center gap-1.5`
              }
            >
              <ion-icon name="construct-outline" class="text-lg"></ion-icon>
              <span>Workshops</span>
            </NavLink>
            <NavLink
              to="/community"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg nav-3d ${isActive ? 'nav-glow-active bg-white/10 text-slate-200' : 'nav-glow text-gray-300 hover:bg-white/5'} flex items-center gap-1.5`
              }
            >
              <ion-icon name="people-outline" class="text-lg"></ion-icon>
              <span>Community</span>
            </NavLink>

            {!auth && (
              <div className="relative" ref={loginRef}>
                <button
                  type="button"
                  className="px-3 py-2 rounded-lg text-gray-300 hover:bg-white/5 transition-colors flex items-center gap-1.5 nav-3d"
                  aria-haspopup="menu"
                  aria-expanded={loginOpen}
                  onClick={() => { setLoginOpen(v => !v); setOverflowOpen(false) }}
                >
                  <ion-icon name="log-in-outline" class="text-lg"></ion-icon>
                  <span>Login</span>
                  <ion-icon name="chevron-down-outline" class="text-sm"></ion-icon>
                </button>
                {loginOpen && (
                  <div className="absolute top-full right-0 mt-2 w-40 card p-2 animate-fade-in" role="menu">
                    <NavLink to="/login-buyer" onClick={() => setLoginOpen(false)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2" role="menuitem">
                      <ion-icon name="person-outline" class="text-base"></ion-icon>
                      <span>Buyer</span>
                    </NavLink>
                    <NavLink to="/login-seller" onClick={() => setLoginOpen(false)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2" role="menuitem">
                      <ion-icon name="briefcase-outline" class="text-base"></ion-icon>
                      <span>Seller</span>
                    </NavLink>
                  </div>
                )}
              </div>
            )}

            {/* 3-dot overflow menu (desktop only) */}
            <div className="relative hidden md:block" ref={overflowRef}>
              <button
                type="button"
                className="btn btn-icon btn-outline nav-3d-icon nav-glow-icon"
                aria-label="More options"
                onClick={() => { setOverflowOpen((v) => !v); setLoginOpen(false) }}
              >
                <ion-icon name="ellipsis-vertical-outline"></ion-icon>
              </button>
              {overflowOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 card p-2 animate-fade-in">
                  <NavLink to="/ai" onClick={() => setOverflowOpen(false)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2">
                    <ion-icon name="sparkles-outline"></ion-icon>
                    <span>AI Studio</span>
                  </NavLink>
                  <button type="button" onClick={() => { setOverflowOpen(false); navigate('/cart') }} className="relative w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2">
                    <ion-icon name="bag-handle-outline"></ion-icon>
                    <span>Cart</span>
                    {cartCount > 0 && (
                      <span className="ml-auto bg-sky-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-2">{cartCount}</span>
                    )}
                  </button>
                  <button type="button" onClick={() => { push('Wishlist (UI only)', 'info'); setOverflowOpen(false) }} className="relative w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2">
                    <ion-icon name="heart-outline"></ion-icon>
                    <span>Wishlist</span>
                    {wishlistCount > 0 && (
                      <span className="ml-auto bg-rose-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-2">{wishlistCount}</span>
                    )}
                  </button>
                  {auth && (
                    <>
                      <div className="my-1 h-px bg-white/10" />
                      <NavLink to="/profile" onClick={() => setOverflowOpen(false)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2">
                        <ion-icon name="person-circle-outline"></ion-icon>
                        <span>Profile</span>
                      </NavLink>
                      {isSeller && (
                        <NavLink to="/seller" onClick={() => setOverflowOpen(false)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2">
                          <ion-icon name="speedometer-outline"></ion-icon>
                          <span>Dashboard</span>
                        </NavLink>
                      )}
                      {isBuyer && (
                        <NavLink to="/buyer" onClick={() => setOverflowOpen(false)} className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5 flex items-center gap-2">
                          <ion-icon name="reader-outline"></ion-icon>
                          <span>My Orders</span>
                        </NavLink>
                      )}
                      <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-500/20 text-rose-400 flex items-center gap-2" onClick={() => { setOverflowOpen(false); logout() }}>
                        <ion-icon name="log-out-outline"></ion-icon>
                        <span>Logout</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </nav>
        </div>
      </div>
  </header>

    {/* Mobile overlay + drawer */}
    {mobileOpen && (
      <>
        <div className="fixed inset-0 bg-black/60 z-40 animate-fade-in" onClick={() => setMobileOpen(false)} aria-hidden="true" />
        <aside className="fixed top-0 right-0 h-full w-72 z-50 card p-0 border-l border-white/10 animate-slide-up">
          <div className="p-4 flex items-center justify-between border-b border-white/10">
            <div className="flex items-center gap-2">
              <ion-icon name="diamond-outline" class="text-2xl text-sky-400"></ion-icon>
              <span className="font-semibold">Artifex</span>
            </div>
            <button className="btn btn-icon btn-outline" aria-label="Close Menu" onClick={() => setMobileOpen(false)}>
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
          <div className="p-4 border-b border-white/10">
            <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
              <input name="q" defaultValue={q} className="input" placeholder="Search..." />
              <button className="btn btn-outline btn-icon" aria-label="Search"><ion-icon name="search-outline"></ion-icon></button>
            </form>
          </div>
          <nav className="p-2 text-sm">
            <NavLink to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
              <ion-icon name="home-outline"></ion-icon>
              <span>Home</span>
            </NavLink>
            <NavLink to="/marketplace" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
              <ion-icon name="bag-handle-outline"></ion-icon>
              <span>Marketplace</span>
            </NavLink>
            <NavLink to="/workshops" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
              <ion-icon name="construct-outline"></ion-icon>
              <span>Workshops</span>
            </NavLink>
            <NavLink to="/community" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
              <ion-icon name="people-outline"></ion-icon>
              <span>Community</span>
            </NavLink>
            <NavLink to="/ai" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
              <ion-icon name="sparkles-outline"></ion-icon>
              <span>AI Studio</span>
            </NavLink>
            <button type="button" onClick={() => { setMobileOpen(false); navigate('/cart') }} className="relative w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">Cart {cartCount > 0 && <span className="ml-2 text-xs bg-sky-500 text-white rounded-full px-2">{cartCount}</span>}</button>
            <button type="button" onClick={() => { push('Wishlist (UI only)', 'info'); setMobileOpen(false) }} className="relative w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">Wishlist {wishlistCount > 0 && <span className="ml-2 text-xs bg-rose-500 text-white rounded-full px-2">{wishlistCount}</span>}</button>
            {isSeller && (
              <NavLink to="/seller" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
                <ion-icon name="speedometer-outline"></ion-icon>
                <span>Dashboard</span>
              </NavLink>
            )}
            {isBuyer && (
              <NavLink to="/buyer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
                <ion-icon name="reader-outline"></ion-icon>
                <span>My Orders</span>
              </NavLink>
            )}
            {!auth && (
              <>
                <NavLink to="/login-buyer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
                  <ion-icon name="person-outline"></ion-icon>
                  <span>Buyer Login</span>
                </NavLink>
                <NavLink to="/login-seller" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5 nav-3d flex items-center gap-2">
                  <ion-icon name="briefcase-outline"></ion-icon>
                  <span>Seller Login</span>
                </NavLink>
              </>
            )}
            {auth && (
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/20 text-rose-400" onClick={() => { setMobileOpen(false); logout() }}>Logout</button>
            )}
          </nav>
        </aside>
      </>
    )}
    </>
  )
}
