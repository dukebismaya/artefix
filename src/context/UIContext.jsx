import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_CART = 'artifex_cart_v1'
const STORAGE_WISHLIST = 'artifex_wishlist_v1'
const STORAGE_SAVED = 'artifex_saved_v1'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_CART) || '[]') } catch { return [] }
  })
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_WISHLIST) || '[]') } catch { return [] }
  })
  const [saved, setSaved] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_SAVED) || '[]') } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_CART, JSON.stringify(cart)) } catch {}
  }, [cart])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_WISHLIST, JSON.stringify(wishlist)) } catch {}
  }, [wishlist])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_SAVED, JSON.stringify(saved)) } catch {}
  }, [saved])

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

  const value = useMemo(() => ({
    cart,
    saved,
    wishlist,
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
  }), [cart, saved, wishlist])

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>
}

export function useUI() {
  const ctx = useContext(UIContext)
  if (!ctx) throw new Error('useUI must be used within UIProvider')
  return ctx
}
