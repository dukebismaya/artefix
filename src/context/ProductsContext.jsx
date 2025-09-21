import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ProductsContext = createContext(null)

const STORAGE_KEY = 'apma_products_v1'

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
    } catch {}
  }, [products])

  function addProduct(p) {
    const id = Date.now().toString()
    const product = {
      id,
      name: p.name?.trim() || 'Untitled',
      category: p.category || 'General',
      price: Number(p.price ?? 0),
      stock: Number(p.stock ?? 0),
      sellerId: p.sellerId || null,
      description: p.description?.trim() || '',
      image: p.image || null,
      // regional discovery metadata
      region: (p.region || '').trim(), // e.g., "Bihar", "Kutch", "Rajasthan"
      techniques: Array.isArray(p.techniques) ? p.techniques.map(t => String(t).trim()).filter(Boolean) : [], // ["Madhubani", "Bandhani"]
      // embedding placeholders for AI personalization (optional future use)
      textVector: Array.isArray(p.textVector) ? p.textVector : undefined,
      imageVector: Array.isArray(p.imageVector) ? p.imageVector : undefined,
      createdAt: new Date().toISOString(),
    }
    setProducts(prev => [product, ...prev])
    return product
  }

  function updateProduct(id, updates) {
    setProducts(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)))
  }

  function removeProduct(id) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  function decrementStock(productId, qty) {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Math.max(0, Number(p.stock || 0) - Number(qty || 0)) } : p))
  }

  function incrementStock(productId, qty) {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, stock: Number(p.stock || 0) + Math.max(0, Number(qty || 0)) } : p))
  }

  const value = useMemo(() => ({ products, addProduct, updateProduct, removeProduct, decrementStock, incrementStock }), [products])

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const ctx = useContext(ProductsContext)
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider')
  return ctx
}
