import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

function makeKeys(auth) {
  const prefix = auth?.userId ? `artifex_${auth.role}_${auth.userId}` : 'artifex_guest'
  return {
    CART: `${prefix}_cart_v1`,
    WISHLIST: `${prefix}_wishlist_v1`,
    SAVED: `${prefix}_saved_v1`,
    VIEWED: `${prefix}_viewed_v1`,
  }
}

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const { auth } = useAuth()
  const KEYS = useMemo(() => makeKeys(auth), [auth?.role, auth?.userId])
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [saved, setSaved] = useState([])
  const [viewed, setViewed] = useState([]) // most-recent-first product ids

  // Load per-user data on auth change
  useEffect(() => {
    try { setCart(JSON.parse(localStorage.getItem(KEYS.CART) || '[]')) } catch { setCart([]) }
    try { setWishlist(JSON.parse(localStorage.getItem(KEYS.WISHLIST) || '[]')) } catch { setWishlist([]) }
    try { setSaved(JSON.parse(localStorage.getItem(KEYS.SAVED) || '[]')) } catch { setSaved([]) }
    try { setViewed(JSON.parse(localStorage.getItem(KEYS.VIEWED) || '[]')) } catch { setViewed([]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [KEYS.CART, KEYS.WISHLIST, KEYS.SAVED, KEYS.VIEWED])

  useEffect(() => {
    try { localStorage.setItem(KEYS.CART, JSON.stringify(cart)) } catch {}
  }, [cart, KEYS.CART])
  useEffect(() => {
    try { localStorage.setItem(KEYS.WISHLIST, JSON.stringify(wishlist)) } catch {}
  }, [wishlist, KEYS.WISHLIST])
  useEffect(() => {
    try { localStorage.setItem(KEYS.SAVED, JSON.stringify(saved)) } catch {}
  }, [saved, KEYS.SAVED])
  useEffect(() => {
    try { localStorage.setItem(KEYS.VIEWED, JSON.stringify(viewed)) } catch {}
  }, [viewed, KEYS.VIEWED])

  function addToCart(item) {
    // item: { id, name, price, image, qty }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, qty: (i.qty || 1) + (item.qty || 1) } : i)
      }
      return [{ ...item, qty: item.qty || 1 }, ...prev]
    })
  }

  function removeFromCart(id) { setCart(prev => prev.filter(i => i.id !== id)) }
  function clearCart() { setCart([]) }
  function saveForLater(id) {
    setCart(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      setSaved(s => [{ id: item.id, name: item.name, price: item.price, image: item.image }, ...s.filter(x => x.id !== id)])
      return prev.filter(i => i.id !== id)
    })
  }
  function moveSavedToCart(id) {
    setSaved(prev => {
      const item = prev.find(i => i.id === id)
      if (!item) return prev
      setCart(c => {
        const existing = c.find(ci => ci.id === id)
        if (existing) return c.map(ci => ci.id === id ? { ...ci, qty: (ci.qty || 1) + 1 } : ci)
        return [{ ...item, qty: 1 }, ...c]
      })
      return prev.filter(i => i.id !== id)
    })
  }
  function removeFromSaved(id) { setSaved(prev => prev.filter(i => i.id !== id)) }

  function setCartItemQty(id, qty) {
    const q = Math.max(1, Number(qty || 1))
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: q } : i))
  }
  function incrementCartItem(id, by = 1) {
    const inc = Math.max(1, Number(by || 1))
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, Number(i.qty || 1) + inc) } : i))
  }
  function decrementCartItem(id, by = 1) {
    const dec = Math.max(1, Number(by || 1))
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, Number(i.qty || 1) - dec) } : i))
  }

  function toggleWishlist(id) {
    setWishlist(prev => prev.includes(id) ? prev.filter(x => x !== id) : [id, ...prev])
  }

  // Track recently viewed products (dedup, cap to 50)
  function markViewed(id) {
    setViewed(prev => {
      const arr = [id, ...prev.filter(x => x !== id)]
      return arr.slice(0, 50)
    })
  }
  function clearViewed() { setViewed([]) }

  const value = useMemo(() => ({
    cart,
    saved,
    wishlist,
  viewed,
    cartCount: cart.reduce((sum, i) => sum + (i.qty || 1), 0),
    savedCount: saved.length,
    wishlistCount: wishlist.length,
    addToCart,
    removeFromCart,
    clearCart,
    setCartItemQty,
    incrementCartItem,
    decrementCartItem,
    saveForLater,
    moveSavedToCart,
    removeFromSaved,
    toggleWishlist,
    markViewed,
    clearViewed,
  }), [cart, saved, wishlist])

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
