import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { useMemo } from 'react'
import { useToast } from '../components/Toast.jsx'
import { formatINR } from '../utils/format.js'

export default function BuyerDashboard() {
  const { currentUser } = useAuth()
  const user = currentUser()
  const { orders, updateOrder } = useOrders()
  const { products, incrementStock } = useProducts()
  const { push } = useToast()
  const myOrders = orders.filter(o => o.buyerId === user?.id)

  const fmt = (n) => formatINR(n)
  const eta = (o) => {
    // simple ETA based on shippingMethod
    const days = o.shippingMethod === 'Express' ? 2 : 5
    const d = new Date(o.createdAt)
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString()
  }

  function cancelOrder(o) {
    if (!o || !['PENDING_PACK'].includes(o.status)) return
    const ok = confirm('Cancel this order? Stock will be restored.')
    if (!ok) return
    updateOrder(o.id, { status: 'CANCELLED' })
    incrementStock(o.productId, o.qty)
    push('Order cancelled', 'success')
  }

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <h2 className="text-2xl font-bold gradient-text">Welcome, {user?.name || 'Buyer'}</h2>
      <p className="text-sm text-gray-400">Track your purchases and discover new artisan products.</p>

      <div className="mt-6 card p-5">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Your Orders</h3>
          <Link to="/marketplace" className="btn btn-primary text-white">Shop More</Link>
        </div>
        {myOrders.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No orders yet. Explore the <Link to="/marketplace" className="text-teal-300">marketplace</Link>.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {myOrders.map(o => {
              const p = products.find(x => x.id === o.productId)
              const img = p?.image
              const total = o.amounts?.total ?? (Number(p?.price||0) * Number(o.qty||0))
              const badgeClass = o.status === 'PENDING_PACK' ? 'bg-yellow-500/20 text-yellow-300' :
                                 o.status === 'PACKED' ? 'bg-blue-500/20 text-blue-300' :
                                 o.status === 'CANCELLED' ? 'bg-rose-600/20 text-rose-300' : 'bg-teal-600/20 text-teal-300'
              return (
                <li key={o.id} className="border border-gray-800/60 rounded-xl p-3">
                  <div className="flex gap-3">
                    <div className="h-20 w-24 rounded-lg overflow-hidden bg-gray-800/60 flex-shrink-0">
                      {img ? <img src={img} alt={p?.name} className="h-full w-full object-cover"/> : <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No image</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">{p?.name || 'Product'}</div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass}`}>{o.status.replace('_',' ')}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-gray-400">Qty: {o.qty} • Order Total: {fmt(total)} • Paid via {o.paymentMethod}</div>
                      {o.status !== 'CANCELLED' && (
                        <div className="mt-1 text-xs text-gray-400">Arriving by <span className="text-gray-200">{eta(o)}</span></div>
                      )}
                      <div className="mt-2 text-xs text-gray-500">Ship to: {o.address?.name}, {o.address?.line1}, {o.address?.city}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    {o.status === 'PENDING_PACK' && (
                      <button className="btn btn-outline" onClick={() => cancelOrder(o)}>Cancel Order</button>
                    )}
                    <Link className="btn btn-secondary" to={`/order/${o.id}`}>Order Details</Link>
                    <Link className="btn btn-outline" to={`/product/${o.productId}`}>View Product</Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
