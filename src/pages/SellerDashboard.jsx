import { useAuth } from '../context/AuthContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { useMemo, useState } from 'react'
import { formatINR } from '../utils/format.js'
import { useToast } from '../components/Toast.jsx'
import { useChat } from '../context/ChatContext.jsx'
import DirectChat from '../components/DirectChat.jsx'

export default function SellerDashboard() {
  const { currentUser, setDefaultAddress, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod } = useAuth()
  const seller = currentUser()
  const { orders, updateOrder } = useOrders()
  const { products, updateProduct, removeProduct } = useProducts()
  const myOrders = orders.filter(o => o.sellerId === seller?.id)
  const myProducts = useMemo(() => products.filter(p => p.sellerId === seller?.id), [products, seller])

  const [editing, setEditing] = useState({}) // id -> { addStock, price }
  const [ship, setShip] = useState({}) // orderId -> { courier, trackingId, eta }
  const { push } = useToast()
  const { userThreads, unreadCount, markSeen } = useChat()
  const threads = seller ? userThreads(seller.id) : []
  const [openThread, setOpenThread] = useState(null)

  function changeEdit(id, patch) {
    setEditing(prev => ({ ...prev, [id]: { addStock: 1, price: '', ...prev[id], ...patch } }))
  }

  function applyAddStock(p) {
    const s = editing[p.id]?.addStock ?? 1
    const inc = Math.max(0, Math.floor(Number(s || 0)))
    if (inc <= 0) return
    updateProduct(p.id, { stock: Number(p.stock || 0) + inc })
    changeEdit(p.id, { addStock: 1 })
  }

  function applyPrice(p) {
    const price = Math.max(0, Number(editing[p.id]?.price ?? p.price ?? 0))
    updateProduct(p.id, { price })
    changeEdit(p.id, { price: '' })
  }

  function markPacked(id) {
    updateOrder(id, { status: 'PACKED' })
    push('Order marked as PACKED', 'success')
  }

  function markShipped(id) {
    const data = ship[id] || {}
    if (!data.courier || !data.trackingId) {
      push('Enter courier and tracking ID', 'error')
      return
    }
    updateOrder(id, { status: 'SHIPPED', shipping: { courier: data.courier, trackingId: data.trackingId, eta: data.eta || '' } })
    push('Shipment created', 'success')
    setShip(prev => ({ ...prev, [id]: { courier: '', trackingId: '', eta: '' } }))
  }

  function markDelivered(id) {
    updateOrder(id, { status: 'DELIVERED', deliveredAt: new Date().toISOString() })
    push('Order marked as DELIVERED', 'success')
  }

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <h2 className="text-2xl font-bold gradient-text">Seller Dashboard</h2>
      <p className="text-sm text-gray-400">New purchases will appear here. Pack and ship to the address provided by the buyer.</p>

      <div className="mt-6 card p-5">
        <h3 className="section-title">Store Settings</h3>
        <div className="grid md:grid-cols-2 gap-4 mt-3">
          <div>
            <div className="font-medium mb-2">Shipping Origin</div>
            {seller?.addresses?.length ? (
              <div className="space-y-2">
                {(seller.addresses||[]).map(a => (
                  <div key={a.id} className={`p-3 rounded border ${seller.defaultAddressId===a.id?'border-teal-600/50 bg-teal-900/10':'border-gray-800/60'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm">
                        <div className="font-medium">{a.label} {seller.defaultAddressId===a.id && <span className="text-xs text-teal-300 ml-1">Default</span>}</div>
                        <div className="text-xs text-gray-400">{a.city}, {a.state} {a.zip}</div>
                      </div>
                      <button className="btn btn-secondary" disabled={seller.defaultAddressId===a.id} onClick={() => setDefaultAddress(a.id)}>Set default</button>
                    </div>
                  </div>
                ))}
                <div className="text-xs text-gray-400">Manage addresses in <a className="underline" href="/profile">Profile › Addresses</a>.</div>
              </div>
            ) : (
              <div className="text-sm text-amber-300">No addresses yet. Add one in <a className="underline" href="/profile">Profile › Addresses</a> to enable delivery ETA.</div>
            )}
            <AddAddressInline />
          </div>
          <div>
            <div className="font-medium mb-2">Payout Methods</div>
            {(seller?.paymentMethods||[]).length ? (
              <div className="space-y-2">
                {(seller.paymentMethods||[]).map(pm => (
                  <div key={pm.id} className={`p-3 rounded border ${seller.defaultPaymentMethodId===pm.id?'border-teal-600/50 bg-teal-900/10':'border-gray-800/60'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{pm.label} {seller.defaultPaymentMethodId===pm.id && <span className="text-xs text-teal-300 ml-1">Default</span>}</div>
                        <div className="text-xs text-gray-400">{pm.type==='UPI' ? `UPI • ${pm.vpa}` : `Card •••• ${pm.last4}`}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="btn btn-secondary" disabled={seller.defaultPaymentMethodId===pm.id} onClick={() => setDefaultPaymentMethod(pm.id)}>Set default</button>
                        <button className="btn btn-danger" onClick={() => removePaymentMethod(pm.id)}>Remove</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">No payout methods yet.</div>
            )}
            <AddPayoutInline onAdd={(data) => addPaymentMethod(data)} />
          </div>
        </div>
      </div>

      <div className="mt-6 card p-5">
        <h3 className="section-title">Buyer Messages</h3>
        {threads.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No messages yet. Buyers can reach you from your product pages.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {threads.map(t => {
              const unread = unreadCount(t.id, seller.id)
              return (
                <li key={t.id} className="p-3 rounded-xl border border-gray-800/60 flex items-center justify-between">
                  <div className="text-sm flex items-center gap-2">
                    <span>Thread with Buyer {t.buyerId.slice(-4)} • {new Date(t.lastMessageAt || t.createdAt).toLocaleString()}</span>
                    {unread > 0 && <span className="bg-rose-500 text-white text-[10px] rounded-full px-2 py-0.5">{unread} new</span>}
                  </div>
                  <button className="btn btn-secondary" onClick={() => { setOpenThread(t); markSeen(t.id, seller.id) }}>Open</button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {openThread && (
        <DirectChat buyerId={openThread.buyerId} sellerId={openThread.sellerId} productId={openThread.productId} sellerName={seller?.name||'Artisan'} onClose={() => setOpenThread(null)} />
      )}

      <div className="mt-6 card p-5">
        <h3 className="section-title">Orders to Fulfill</h3>
        {myOrders.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">No orders yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {myOrders.map(o => {
              const p = products.find(x => x.id === o.productId)
              return (
                <li key={o.id} className="border border-gray-800/60 rounded-xl p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{p?.name || 'Product'} • Qty: {o.qty}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">Status:
                        <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                          o.status === 'PENDING_PACK' ? 'bg-yellow-500/20 text-yellow-300' :
                          o.status === 'PACKED' ? 'bg-blue-500/20 text-blue-300' :
                          o.status === 'SHIPPED' ? 'bg-purple-500/20 text-purple-300' :
                          o.status === 'DELIVERED' ? 'bg-teal-600/20 text-teal-300' :
                          o.status === 'CANCELLED' ? 'bg-rose-600/20 text-rose-300' : 'bg-gray-600/20 text-gray-300'
                        }`}>{o.status.replace('_',' ')}</span>
                      </div>
                      {o.shipping?.trackingId && (
                        <div className="text-xs text-gray-400 mt-1">Tracking: {o.shipping.trackingId} • {o.shipping.courier}{o.shipping.eta ? ` • ETA: ${o.shipping.eta}` : ''}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-2">Ship to:</div>
                      <div className="text-xs text-gray-300">
                        {o.address?.name}<br/>
                        {o.address?.line1}{o.address?.line2 ? `, ${o.address?.line2}` : ''}<br/>
                        {o.address?.city}, {o.address?.state} {o.address?.zip}<br/>
                        {o.address?.country}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 w-full sm:w-auto sm:max-w-xs">
                      <div className="text-xs text-gray-400">Payment: {o.paymentMethod}</div>
                      {o.status === 'PENDING_PACK' && (
                        <button className="btn btn-secondary" onClick={() => markPacked(o.id)}>Mark Packed</button>
                      )}
                      {o.status === 'PACKED' && (
                        <div className="w-full grid grid-cols-1 gap-2">
                          <input className="input" placeholder="Courier (e.g., Bluedart)" value={ship[o.id]?.courier || ''} onChange={(e) => setShip(prev => ({ ...prev, [o.id]: { ...prev[o.id], courier: e.target.value } }))} />
                          <input className="input" placeholder="Tracking ID" value={ship[o.id]?.trackingId || ''} onChange={(e) => setShip(prev => ({ ...prev, [o.id]: { ...prev[o.id], trackingId: e.target.value } }))} />
                          <input className="input" placeholder="ETA (e.g., 25 Sep)" value={ship[o.id]?.eta || ''} onChange={(e) => setShip(prev => ({ ...prev, [o.id]: { ...prev[o.id], eta: e.target.value } }))} />
                          <button className="btn btn-secondary" onClick={() => markShipped(o.id)} type="button">Mark Shipped</button>
                        </div>
                      )}
                      {o.status === 'SHIPPED' && (
                        <button className="btn btn-primary text-white" onClick={() => markDelivered(o.id)} type="button">Mark Delivered</button>
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 card p-5">
        <div className="flex items-center justify-between">
          <h3 className="section-title">Your Listings</h3>
          <a href="/upload" className="btn btn-primary text-white">Add New Product</a>
        </div>
        {myProducts.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">You have not listed any products yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {myProducts.map(p => (
              <li key={p.id} className="border border-gray-800/60 rounded-xl p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-medium">{p.name} <span className="text-xs text-gray-500">({p.category})</span></div>
                    <div className="text-xs text-gray-400">Price: {formatINR(p.price)} • Stock: <span className={Number(p.stock||0) <= 0 ? 'text-rose-400' : 'text-teal-300'}>{p.stock ?? 0}</span></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full sm:w-auto">
                    <div className="flex gap-2">
                      <input className="input w-24" type="number" min="1" value={editing[p.id]?.addStock ?? 1} onChange={(e) => changeEdit(p.id, { addStock: e.target.value })} />
                      <button className="btn btn-secondary" onClick={() => applyAddStock(p)} type="button">Add Stock</button>
                    </div>
                    <div className="flex gap-2">
                      <input className="input" type="number" min="0" step="1" placeholder={`${p.price}`} value={editing[p.id]?.price ?? ''} onChange={(e) => changeEdit(p.id, { price: e.target.value })} />
                      <button className="btn btn-secondary" onClick={() => applyPrice(p)} type="button">Save Price</button>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn btn-danger" onClick={() => { if (confirm(`Delete ${p.name}?`)) removeProduct(p.id) }} type="button">Delete</button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function AddPayoutInline({ onAdd }) {
  const [type, setType] = useState('UPI')
  const [label, setLabel] = useState('UPI')
  const [vpa, setVpa] = useState('')
  const [name, setName] = useState('')
  const [last4, setLast4] = useState('')
  const { push } = useToast()
  function submit(e){
    e.preventDefault()
    const payload = type==='UPI' ? { type, label: label||'UPI', vpa } : { type, label: label||'Card', name, last4: last4.replace(/[^\d]/g,'').slice(0,4) }
    onAdd(payload)
    push('Payout method added','success')
    setVpa(''); setName(''); setLast4('')
  }
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={e=>{ setType(e.target.value); setLabel(e.target.value==='UPI'?'UPI':'Card') }}>
            <option>UPI</option>
            <option>Card</option>
          </select>
        </div>
        <div>
          <label className="label">Label</label>
          <input className="input" value={label} onChange={e=>setLabel(e.target.value)} />
        </div>
      </div>
      {type==='UPI' ? (
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="label">UPI ID (VPA)</label>
            <input className="input" value={vpa} onChange={e=>setVpa(e.target.value)} placeholder="username@bank" />
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <label className="label">Cardholder Name</label>
            <input className="input" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Last 4</label>
            <input className="input" value={last4} onChange={e=>setLast4(e.target.value)} />
          </div>
        </div>
      )}
      <div><button className="btn btn-secondary" type="submit">Add payout method</button></div>
    </form>
  )
}

function AddAddressInline() {
  const { currentUser, addAddress, setDefaultAddress } = useAuth()
  const me = currentUser()
  const [form, setForm] = useState({ label:'Workshop', name: me?.name || '', line1:'', line2:'', city:'', state:'', zip:'', country:'India', phone:'' })
  const { push } = useToast()
  function submit(e){
    e.preventDefault()
    const a = addAddress(form)
    if (!me?.defaultAddressId) setDefaultAddress(a.id)
    push('Address added','success')
    setForm({ label:'Workshop', name: me?.name || '', line1:'', line2:'', city:'', state:'', zip:'', country:'India', phone:'' })
  }
  return (
    <form onSubmit={submit} className="mt-3 grid gap-2">
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Label</label>
          <input className="input" value={form.label} onChange={e=>setForm({ ...form, label:e.target.value })} />
        </div>
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
        </div>
      </div>
      <div>
        <label className="label">Address Line 1</label>
        <input className="input" value={form.line1} onChange={e=>setForm({ ...form, line1:e.target.value })} />
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        <div>
          <label className="label">City</label>
          <input className="input" value={form.city} onChange={e=>setForm({ ...form, city:e.target.value })} />
        </div>
        <div>
          <label className="label">State</label>
          <input className="input" value={form.state} onChange={e=>setForm({ ...form, state:e.target.value })} />
        </div>
        <div>
          <label className="label">ZIP</label>
          <input className="input" value={form.zip} onChange={e=>setForm({ ...form, zip:e.target.value })} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div>
          <label className="label">Country</label>
          <input className="input" value={form.country} onChange={e=>setForm({ ...form, country:e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={e=>setForm({ ...form, phone:e.target.value })} />
        </div>
      </div>
      <div><button className="btn btn-secondary" type="submit">Add shipping address</button></div>
    </form>
  )
}
