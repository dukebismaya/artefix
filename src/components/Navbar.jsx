import { NavLink, useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
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

  function onSearchSubmit(e) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const query = (data.get('q') || '').toString()
    if (query.trim()) navigate(`/marketplace?q=${encodeURIComponent(query.trim())}`)
    setMobileOpen(false)
  }

  return (
  <>
  <header className={`sticky top-0 z-40 transition-all duration-300 ${scrolled ? 'backdrop-blur-soft border-b border-white/10 shadow-lg' : ''}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <NavLink to="/" className="flex items-center gap-2 group">
            <ion-icon name="diamond-outline" class="text-3xl text-sky-400 group-hover:animate-pulse"></ion-icon>
            <span className="text-lg sm:text-xl font-semibold gradient-text">Artifex</span>
          </NavLink>

          <form onSubmit={onSearchSubmit} className="hidden md:flex items-center gap-2 flex-1 max-w-xl">
            <input name="q" defaultValue={q} className="input focus:w-full w-2/3 transition-all duration-300" placeholder="Search handcrafted products..." />
            <button className="btn btn-outline btn-icon" aria-label="Search"><ion-icon name="search-outline"></ion-icon></button>
          </form>

          {/* Mobile hamburger */}
          <button className="md:hidden btn btn-icon btn-outline" aria-label="Open Menu" onClick={() => setMobileOpen(true)}>
            <ion-icon name="menu-outline"></ion-icon>
          </button>

          <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-sm font-medium">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-300 hover:bg-white/5'}`
              }
            >
              Home
            </NavLink>
            <NavLink
              to="/marketplace"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-300 hover:bg-white/5'}`
              }
            >
              Marketplace
            </NavLink>
            <NavLink
              to="/ai"
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-300 hover:bg-white/5'}`
              }
              title="AI Studio"
            >
              AI Studio
            </NavLink>

            {auth ? (
              <>
              {isSeller && (
                <NavLink
                  to="/seller"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-300 hover:bg-white/5'}`
                  }
                >
                  Dashboard
                </NavLink>
              )}
              {isBuyer && (
              <NavLink to="/buyer" className={({ isActive }) => `px-3 py-2 rounded-lg transition hover:bg-white/5 ${isActive ? 'text-sky-300' : 'text-gray-200'}`} title="My Orders"><ion-icon name="receipt-outline"></ion-icon></NavLink>
            )}
              <div className="relative group">
                <NavLink to="/profile" className="block px-3 py-2 rounded-lg transition-colors text-gray-300 hover:bg-white/5"><ion-icon name="person-circle-outline" class="text-xl"></ion-icon></NavLink>
                <div className="absolute top-full right-0 mt-2 w-48 card p-2 hidden group-hover:block animate-fade-in">
                  <NavLink to="/profile" className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5">Profile</NavLink>
                  {isBuyer && <NavLink to="/buyer" className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/5">My Orders</NavLink>}
                  <button className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-rose-500/20 text-rose-400" onClick={logout}>Logout</button>
                </div>
              </div>
              </>
            ) : (
              <>
                <NavLink to="/login-buyer" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-300 hover:bg-white/5'}`}>Buyer Login</NavLink>
                <NavLink to="/login-seller" className={({ isActive }) => `px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-sky-500/20 text-sky-300' : 'text-gray-300 hover:bg-white/5'}`}>Seller Login</NavLink>
              </>
            )}
            <button type="button" className="relative btn btn-icon btn-outline" onClick={() => navigate('/cart')} aria-label="Cart">
              <ion-icon name="bag-handle-outline"></ion-icon>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-1">{cartCount}</span>
              )}
            </button>
            <button type="button" className="relative btn btn-icon btn-outline" onClick={() => push('Wishlist (UI only)', 'info')} aria-label="Wishlist">
              <ion-icon name="heart-outline"></ion-icon>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] min-w-[16px] h-[16px] rounded-full grid place-items-center px-1">{wishlistCount}</span>
              )}
            </button>
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
            <NavLink to="/" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Home</NavLink>
            <NavLink to="/marketplace" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Marketplace</NavLink>
            <NavLink to="/ai" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">AI Studio</NavLink>
            <button type="button" onClick={() => { setMobileOpen(false); navigate('/cart') }} className="relative w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">Cart {cartCount > 0 && <span className="ml-2 text-xs bg-sky-500 text-white rounded-full px-2">{cartCount}</span>}</button>
            <button type="button" onClick={() => { push('Wishlist (UI only)', 'info'); setMobileOpen(false) }} className="relative w-full text-left px-3 py-2 rounded-lg hover:bg-white/5">Wishlist {wishlistCount > 0 && <span className="ml-2 text-xs bg-rose-500 text-white rounded-full px-2">{wishlistCount}</span>}</button>
            {isSeller && (
              <NavLink to="/seller" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Dashboard</NavLink>
            )}
            {isBuyer && (
              <NavLink to="/buyer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">My Orders</NavLink>
            )}
            {!auth && (
              <>
                <NavLink to="/login-buyer" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Buyer Login</NavLink>
                <NavLink to="/login-seller" onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg hover:bg-white/5">Seller Login</NavLink>
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
