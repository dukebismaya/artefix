import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ProductsContext = createContext(null)

const STORAGE_KEY = 'apma_products_v1'
const SEED_FLAG = 'apma_products_seed_v1'

// Seeded Artifex™ Official products for first-run experience
function seedOfficialProducts() {
  const now = Date.now()
  const days = (n) => new Date(now - n * 86400000).toISOString()
  return [
    {
      id: 'official-1',
      name: 'Kutch Bandhani Scarf',
      category: 'Textiles',
      price: 1499,
      stock: 24,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Hand-dyed tie-and-dye scarf inspired by Kutch artisans; soft cotton blend.',
      image: '/products/Kutch_Bandhani_Scarf.png',
      region: 'Kutch',
      techniques: ['Bandhani'],
      isOfficial: true,
      officialGroup: 'forYou',
      trendScore: 62,
      createdAt: days(3),
    },
    {
      id: 'official-2',
      name: 'Madhubani Mini Canvas',
      category: 'Artwork',
      price: 1199,
      stock: 18,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Traditional Madhubani-style hand painting on a compact canvas for desks.',
      image: '/products/Madhubani_Mini_Canvas.png',
      region: 'Bihar',
      techniques: ['Madhubani'],
      isOfficial: true,
      officialGroup: 'forYou',
      trendScore: 55,
      createdAt: days(6),
    },
    {
      id: 'official-3',
      name: 'Hand-thrown Clay Mug',
      category: 'Pottery',
      price: 899,
      stock: 32,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Stoneware mug with matte glaze—dishwasher safe and perfect for slow mornings.',
      image: '/products/Hand_thrown_Clay_Mug.png',
      region: 'Rajasthan',
      techniques: ['Wheel thrown'],
      isOfficial: true,
      officialGroup: 'week',
      trendScore: 74,
      createdAt: days(2),
    },
    {
      id: 'official-4',
      name: 'Carved Sheesham Coasters (Set of 4)',
      category: 'Woodwork',
      price: 1299,
      stock: 40,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Intricately carved coasters in durable Sheesham wood with natural finish.',
      image: '/products/Carved_Sheesham_Coasters.png',
      region: 'Saharanpur',
      techniques: ['Wood carving'],
      isOfficial: true,
      officialGroup: 'week',
      trendScore: 68,
      createdAt: days(1),
    },
    {
      id: 'official-5',
      name: 'Terracotta Planter',
      category: 'Pottery',
      price: 749,
      stock: 50,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Breathable terracotta planter with drainage—ideal for succulents and herbs.',
      image: '/products/Terracotta_Planter.png',
      region: 'West Bengal',
      techniques: ['Terracotta'],
      isOfficial: true,
      officialGroup: 'forYou',
      trendScore: 51,
      createdAt: days(9),
    },
    {
      id: 'official-6',
      name: 'Woven Cane Basket',
      category: 'Other',
      price: 999,
      stock: 27,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Lightweight, multi-purpose cane basket—sustainably sourced and hand woven.',
      image: '/products/Woven_Cane_Basket.png',
      region: 'Assam',
      techniques: ['Cane weaving'],
      isOfficial: true,
      officialGroup: 'week',
      trendScore: 72,
      createdAt: days(4),
    },
    {
      id: 'official-7',
      name: 'Filigree Silver Earrings',
      category: 'Jewelry',
      price: 2499,
      stock: 15,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Delicate filigree work earrings crafted in sterling silver.',
      image: '/products/Filigree_Silver_Earrings.png',
      region: 'Cuttack',
      techniques: ['Filigree'],
      isOfficial: true,
      officialGroup: 'forYou',
      trendScore: 58,
      createdAt: days(7),
    },
    {
      id: 'official-8',
      name: 'Block-printed Table Runner',
      category: 'Textiles',
      price: 1399,
      stock: 22,
      sellerId: null,
      sellerName: 'Artifex™ Official',
      description: 'Hand block-printed cotton runner with natural dyes.',
      image: '/products/Block_printed_Table_Runner.png',
      region: 'Jaipur',
      techniques: ['Block printing'],
      isOfficial: true,
      officialGroup: 'week',
      trendScore: 66,
      createdAt: days(5),
    },
  ]
}

export function ProductsProvider({ children }) {
  const [products, setProducts] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
      // If empty storage, seed official products once
      const seeded = seedOfficialProducts()
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded))
        localStorage.setItem(SEED_FLAG, '1')
      } catch {}
      return seeded
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
