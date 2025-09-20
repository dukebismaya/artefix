import { Link, useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { formatINR } from '../utils/format.js'
import { useMemo } from 'react'

export default function Cart() {
  const { cart, saved, removeFromCart, clearCart, setCartItemQty, incrementCartItem, decrementCartItem, saveForLater, moveSavedToCart, removeFromSaved } = useUI()
  const { products } = useProducts()
  const nav = useNavigate()

  const enriched = useMemo(() => {
    return cart.map(item => {
      const p = products.find(pr => pr.id === item.id)
      const stock = Number(p?.stock ?? 0)
      const price = Number(p?.price ?? item.price ?? 0)
      return { ...item, price, stock, name: p?.name || item.name, image: p?.image || item.image }
    })
  }, [cart, products])

  const totals = useMemo(() => {
    const subtotal = enriched.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 1), 0)
    const shipping = subtotal > 0 ? 5 : 0
    const tax = subtotal * 0.08
    const total = Math.max(0, subtotal + shipping + tax)
    return { subtotal, shipping, tax, total }
  }, [enriched])

  function goCheckout(item) {
    // Go to single-item checkout, preserving qty
    nav('/checkout', { state: { productId: item.id, qty: Number(item.qty || 1) } })
  }

  if (enriched.length === 0) {
    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <h2 className="text-2xl font-bold gradient-text">Your Cart</h2>
        <div className="card p-6 mt-4 text-center">
          <p className="text-gray-400">Your cart is empty.</p>
          <Link to="/marketplace" className="btn btn-primary text-white mt-3">Shop Now</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Your Cart</h2>
        <button className="btn btn-outline" onClick={clearCart}>Clear Cart</button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          {enriched.map(item => {
            const maxQty = Math.max(1, item.stock || 1)
            return (
              <div key={item.id} className="card p-3 flex items-center gap-3">
                <div className="h-16 w-20 rounded-lg overflow-hidden bg-gray-800/50">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-gray-500">No image</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate leading-tight">{item.name}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Stock: <span className={item.stock > 0 ? 'text-teal-300' : 'text-rose-400'}>{item.stock}</span></div>
                    </div>
                    <div className="font-semibold whitespace-nowrap">{formatINR(item.price)}</div>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-outline !px-2 !py-1" onClick={() => decrementCartItem(item.id)}>-</button>
                      <input className="input w-14 h-8 text-center text-sm" type="number" min={1} max={maxQty} value={item.qty}
                             onChange={e => setCartItemQty(item.id, Math.max(1, Math.min(Number(e.target.value||1), maxQty)))} />
                      <button className="btn btn-outline !px-2 !py-1" onClick={() => incrementCartItem(item.id)}>+</button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-secondary text-sm !px-3 !py-1" onClick={() => goCheckout(item)} disabled={item.stock <= 0}>Checkout</button>
                      <button className="btn btn-outline text-sm !px-2 !py-1" onClick={() => saveForLater(item.id)}>Save</button>
                      <button className="btn btn-danger text-sm !px-3 !py-1" onClick={() => removeFromCart(item.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="card p-4 h-fit">
          <h3 className="section-title mb-2">Summary</h3>
          <div className="text-sm flex justify-between"><span>Subtotal</span><span>{formatINR(totals.subtotal)}</span></div>
          <div className="text-sm flex justify-between mt-1"><span>Shipping</span><span>{formatINR(totals.shipping)}</span></div>
          <div className="text-sm flex justify-between mt-1"><span>Tax (8%)</span><span>{formatINR(totals.tax)}</span></div>
          <div className="text-lg font-semibold flex justify-between mt-2"><span>Total</span><span>{formatINR(totals.total)}</span></div>
          <div className="text-xs text-gray-400 mt-1">Checkout each item separately or all at once.</div>
          <button className="btn btn-primary text-white mt-3 w-full" onClick={() => nav('/checkout-cart')} disabled={enriched.length === 0}>Checkout All</button>
          <Link to="/marketplace" className="btn btn-outline mt-2 w-full">Continue Shopping</Link>
        </aside>
      </div>

      {saved?.length > 0 && (
        <div className="mt-8">
          <h3 className="section-title mb-2">Saved for later</h3>
          <div className="grid gap-3">
            {saved.map(item => (
              <div key={item.id} className="card p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-14 w-18 rounded-lg overflow-hidden bg-gray-800/50">
                    {item.image ? <img src={item.image} alt="saved" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-xs text-gray-500">No image</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate leading-tight">{item.name}</div>
                    <div className="text-xs text-gray-400">{formatINR(item.price || 0)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="btn btn-secondary text-sm !px-3 !py-1" onClick={() => moveSavedToCart(item.id)}>Move</button>
                  <button className="btn btn-danger text-sm !px-3 !py-1" onClick={() => removeFromSaved(item.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
