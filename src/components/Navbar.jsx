import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import { useToast } from './Toast.jsx'
import { useUI } from '../context/UIContext.jsx'
import logoUrl from '../assets/logo.svg'

export default function Navbar() {
  const { auth, logout } = useAuth()
  const isBuyer = auth?.role === 'buyer'
  const isSeller = auth?.role === 'seller'
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const q = params.get('q') || ''
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { cartCount, wishlistCount } = useUI()
  const { push } = useToast()
  const { totalUnread } = useChat()
  const unread = auth?.userId ? totalUnread(auth.userId) : 0

  useEffect(() => {
    // Lock body scroll when drawer open
    document.body.classList.toggle('modal-open', mobileOpen)
    return () => document.body.classList.remove('modal-open')
  }, [mobileOpen])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 200)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // counts come from UI context; no need for storage listeners

  function onSearchSubmit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const query = (data.get('q') || '').toString()
    if (query.trim()) navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`)
    setMobileOpen(false)
  }

  return (
  <>
  <header className={`sticky top-0 z-40 backdrop-blur-soft border-b border-white/10 ${scrolled ? 'shadow-lg' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2">
            <img src={logoUrl} alt="logo" className="h-7 w-7" />
            <span className="text-lg sm:text-xl font-semibold gradient-text">Artifex</span>
          </NavLink>

          <form onSubmit={onSearchSubmit} className="hidden md:flex items-center gap-2 flex-1 max-w-xl">
            <input name="q" defaultValue={q} className="input" placeholder="Search handcrafted products..." />
            <button className="btn btn-outline" aria-label="Search"><ion-icon name="search-outline"></ion-icon></button>
          </form>

          {/* Mobile hamburger */}
          <button className="md:hidden px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200" aria-label="Open Menu" onClick={() => setMobileOpen(true)}>
            <span className="sr-only">Open Menu</span>
            <ion-icon name="menu-outline"></ion-icon>
          </button>

          <nav className="hidden md:flex items-center gap-1 sm:gap-3 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300 border-b-2 border-sky-400' : 'text-gray-200 border-b-2 border-transparent'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300 border-b-2 border-sky-400' : 'text-gray-200 border-b-2 border-transparent'}`
              }
            >
              Marketplace
            </NavLink>
            <NavLink
              to="/ai"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300 border-b-2 border-sky-400' : 'text-gray-200 border-b-2 border-transparent'}`
              }
              title="AI Studio"
            >
              AI Studio
            </NavLink>
            <NavLink
              to="/workshops"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300 border-b-2 border-sky-400' : 'text-gray-200 border-b-2 border-transparent'}`
              }
              title="Workshops"
            >
              Workshops
            </NavLink>
            <NavLink
              to="/community"
              className={({ isActive }) =>
                `relative px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300 border-b-2 border-sky-400' : 'text-gray-200 border-b-2 border-transparent'}`
              }
              title="Community"
            >
              Community
              {unread > 0 && (
                <span className="absolute -top-1 -right-2 bg-rose-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-1">{unread}</span>
              )}
            </NavLink>
            {isSeller && (
              <NavLink
                to="/upload"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300 border-b-2 border-sky-400' : 'text-gray-200 border-b-2 border-transparent'}`
                }
              >
                Upload
              </NavLink>
            )}

            {!auth && (
              <>
                <NavLink to="/login-buyer" className={({ isActive }) => `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300' : 'text-gray-200'}`}><ion-icon name="person-outline"></ion-icon></NavLink>
                <NavLink to="/login-seller" className={({ isActive }) => `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300' : 'text-gray-200'}`}>Seller</NavLink>
              </>
            )}

            {/* Cart & Wishlist badges */}
            <button type="button" className="relative px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200" onClick={() => navigate('/cart')} aria-label="Cart">
              <ion-icon name="bag-handle-outline"></ion-icon>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-1">{cartCount}</span>
              )}
            </button>
            <button type="button" className="relative px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200" onClick={() => push('Wishlist (UI only)', 'info')} aria-label="Wishlist">
              <ion-icon name="heart-outline"></ion-icon>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-1">{wishlistCount}</span>
              )}
            </button>
            {isBuyer && (
              <NavLink to="/buyer" className={({ isActive }) => `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300' : 'text-gray-200'}`} title="My Orders"><ion-icon name="receipt-outline"></ion-icon></NavLink>
            )}
            {auth && (
              <NavLink to="/profile" className={({ isActive }) => `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300' : 'text-gray-200'}`} title="Profile"><ion-icon name="person-circle-outline"></ion-icon></NavLink>
            )}
            {isSeller && (
              <NavLink to="/seller" className={({ isActive }) => `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300' : 'text-gray-200'}`}>Seller</NavLink>
            )}
            {auth && (
              <button className="px-3 py-2 rounded-lg hover:bg-white/5 text-gray-200" onClick={logout} title="Logout"><ion-icon name="log-out-outline"></ion-icon></button>
            )}
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
              <img src={logoUrl} alt="logo" className="h-6 w-6" />
              <span className="font-semibold">Artifex</span>
            </div>
            <button className="px-2 py-1 rounded-lg hover:bg-white/5" aria-label="Close Menu" onClick={() => setMobileOpen(false)}>
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
          <div className="p-4 border-b border-white/10">
            <form onSubmit={onSearchSubmit} className="flex items-center gap-2">
              <input name="q" defaultValue={q} className="input" placeholder="Search..." />
              <button className="btn btn-outline" aria-label="Search"><ion-icon name="search-outline"></ion-icon></button>
            </form>
          </div>
          <nav className="p-2 text-sm">
            <NavLink to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Home</NavLink>
            <NavLink to="/marketplace" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Marketplace</NavLink>
            <NavLink to="/ai" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">AI Studio</NavLink>
            <button type="button" onClick={() => { setMobileOpen(false); navigate('/cart') }} className="relative w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">Cart {cartCount > 0 && <span className="ml-2 text-xs bg-sky-500 text-white rounded-full px-2">{cartCount}</span>}</button>
            <button type="button" onClick={() => { push('Wishlist (UI only)', 'info'); setMobileOpen(false) }} className="relative w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">Wishlist {wishlistCount > 0 && <span className="ml-2 text-xs bg-rose-500 text-white rounded-full px-2">{wishlistCount}</span>}</button>
            {isSeller && (
              <NavLink to="/upload" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Upload</NavLink>
            )}
            {isBuyer && (
              <NavLink to="/buyer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">My Orders</NavLink>
            )}
            {isSeller && (
              <NavLink to="/seller" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Seller</NavLink>
            )}
            {!auth && (
              <>
                <NavLink to="/login-buyer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Buyer Login</NavLink>
                <NavLink to="/login-seller" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Seller Login</NavLink>
              </>
            )}
            {auth && (
              <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5" onClick={() => { setMobileOpen(false); logout() }}>Logout</button>
            )}
          </nav>
        </aside>
      </>
    )}
    </>
  )
}
