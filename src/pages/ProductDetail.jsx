import { useParams, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useMemo, useState } from 'react'
import { formatINR } from '../utils/format.js'
import { useToast } from '../components/Toast.jsx'
import { useUI } from '../context/UIContext.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const { products, updateProduct } = useProducts()
  const { auth, currentUser } = useAuth()
  const nav = useNavigate()
  const product = products.find(p => p.id === id)
  const [qty, setQty] = useState(1)
  const user = currentUser()
  const { push } = useToast()
  const { addToCart, toggleWishlist, wishlist } = useUI()
  const isSeller = auth?.role === 'seller'
  const isOwnerSeller = isSeller && product && product.sellerId === user?.id

  if (!product) {
    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <p className="text-gray-400">Product not found.</p>
      </section>
    )
  }

  const outOfStock = Number(product.stock || 0) <= 0
  const wished = wishlist?.includes(product.id)

  function goToCheckout() {
    nav('/checkout', { state: { productId: product.id, qty: Number(qty) } })
  }

  function onAddToCart() {
    addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, qty: Number(qty) || 1 })
    try { push('Added to cart', 'success') } catch {}
  }
  function onToggleWish() {
    toggleWishlist(product.id)
    try { push(wished ? 'Removed from wishlist' : 'Added to wishlist', 'info') } catch {}
  }

  // Seller inventory management state
  const [addStock, setAddStock] = useState(1)
  const [newPrice, setNewPrice] = useState(product ? String(product.price ?? '') : '')
  const [savedMsg, setSavedMsg] = useState('')

  function applyAddStock() {
    const inc = Math.max(0, Math.floor(Number(addStock || 0)))
    if (inc <= 0) return
    updateProduct(product.id, { stock: Number(product.stock || 0) + inc })
    setAddStock(1)
    setSavedMsg(`Added +${inc} to stock`)
    try { push('Stock updated', 'success') } catch {}
    setTimeout(() => setSavedMsg(''), 1200)
  }

  function applyNewPrice() {
    const p = Math.max(0, Number(newPrice || 0))
    updateProduct(product.id, { price: p })
    setSavedMsg('Price updated')
    try { push('Price updated', 'success') } catch {}
    setTimeout(() => setSavedMsg(''), 1200)
  }

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card overflow-hidden">
          {product.image ? (
            <img src={product.image} alt={product.name} className="w-full h-auto object-cover" />
          ) : (
            <div className="aspect-[4/3] flex items-center justify-center text-gray-500">No image</div>
          )}
        </div>
        <div>
          <h2 className="text-2xl font-bold">{product.name}</h2>
          <div className="mt-1 text-sm text-gray-400">{product.category}</div>
          <div className="mt-3 text-xl font-semibold">{formatINR(product.price)}</div>
          <div className="mt-1 text-sm">Stock: <span className={outOfStock ? 'text-rose-400' : 'text-teal-300'}>{product.stock ?? 0}</span></div>
          {!isSeller && (
            <div className="mt-2 text-xs text-gray-400 flex flex-wrap gap-2">
              <span className="px-2 py-0.5 rounded-full bg-gray-800/70">Free returns within 7 days</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-800/70">Secure payment</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-800/70">Trusted artisan</span>
            </div>
          )}
          {product.description && <p className="mt-4 text-sm text-gray-300">{product.description}</p>}

          {isSeller ? (
            <div className="mt-6 card p-4">
              <h3 className="section-title mb-2">Inventory</h3>
              {isOwnerSeller ? (
                <>
                  <div className="text-sm text-gray-300">Current Stock: <span className={outOfStock ? 'text-rose-400' : 'text-teal-300'}>{product.stock ?? 0}</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="label">Add Stock</label>
                      <div className="flex gap-2">
                        <input className="input w-28" type="number" min="1" value={addStock} onChange={(e) => setAddStock(e.target.value)} />
                        <button className="btn btn-secondary" onClick={applyAddStock} type="button">Add</button>
                      </div>
                    </div>
                    <div>
                      <label className="label">Update Price (INR)</label>
                      <div className="flex gap-2">
                        <input className="input" type="number" min="0" step="1" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                        <button className="btn btn-secondary" onClick={applyNewPrice} type="button">Save</button>
                      </div>
                    </div>
                  </div>
                  {savedMsg && <div className="text-xs text-teal-300 mt-2">{savedMsg}</div>}
                </>
              ) : (
                <div className="text-sm text-gray-400">You are logged in as a seller. Switch to a buyer account to purchase.</div>
              )}
            </div>
          ) : (
            <div className="mt-6 card p-4">
              <h3 className="section-title mb-2">Buy</h3>
              <div className="text-xs text-gray-400">Estimated delivery: <span className="text-gray-200">3–6 days (Standard)</span></div>
              <div className="flex items-center gap-3">
                <label className="label m-0">Quantity</label>
                <div className="flex items-center gap-2">
                  <button type="button" className="btn btn-outline px-3" onClick={() => setQty(q => Math.max(1, q - 1))}>-</button>
                  <input className="input w-20 text-center" type="number" min="1" max={Math.max(1, product.stock || 1)} value={qty}
                         onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value||1), Number(product.stock||1))))} />
                  <button type="button" className="btn btn-outline px-3" onClick={() => setQty(q => Math.min(Number(product.stock||1), q + 1))}>+</button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button className="btn btn-secondary" onClick={onAddToCart} disabled={outOfStock}>Add to Cart</button>
                <button className="btn btn-outline" onClick={onToggleWish}>
                  <ion-icon name={wished ? 'heart' : 'heart-outline'}></ion-icon>
                  <span className="ml-2">{wished ? 'Wishlisted' : 'Wishlist'}</span>
                </button>
                <button className="btn btn-primary text-white" disabled={outOfStock} onClick={goToCheckout}>
                  {outOfStock ? 'Out of Stock' : 'Buy Now'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
