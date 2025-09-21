import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'

import { useMemo, useState } from 'react'

export default function Marketplace() {
  const { products } = useProducts()
  const { auth } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initialQ = params.get('q') || ''
  const [q, setQ] = useState(initialQ)
  const [cat, setCat] = useState('All')
  const [region, setRegion] = useState('All')

  const CATEGORIES = useMemo(() => ['All','Pottery','Jewelry','Textiles','Woodwork','Artwork','Other'], [])

  const regions = useMemo(() => {
    const set = new Set(products.map(p => (p.region || '').trim()).filter(Boolean))
    return ['All', ...Array.from(set).sort()]
  }, [products])

  const filtered = useMemo(() => {
    const qlc = q.toLowerCase().trim()
    return products.filter(p => {
      const tks = (p.techniques || []).join(' ').toLowerCase()
      const matchesQ = q ? (
        (p.name || '').toLowerCase().includes(qlc) ||
        (p.description || '').toLowerCase().includes(qlc) ||
        tks.includes(qlc)
      ) : true
      const matchesCat = cat === 'All' ? true : (p.category === cat)
      const matchesRegion = region === 'All' ? true : ((p.region || '') === region)
      return matchesQ && matchesCat && matchesRegion
    })
  }, [products, q, cat, region])

  function onSearchSubmit(e) {
    e.preventDefault()
    navigate(`/marketplace?q=${encodeURIComponent(q)}`)
  }

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold gradient-text-pink">Artisan Marketplace</h2>
          <p className="text-sm text-gray-400">Discover unique handcrafted treasures from talented local artisans.</p>
        </div>
        {auth?.role === 'seller' && (
          <Link to="/upload" className="btn btn-primary text-white">Upload Product</Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-12 gap-3">
        <form className="sm:col-span-6" onSubmit={onSearchSubmit}>
          <input
            className="input"
            placeholder="Search products..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>
        <div className="sm:col-span-3">
          <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <select className="input" value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-14 text-center">
          <p className="text-gray-500">No Products Found</p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(p => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </section>
  )
}
