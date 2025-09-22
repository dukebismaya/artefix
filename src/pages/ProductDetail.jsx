import { useParams, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { estimateShipping, formatEta, detectZipViaGeolocation } from '../utils/shipping.js'
import { useMemo, useState, useEffect } from 'react'
import SharePoster from '../components/SharePoster.jsx'
import { formatINR } from '../utils/format.js'
import { useToast } from '../components/Toast.jsx'
import { useUI } from '../context/UIContext.jsx'
import DirectChat from '../components/DirectChat.jsx'
import YouTubeLazy from '../components/YouTubeLazy.jsx'
import GenericEmbedLazy from '../components/GenericEmbedLazy.jsx'

export default function ProductDetail() {
  const { id } = useParams()
  const { products, updateProduct } = useProducts()
  const { auth, currentUser, users } = useAuth()
  const nav = useNavigate()
  const product = products.find(p => p.id === id)
  const [qty, setQty] = useState(1)
  const user = currentUser()
  const { push } = useToast()
  const { addToCart, toggleWishlist, wishlist, markViewed } = useUI()
  const isSeller = auth?.role === 'seller'
  const isOwnerSeller = isSeller && product && product.sellerId === user?.id

  // Track view for personalization
  useEffect(() => {
    if (product?.id) markViewed(product.id)
  }, [product?.id])

  // Try to derive origin ZIP from seller's default address if this user is the owner; else fallback
  // Derive origin address
  const originAddress = useMemo(() => {
    if (isOwnerSeller) {
      const list = user?.addresses || []
      return list.find(a => a.id === user?.defaultAddressId) || list[0] || null
    }
    // Buyer view: fetch seller's default address from users.sellers
    const seller = (users?.sellers || []).find(s => s.id === product?.sellerId)
    if (seller) {
      const list = seller.addresses || []
      return list.find(a => a.id === seller.defaultAddressId) || list[0] || null
    }
    return null
  }, [isOwnerSeller, user?.addresses, user?.defaultAddressId, users?.sellers, product?.sellerId])
  const originZip = originAddress?.zip || null
  const originCity = [originAddress?.city, originAddress?.state].filter(Boolean).join(', ')
  const seller = (users?.sellers || []).find(s => s.id === product?.sellerId)
  const sellerVideo = seller?.introVideoUrl || ''

  const [zip, setZip] = useState('')
  const [shipInfo, setShipInfo] = useState(null)
  const [locLoading, setLocLoading] = useState(false)

  function checkDelivery() {
    const res = estimateShipping({ fromZip: originZip || '560001', toZip: zip, weightKg: 0.7 })
    setShipInfo(res)
  }

  async function useMyLocation() {
    try {
      setLocLoading(true)
      const pin = await detectZipViaGeolocation()
      setZip(pin)
      const res = estimateShipping({ fromZip: originZip || '560001', toZip: pin, weightKg: 0.7 })
      setShipInfo(res)
    } catch (e) {
      try { push(e?.message || 'Could not detect location', 'error') } catch {}
    } finally {
      setLocLoading(false)
    }
  }

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
    if (!auth) {
      try { push('Please login to purchase', 'info') } catch {}
      nav('/login-buyer')
      return
    }
    if (isOwnerSeller) {
      try { push("You can't purchase your own product", 'error') } catch {}
      return
    }
    nav('/checkout', { state: { productId: product.id, qty: Number(qty) } })
  }

  function onAddToCart() {
    if (!auth) {
      try { push('Please login to add to cart', 'info') } catch {}
      nav('/login-buyer')
      return
    }
    if (isOwnerSeller) {
      try { push("You can't add your own product to cart", 'error') } catch {}
      return
    }
    addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, qty: Number(qty) || 1 })
    try { push('Added to cart', 'success') } catch {}
  }
  function onToggleWish() {
    if (!auth) {
      try { push('Please login to manage wishlist', 'info') } catch {}
      nav('/login-buyer')
      return
    }
    toggleWishlist(product.id)
    try { push(wished ? 'Removed from wishlist' : 'Added to wishlist', 'info') } catch {}
  }

  // Seller inventory management state
  const [addStock, setAddStock] = useState(1)
  const [newPrice, setNewPrice] = useState(product ? String(product.price ?? '') : '')
  const [savedMsg, setSavedMsg] = useState('')
  const [showPoster, setShowPoster] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const productUrl = `${location.origin}/product/${product?.id}`

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
          <div className="mt-1 text-xs text-gray-400">Sold by {isOwnerSeller ? 'You' : (users?.sellers?.find(s=>s.id===product.sellerId)?.name || product.sellerName || 'Artisan')}</div>
          {sellerVideo && (
            <div className="mt-3">
              <div className="text-sm font-medium">Meet the Artisan</div>
              {sellerVideo.includes('youtube.com') || sellerVideo.includes('youtu.be') ? (
                <div className="rounded-xl overflow-hidden bg-black mt-1" title="This will load YouTube (third-party) when you click.">
                  <YouTubeLazy url={sellerVideo} storageKey={`product:${product.id}:sellerVideo`} />
                </div>
              ) : (/vimeo\.com\//i.test(sellerVideo)) ? (
                <div className="rounded-xl overflow-hidden bg-black mt-1" title="This will load Vimeo (third-party) when you click.">
                  <GenericEmbedLazy src={toVimeoEmbed(sellerVideo)} storageKey={`product:${product.id}:sellerVideo:vimeo`} title="Vimeo video" allow="autoplay; fullscreen; picture-in-picture" />
                </div>
              ) : (/drive\.google\.com\//i.test(sellerVideo)) ? (
                <div className="rounded-xl overflow-hidden bg-black mt-1" title="This will load Google Drive (third-party) when you click.">
                  <GenericEmbedLazy src={toDriveEmbed(sellerVideo)} storageKey={`product:${product.id}:sellerVideo:drive`} title="Drive video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />
                </div>
              ) : (
                <video className="mt-1 rounded-xl w-full" src={sellerVideo} controls playsInline preload="none" />
              )}
            </div>
          )}
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
          {originCity && (
            <div className="mt-3 text-xs text-gray-400">Ships from {originCity} {originZip ? `• ZIP ${originZip}` : ''}</div>
          )}
          {isOwnerSeller && !originZip && (
            <div className="mt-2 text-xs text-amber-300">Set a default address in your <a className="underline" href="/profile">Profile › Addresses</a> to enable accurate delivery ETA.</div>
          )}
          {/* Delivery serviceability check: hide for owner seller */}
          {!isOwnerSeller && (
          <div className="mt-3 flex items-center gap-2">
            <input
              className="input max-w-[200px]"
              placeholder="Enter delivery ZIP"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
              inputMode="numeric"
            />
            <button className="btn btn-outline" type="button" onClick={checkDelivery}>Check delivery</button>
            <button className="btn btn-outline" type="button" onClick={useMyLocation} disabled={locLoading}>{locLoading ? 'Detecting…' : 'Use my location'}</button>
          </div>
          )}
          {shipInfo && (
            <div className="mt-2 text-sm">
              {shipInfo.serviceable
                ? <span>Estimated delivery: <span className="text-teal-300">{formatEta(shipInfo.days)}</span> • Shipping: <span className="text-teal-300">₹{shipInfo.cost}</span></span>
                : <span className="text-rose-300">Not serviceable: {shipInfo.reason || 'Unavailable'}</span>
              }
            </div>
          )}

          {isOwnerSeller ? (
            <div className="mt-6 card p-4">
              <h3 className="section-title mb-2">Inventory</h3>
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
              <div className="mt-4">
                <button className="btn btn-outline" type="button" onClick={() => setShowPoster(true)}>Create Share Poster</button>
              </div>
            </div>
          ) : (
            <div className="mt-6 card p-4">
              <h3 className="section-title mb-2">Buy</h3>
              <div className="text-xs text-gray-400">Estimated delivery: <span className="text-gray-200">{shipInfo?.serviceable ? formatEta(shipInfo.days) : '3–6 days (Standard)'}</span></div>
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
                <button className="btn btn-secondary" onClick={onAddToCart} disabled={outOfStock || isOwnerSeller}>Add to Cart</button>
                <button className="btn btn-outline" onClick={onToggleWish}>
                  <ion-icon name={wished ? 'heart' : 'heart-outline'}></ion-icon>
                  <span className="ml-2">{wished ? 'Wishlisted' : 'Wishlist'}</span>
                </button>
                <button className="btn btn-primary text-white" disabled={outOfStock || isOwnerSeller} onClick={goToCheckout}>
                  {outOfStock ? 'Out of Stock' : 'Buy Now'}
                </button>
              </div>
              <div className="mt-3">
                <button className="btn btn-secondary" type="button" onClick={() => setShowPoster(true)}>Share Poster</button>
                {product?.sellerId && (
                  <button className="btn btn-outline ml-2" type="button" onClick={() => setShowChat(true)}>Chat with Artisan</button>
                )}
                <button className="btn btn-outline ml-2" type="button" title="Ask Artemis about this product"
                        onClick={() => window.dispatchEvent(new CustomEvent('artemis:open', { detail: { productId: product?.id } }))}>
                  Ask Artemis
                </button>
              </div>
            </div>
          )}
          {showPoster && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setShowPoster(false)} />
              <div className="relative z-10 card p-4 max-w-[720px] w-full">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="section-title">Share Poster</h4>
                  <button className="btn btn-outline btn-sm" onClick={() => setShowPoster(false)}>Close</button>
                </div>
                <SharePoster product={product} shareUrl={productUrl} />
              </div>
            </div>
          )}
          {showChat && auth?.role==='buyer' && product?.sellerId && (
            <DirectChat
              buyerId={user?.id}
              sellerId={product?.sellerId}
              productId={product?.id}
              sellerName={users?.sellers?.find(s=>s.id===product?.sellerId)?.name || 'Artisan'}
              onClose={() => setShowChat(false)}
            />
          )}
        </div>
      </div>
    </section>
  )
}

// YouTube embed helpers moved to YouTubeLazy component

function toVimeoEmbed(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('vimeo.com') && !u.hostname.includes('player')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://player.vimeo.com/video/${id}`
    }
    if (u.hostname.includes('player.vimeo.com')) return url
  } catch {}
  return url
}
function toDriveEmbed(url) {
  try {
    const u = new URL(url)
    // Extract file id from /file/d/{id}/... or from ?id=...
    let fileId = null
    if (u.pathname.startsWith('/file/d/')) {
      const parts = u.pathname.split('/') // ['', 'file', 'd', '{id}', 'view' | ...]
      fileId = parts[3] || null
    } else {
      fileId = u.searchParams.get('id')
    }
    if (fileId) {
      // Preserve Google's resource key (and a couple of safe params) to avoid 404 after the 2021 security update
      const qp = new URLSearchParams()
      const resourceKey = u.searchParams.get('resourcekey')
      const authuser = u.searchParams.get('authuser')
      if (resourceKey) qp.set('resourcekey', resourceKey)
      if (authuser) qp.set('authuser', authuser)
      const qs = qp.toString()
      return `https://drive.google.com/file/d/${fileId}/preview${qs ? `?${qs}` : ''}`
    }
  } catch {}
  return url
}
