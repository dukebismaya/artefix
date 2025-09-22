import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR } from '../utils/format.js'
import { useUI } from '../context/UIContext.jsx'
import { useToast } from './Toast.jsx'

export default function ProductCard({ product, disableActions = false, badgeLabel, showDiscountBadge = true }) {
  // No local AI modal; AI Studio is global
  const { removeProduct } = useProducts()
  const { auth, currentUser } = useAuth()
  const { addToCart, toggleWishlist, wishlist } = useUI()
  const { push } = useToast()
  const me = currentUser?.()
  const navigate = useNavigate()
  const isSeller = auth?.role === 'seller'
  const canManage = !disableActions && isSeller && me?.id && product.sellerId === me.id
  const isOwner = canManage

  function onDelete() {
    const ok = confirm(`Delete \"${product.name}\"? This cannot be undone.`)
    if (ok) removeProduct(product.id)
  }

  const outOfStock = Number(product.stock || 0) <= 0
  const wished = wishlist?.includes(product.id)

  function onAddToCart() {
    if (!auth) {
      try { push('Please login to add to cart', 'info') } catch {}
      navigate('/login-buyer')
      return
    }
    if (isOwner) {
      try { push("You can't add your own product to cart", 'error') } catch {}
      return
    }
    addToCart({ id: product.id, name: product.name, price: product.price, image: product.image, qty: 1 })
    try { push('Added to cart', 'success') } catch {}
  }

  function onToggleWish() {
    if (!auth) {
      try { push('Please login to manage wishlist', 'info') } catch {}
      navigate('/login-buyer')
      return
    }
    toggleWishlist(product.id)
    try { push(wished ? 'Removed from wishlist' : 'Added to wishlist', 'info') } catch {}
  }

  const originalPrice = product.price
  const markedUpPrice = originalPrice * 1.3
  const discountPercentage = Math.round(((markedUpPrice - originalPrice) / markedUpPrice) * 100)

  return (
    <div className="card overflow-hidden group">
      <div className="relative aspect-[4/3] overflow-hidden">
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" decoding="async" fetchpriority="low" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-indigo-100 to-pink-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center text-sm text-gray-500">No image</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        {canManage && (
          <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Link to={`/product/${product.id}`} className="btn btn-secondary px-3 py-1.5">Manage</Link>
            <button className="btn btn-danger px-3 py-1.5" onClick={onDelete}>Delete</button>
          </div>
        )}
        <div className="absolute top-2 left-2">
          {badgeLabel ? (
            <div className="badge bg-sky-600/90 border-sky-400/50 text-white">{badgeLabel}</div>
          ) : showDiscountBadge ? (
            <div className="badge bg-rose-500 border-rose-500/50 text-white">{discountPercentage}% Off</div>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold line-clamp-1">{product.name}</h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{product.category}</p>
        <div className="mt-1 text-[11px] text-gray-400">Sold by {isOwner ? 'You' : (product.sellerName || 'Artisan')}</div>
        <div className="mt-1 text-xs">Stock: <span className={outOfStock ? 'text-rose-400' : 'text-teal-300'}>{product.stock ?? 0}</span></div>
        {product.description && (
          <p className="mt-2 text-sm text-gray-300 line-clamp-2">{product.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{formatINR(originalPrice)}</span>
            <span className="text-sm text-muted line-through">{formatINR(markedUpPrice)}</span>
          </div>
          {!disableActions && (
          <div className="flex items-center gap-2">
            {/* Wishlist */}
            <button
              className="btn btn-outline btn-icon"
              onClick={onToggleWish}
              title={wished ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label="Toggle wishlist"
            >
              <ion-icon name={wished ? 'heart' : 'heart-outline'}></ion-icon>
            </button>

            {/* Add to cart */}
            <button
              className="btn btn-secondary btn-icon"
              onClick={onAddToCart}
              disabled={outOfStock || isOwner}
              title={outOfStock ? 'Out of stock' : (isOwner ? "Can't add own product" : 'Add to cart')}
              aria-label="Add to cart"
            >
              <ion-icon name="cart-outline"></ion-icon>
            </button>

            {/* View */}
            <Link
              to={`/product/${product.id}`}
              className="btn btn-secondary btn-icon"
              title="View details"
              aria-label="View details"
            >
              <ion-icon name="eye-outline"></ion-icon>
            </Link>

            {/* Ask AI removed: replaced by global AI Studio */}
          </div>
          )}
        </div>
      </div>

      {/* Legacy ChatBot removed */}
    </div>
  )
}
