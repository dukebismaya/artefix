import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useUI } from '../context/UIContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR } from '../utils/format.js'
import { useToast } from '../components/Toast.jsx'
import QRCode from 'qrcode'

export default function CheckoutCart() {
  const { cart, clearCart } = useUI()
  const { products, decrementStock } = useProducts()
  const { createOrder } = useOrders()
  const { currentUser } = useAuth()
  const user = currentUser()
  const nav = useNavigate()
  const { push } = useToast()

  const items = useMemo(() => cart.map(ci => {
    const p = products.find(pr => pr.id === ci.id)
    if (!p) return null
    const qty = Math.max(1, Math.min(Number(ci.qty || 1), Number(p.stock || 0)))
    return { product: p, qty }
  }).filter(Boolean), [cart, products])

  const amounts = useMemo(() => {
    const subtotal = items.reduce((s, it) => s + Number(it.product.price || 0) * it.qty, 0)
    const shipping = subtotal > 0 ? 5 : 0
    const tax = subtotal * 0.08
    const total = Math.max(0, subtotal + shipping + tax)
    return { subtotal, shipping, tax, total }
  }, [items])

  const defaultAddress = useMemo(() => {
    if (!user) return null
    const arr = user.addresses || []
    return arr.find(a => a.id === user.defaultAddressId) || arr[0] || null
  }, [user])
  const [address, setAddress] = useState(() => (defaultAddress ? { ...defaultAddress } : { name: user?.name || '', line1: '', line2: '', city: '', state: '', zip: '', country: 'India' }))
  const [paymentMethod, setPaymentMethod] = useState('Card')
  const [card, setCard] = useState({ number: '', name: user?.name || '', expiry: '', cvv: '' })
  const [upi, setUpi] = useState({ vpa: '', note: 'ArtisanAI cart order' })
  const [upiUri, setUpiUri] = useState('')
  const [upiQr, setUpiQr] = useState('')
  const [upiConfirmed, setUpiConfirmed] = useState(false)
  const amountStr = useMemo(() => String(amounts.total.toFixed(2)), [amounts.total])
  const [submitting, setSubmitting] = useState(false)
  const savedUpis = useMemo(() => (user?.paymentMethods || []).filter(pm => pm.type === 'UPI'), [user])

  useEffect(() => {
    if (items.length === 0) nav('/cart', { replace: true })
  }, [items.length, nav])

  if (items.length === 0) return null

  useEffect(() => {
    // Prefill address when user has a default address and current form is empty
    if (defaultAddress && !(address?.line1)) {
      setAddress({ ...defaultAddress })
    }
  }, [defaultAddress])

  useEffect(() => {
    // derive UPI link
    if (!upi.vpa || amounts.total <= 0) { setUpiUri(''); setUpiQr(''); return }
    const params = new URLSearchParams({ pa: upi.vpa, pn: address.name || 'Artisan Seller', am: amountStr, cu: 'INR', tn: upi.note || 'ArtisanAI cart order' })
    const uri = `upi://pay?${params.toString()}`
    setUpiUri(uri)
    let active = true
    async function gen(){
      try { const url = await QRCode.toDataURL(uri, { margin: 1, width: 220 }); if (active) setUpiQr(url) } catch { if (active) setUpiQr('') }
    }
    gen()
    return () => { active = false }
  }, [upi.vpa, upi.note, address.name, amountStr])

  useEffect(() => {
    // If UPI selected and there is a saved UPI and no VPA typed, prefill with first saved
    if (paymentMethod === 'UPI' && !upi.vpa && savedUpis.length > 0) {
      const pm = savedUpis[0]
      setUpi(u => ({ ...u, vpa: pm.vpa || u.vpa, note: u.note || pm.note || u.note }))
    }
  }, [paymentMethod, savedUpis, upi.vpa])

  function placeAll(e) {
    e.preventDefault()
    if (submitting) return
    if (paymentMethod === 'UPI' && !upiConfirmed) return
    setSubmitting(true)
    setTimeout(() => {
      // Create an order per item to keep seller flow unchanged
      items.forEach(({ product, qty }) => {
        createOrder({
          productId: product.id,
          sellerId: product.sellerId || null,
          buyerId: user?.id || null,
          qty,
          address,
          shippingMethod: 'Standard',
          promoCode: null,
          amounts: { price: product.price, subtotal: product.price * qty, discount: 0, shipping: 0, tax: 0, total: product.price * qty },
          paymentMethod,
          paymentInfo: paymentMethod === 'Card'
            ? { status: 'PAID', method: 'Card', last4: (card.number || '').replace(/\D/g, '').slice(-4) }
            : paymentMethod === 'UPI'
              ? { status: 'PAID', method: 'UPI', vpa: upi.vpa }
              : { status: 'COD_PENDING', method: 'Cash on Delivery' },
        })
        decrementStock(product.id, qty)
      })
      clearCart()
      try { push('Order placed for all cart items', 'success') } catch {}
      nav('/buyer', { replace: true })
    }, 700)
  }

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Checkout All</h2>
        <Link to="/cart" className="text-sm text-teal-300 hover:underline">Back to cart</Link>
      </div>
      <form onSubmit={placeAll} className="mt-4 grid md:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-3">Items</h3>
          <ul className="space-y-3">
            {items.map(({ product, qty }) => (
              <li key={product.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{product.name}</div>
                  <div className="text-xs text-gray-400">Qty: {qty} • {formatINR(product.price)} each</div>
                </div>
                <div className="font-semibold">{formatINR(product.price * qty)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(amounts.subtotal)}</span></div>
            <div className="flex justify-between mt-1"><span>Shipping</span><span>{formatINR(amounts.shipping)}</span></div>
            <div className="flex justify-between mt-1"><span>Tax (8%)</span><span>{formatINR(amounts.tax)}</span></div>
            <div className="flex justify-between mt-2 text-lg font-semibold"><span>Total</span><span>{formatINR(amounts.total)}</span></div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-3">Address & Payment</h3>
          <label className="label">Full Name</label>
          <input className="input" value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} />
          <label className="label mt-3">Address Line 1</label>
          <input className="input" value={address.line1} onChange={e => setAddress({ ...address, line1: e.target.value })} />
          <label className="label mt-3">City</label>
          <input className="input" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
          <label className="label mt-3">State</label>
          <input className="input" value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">ZIP</label>
              <input className="input" value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} />
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} />
            </div>
          </div>

          <label className="label mt-4">Payment Method</label>
          <select className="input" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
            <option>Card</option>
            <option>UPI</option>
            <option>Cash on Delivery</option>
          </select>

          {paymentMethod === 'Card' && (
            <div className="mt-3 grid gap-3">
              <div>
                <label className="label">Card Number</label>
                <input className="input" value={card.number} onChange={e => setCard({ ...card, number: e.target.value })} />
              </div>
              <div>
                <label className="label">Name on Card</label>
                <input className="input" value={card.name} onChange={e => setCard({ ...card, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Expiry</label>
                  <input className="input" value={card.expiry} onChange={e => setCard({ ...card, expiry: e.target.value })} />
                </div>
                <div>
                  <label className="label">CVV</label>
                  <input className="input" value={card.cvv} onChange={e => setCard({ ...card, cvv: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'UPI' && (
            <div className="mt-3 grid gap-3">
              {savedUpis.length > 0 && (
                <div>
                  <label className="label">Use saved UPI</label>
                  <select className="input" onChange={e => {
                    const pm = savedUpis.find(p => p.id === e.target.value)
                    if (pm) setUpi(u => ({ ...u, vpa: pm.vpa || u.vpa, note: u.note || pm.note || u.note }))
                  }}>
                    <option value="">Select saved UPI…</option>
                    {savedUpis.map(pm => (
                      <option key={pm.id} value={pm.id}>{pm.label || 'UPI'} • {pm.vpa}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="label">UPI ID (VPA)</label>
                <input className="input" placeholder="username@bank" value={upi.vpa} onChange={e => setUpi({ ...upi, vpa: e.target.value })} />
              </div>
              <div>
                <label className="label">Note (optional)</label>
                <input className="input" value={upi.note} onChange={e => setUpi({ ...upi, note: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {upiUri ? <a className="btn btn-secondary w-full text-center" href={upiUri} onClick={() => push('Opened UPI app', 'info')}>Pay in UPI app</a> : <button className="btn btn-secondary w-full" type="button" disabled>Enter UPI ID</button>}
                {upiUri ? <button type="button" className="btn btn-outline w-full" onClick={() => { navigator.clipboard?.writeText(upiUri); push('UPI link copied', 'success') }}>Copy UPI link</button> : <button className="btn btn-outline w-full" type="button" disabled>Copy UPI link</button>}
              </div>
              <div className="mt-2 text-xs text-gray-400">Scan with UPI app:</div>
              <div className="p-3 rounded-xl bg-gray-900/70 border border-gray-800 text-xs text-gray-400 flex items-center gap-3">
                {upiQr ? (
                  <img src={upiQr} alt="UPI QR" className="h-40 w-40 rounded-lg bg-white p-2" />
                ) : (
                  <div className="h-40 w-40 rounded-lg bg-gray-800" />
                )}
                <div className="flex-1 break-all">{upiUri}</div>
              </div>
              <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" className="h-4 w-4" checked={upiConfirmed} onChange={e => setUpiConfirmed(e.target.checked)} />
                I’ve completed the payment in my UPI app
              </label>
            </div>
          )}

          <button type="submit" className="btn btn-primary text-white mt-5 w-full" disabled={submitting || (paymentMethod === 'UPI' && !upiConfirmed)}>
            {submitting ? 'Processing…' : (paymentMethod === 'UPI' ? `Confirm Payment ${formatINR(amounts.total)}` : `Pay ${formatINR(amounts.total)}`)}
          </button>
        </div>
      </form>
    </section>
  )
}
