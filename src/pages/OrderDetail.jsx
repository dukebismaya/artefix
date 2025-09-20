import { Link, useNavigate, useParams } from 'react-router-dom'
import { useOrders } from '../context/OrdersContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR } from '../utils/format.js'

function fmt(n) { return formatINR(n) }

export default function OrderDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const { currentUser } = useAuth()
  const me = currentUser()
  const { orders, updateOrder } = useOrders()
  const { products, incrementStock } = useProducts()
  const order = orders.find(o => o.id === id)

  if (!order || order.buyerId !== me?.id) {
    return (
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        <p className="text-gray-400">Order not found.</p>
      </section>
    )
  }

  const product = products.find(p => p.id === order.productId)
  const amounts = order.amounts || { subtotal: (Number(product?.price||0) * order.qty), discount: 0, shipping: 5, tax: 0, total: (Number(product?.price||0) * order.qty) + 5 }

  const timeline = [
    { key: 'PENDING_PACK', label: 'Order placed', desc: 'We notified the seller to pack your order.' },
    { key: 'PACKED', label: 'Packed by seller', desc: 'Order packed and ready to ship.' },
    { key: 'SHIPPED', label: 'Shipped', desc: 'On the way to you.' },
    { key: 'DELIVERED', label: 'Delivered', desc: 'Package delivered.' },
  ]
  const statusIdx = timeline.findIndex(t => t.key === order.status)

  const canCancel = order.status === 'PENDING_PACK'
  const canReturn = order.status === 'DELIVERED' && !order.returned

  function onCancel() {
    if (!canCancel) return
    if (!confirm('Cancel this order?')) return
    updateOrder(order.id, { status: 'CANCELLED' })
    incrementStock(order.productId, order.qty)
  }

  function onReturn() {
    if (!canReturn) return
    if (!confirm('Request a return/refund?')) return
    updateOrder(order.id, { returned: true, status: 'RETURN_REQUESTED' })
    // For demo, immediately approve and restock
    setTimeout(() => {
      updateOrder(order.id, { status: 'RETURNED_REFUNDED' })
      incrementStock(order.productId, order.qty)
    }, 600)
  }

  const badgeClass = order.status === 'PENDING_PACK' ? 'bg-yellow-500/20 text-yellow-300' :
                     order.status === 'PACKED' ? 'bg-blue-500/20 text-blue-300' :
                     order.status === 'SHIPPED' ? 'bg-purple-500/20 text-purple-300' :
                     order.status === 'DELIVERED' ? 'bg-teal-600/20 text-teal-300' :
                     order.status === 'CANCELLED' ? 'bg-rose-600/20 text-rose-300' : 'bg-gray-600/20 text-gray-300'

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Order Details</h2>
        <Link to="/buyer" className="text-sm text-teal-300 hover:underline">Back to orders</Link>
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card p-5">
          <div className="flex items-start gap-3">
            <div className="h-24 w-28 rounded-lg overflow-hidden bg-gray-800/60 flex-shrink-0">
              {product?.image ? <img src={product.image} alt={product?.name} className="h-full w-full object-cover"/> : <div className="h-full w-full flex items-center justify-center text-xs text-gray-500">No image</div>}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium truncate">{product?.name || 'Product'}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${badgeClass}`}>{order.status.replace('_',' ')}</span>
              </div>
              <div className="mt-0.5 text-xs text-gray-400">Qty: {order.qty} • Paid via {order.paymentMethod}</div>
              <div className="mt-1 text-xs text-gray-500">Ship to: {order.address?.name}, {order.address?.line1}, {order.address?.city}</div>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="section-title mb-3">Timeline</h3>
            <ol className="relative border-s border-gray-800/60 ps-4 space-y-3">
              {timeline.map((t, idx) => {
                const done = statusIdx >= idx
                return (
                  <li key={t.key} className="ms-2">
                    <span className={`absolute -start-1.5 mt-1 h-3 w-3 rounded-full border ${done ? 'bg-teal-400 border-teal-300' : 'bg-gray-700 border-gray-600'}`}></span>
                    <div className={`text-sm ${done ? 'text-gray-100' : 'text-gray-400'}`}>{t.label}</div>
                    <div className="text-xs text-gray-500">{t.desc}</div>
                  </li>
                )
              })}
            </ol>
          </div>

          {order.shipping?.trackingId && (
            <div className="mt-4">
              <h3 className="section-title mb-2">Shipping</h3>
              <div className="text-xs text-gray-300">Courier: {order.shipping.courier}</div>
              <div className="text-xs text-gray-300">Tracking ID: {order.shipping.trackingId}</div>
              {order.shipping.eta && <div className="text-xs text-gray-300">ETA: {order.shipping.eta}</div>}
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            {canCancel && <button className="btn btn-outline" onClick={onCancel}>Cancel Order</button>}
            {canReturn && <button className="btn btn-secondary" onClick={onReturn}>Request Return</button>}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Invoice</h3>
          <div className="text-sm grid gap-1">
            <div className="flex justify-between"><span>Item price</span><span>{fmt(product?.price)}</span></div>
            <div className="flex justify-between"><span>Quantity</span><span>{order.qty}</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>{fmt(amounts.subtotal)}</span></div>
            {amounts.discount > 0 && <div className="flex justify-between text-teal-300"><span>Discount</span><span>-{fmt(amounts.discount)}</span></div>}
            <div className="flex justify-between"><span>Shipping</span><span>{fmt(amounts.shipping)}</span></div>
            <div className="flex justify-between text-gray-300"><span>Tax</span><span>{fmt(amounts.tax)}</span></div>
            <div className="flex justify-between text-lg font-semibold mt-2"><span>Total</span><span>{fmt(amounts.total)}</span></div>
          </div>
          <div className="mt-4 text-xs text-gray-400">Order ID: {order.id}</div>
          <div className="text-xs text-gray-400">Placed on: {new Date(order.createdAt).toLocaleString()}</div>
        </div>
      </div>
    </section>
  )
}
