import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useEffect, useMemo, useState } from 'react'
import { formatINR } from '../utils/format.js'
import { estimateShipping, formatEta } from '../utils/shipping.js'
import QRCode from 'qrcode'
import { useToast } from '../components/Toast.jsx'

export default function Checkout() {
  const { state } = useLocation()
  const nav = useNavigate()
  const { products, decrementStock } = useProducts()
  const { createOrder } = useOrders()
  const { removeFromCart } = useUI()
  const { currentUser, users } = useAuth()
  const buyer = currentUser()
  const { push } = useToast()

  const product = useMemo(() => products.find(p => p.id === state?.productId), [products, state])
  const [qty, setQty] = useState(Math.max(1, Number(state?.qty || 1)))
  const [paymentMethod, setPaymentMethod] = useState('Card')
  const [shippingMethod, setShippingMethod] = useState('Standard') // Standard | Express
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Persist buyer address by user id
  const addrKey = buyer?.id ? `apma_addr_${buyer.id}` : null
  const [address, setAddress] = useState(() => {
    if (!buyer) return { name: '', line1: '', line2: '', city: '', state: '', zip: '', country: 'India' }
    // Profile default address if available
    const me = currentUser()
    const def = me?.addresses?.find?.(a => a.id === me?.defaultAddressId)
    if (def) {
      return { name: def.name || buyer?.name || '', line1: def.line1 || '', line2: def.line2 || '', city: def.city || '', state: def.state || '', zip: def.zip || '', country: def.country || 'India' }
    }
    try {
      const raw = localStorage.getItem(`apma_addr_${buyer.id}`)
      if (raw) return JSON.parse(raw)
    } catch {}
    return { name: buyer?.name || '', line1: '', line2: '', city: '', state: '', zip: '', country: 'India' }
  })

  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!product) nav('/marketplace', { replace: true })
  }, [product, nav])

  if (!product) return null

  // Helpers
  const fmt = (n) => formatINR(n)
  const clampQty = (n) => Math.max(1, Math.min(Number(n || 1), Number(product.stock || 1)))
  const luhn = (num) => {
    const s = (num || '').replace(/\s|-/g, '')
    if (!/^\d{13,19}$/.test(s)) return false
    let sum = 0, dbl = false
    for (let i = s.length - 1; i >= 0; i--) {
      let d = Number(s[i])
      if (dbl) { d *= 2; if (d > 9) d -= 9 }
      sum += d; dbl = !dbl
    }
    return sum % 10 === 0
  }

  // Determine origin ZIP from seller's default address
  const originZip = useMemo(() => {
    const sid = product?.sellerId
    if (!sid) return ''
    const seller = (users?.sellers || []).find(s => s.id === sid)
    if (!seller) return ''
    const def = (seller.addresses || []).find(a => a.id === seller.defaultAddressId) || null
    return String(def?.zip || '').trim()
  }, [product?.sellerId, users?.sellers])

  // Shipping estimate from origin to buyer ZIP
  const shippingEst = useMemo(() => {
    const toZip = String(address?.zip || '').trim()
    if (!/^\d{6}$/.test(String(originZip)) || !/^\d{6}$/.test(toZip)) return null
    return estimateShipping({ fromZip: originZip, toZip, weightKg: Number(product?.weightKg || 0.6) })
  }, [originZip, address?.zip, product?.weightKg])

  // Shipping costs based on estimate, with Express multiplier
  const shippingCost = useMemo(() => {
    if (promoApplied?.type === 'FREESHIP') return 0
    if (!shippingEst?.serviceable) return 0
    const base = Number(shippingEst.cost || 0)
    const factor = shippingMethod === 'Express' ? 1.5 : 1
    return Math.round(base * factor)
  }, [shippingEst, shippingMethod, promoApplied])

  const etaLabel = useMemo(() => {
    if (!shippingEst?.serviceable) return ''
    const d = shippingMethod === 'Express' ? Math.max(1, (shippingEst.days || 0) - 1) : (shippingEst.days || 0)
    return formatEta(d)
  }, [shippingEst, shippingMethod])

  // Amounts
  const amounts = useMemo(() => {
    const price = Number(product.price || 0)
    const subtotal = price * qty
    let discount = 0
    if (promoApplied?.type === 'PERCENT') {
      discount += subtotal * (promoApplied.value / 100)
    }
    if (promoApplied?.type === 'BULK5' && qty >= 5) {
      discount += subtotal * 0.05
    }
    const shipping = shippingCost
    const taxable = Math.max(0, subtotal - discount)
    // Flat 8% demo tax
    const tax = taxable * 0.08
    const total = Math.max(0, taxable + shipping + tax)
    return { price, subtotal, discount, shipping, tax, total }
  }, [product.price, qty, promoApplied, shippingCost])

  // Payment details state
  const [card, setCard] = useState({ number: '', name: buyer?.name || '', expiry: '', cvv: '' })
  const [upi, setUpi] = useState({ vpa: '', note: 'ArtisanAI order' })
  const [upiQr, setUpiQr] = useState('')
  const [upiConfirmed, setUpiConfirmed] = useState(false)
  const upiUri = useMemo(() => {
    if (!product) return ''
    // upi://pay?pa=vpa@bank&pn=Name&am=amount&cu=INR&tn=note
    const params = new URLSearchParams({
      pa: upi.vpa || '',
      pn: address.name || 'Artisan Seller',
      am: String(amounts.total.toFixed(2)),
      cu: 'INR',
      tn: upi.note || 'ArtisanAI order',
    })
    return `upi://pay?${params.toString()}`
  }, [upi.vpa, upi.note, address.name, amounts.total, product])

  useEffect(() => {
    let active = true
    async function gen() {
      if (!upiUri) { setUpiQr(''); return }
      try {
        const url = await QRCode.toDataURL(upiUri, { margin: 1, width: 220 })
        if (active) setUpiQr(url)
      } catch {
        if (active) setUpiQr('')
      }
    }
    gen()
    return () => { active = false }
  }, [upiUri])

  useEffect(() => {
    if (addrKey) {
      try { localStorage.setItem(addrKey, JSON.stringify(address)) } catch {}
    }
  }, [address, addrKey])

  function applyPromo() {
    const code = (promoCode || '').trim().toUpperCase()
    const map = {
      'SAVE10': { type: 'PERCENT', value: 10, label: 'Save 10%' },
      'FREESHIP': { type: 'FREESHIP', value: 0, label: 'Free Shipping' },
      'BULK5': { type: 'BULK5', value: 5, label: 'Extra 5% on 5+ qty' },
    }
    if (!code) { setPromoApplied(null); return }
    const p = map[code]
    if (!p) { setPromoApplied({ type: 'INVALID', label: 'Invalid code' }) }
    else { setPromoApplied({ ...p, code }) }
  }

  function validate() {
    const e = {}
    if (!address.name?.trim()) e.name = 'Required'
    if (!address.line1?.trim()) e.line1 = 'Required'
    if (!address.city?.trim()) e.city = 'Required'
    if (!address.state?.trim()) e.state = 'Required'
    if (!address.zip?.trim()) e.zip = 'Required'
    if (!address.country?.trim()) e.country = 'Required'
    if (qty < 1 || qty > Number(product.stock || 0)) e.qty = 'Invalid quantity'
    if (paymentMethod === 'Card') {
      const clean = (card.number || '').replace(/\s|-/g, '')
      if (!luhn(clean)) e.cardNumber = 'Invalid card number'
      if (!card.name?.trim()) e.cardName = 'Name on card required'
      if (!/^\d{2}\/\d{2}$/.test(card.expiry)) e.cardExpiry = 'Use MM/YY'
      if (!/^\d{3,4}$/.test(card.cvv)) e.cardCvv = '3-4 digit CVV'
    } else if (paymentMethod === 'UPI') {
      if (!/^[-._a-zA-Z0-9]+@[a-zA-Z]+$/.test(upi.vpa || '')) e.vpa = 'Enter valid VPA (e.g., name@bank)'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function placeOrder(e) {
    e.preventDefault()
    if (submitting) return
    if (!validate()) return
    setSubmitting(true)
    // Fake payment processing delay
    setTimeout(() => {
      // Create order and decrement stock
      const paymentInfo = paymentMethod === 'Card'
        ? { status: 'PAID', method: 'Card', last4: (card.number || '').replace(/\D/g, '').slice(-4) }
        : paymentMethod === 'UPI'
          ? { status: 'PAID', method: 'UPI', vpa: upi.vpa }
          : { status: 'COD_PENDING', method: 'Cash on Delivery' }

      const order = createOrder({
        productId: product.id,
        sellerId: product.sellerId || null,
        buyerId: buyer?.id || null,
        qty,
        address,
        shippingMethod,
        promoCode: promoApplied?.code || null,
        amounts,
        paymentMethod,
        paymentInfo,
        shippingInfo: shippingEst ? {
          fromZip: originZip || '',
          toZip: String(address?.zip || ''),
          zone: shippingEst.zone,
          days: shippingMethod === 'Express' ? Math.max(1, (shippingEst.days || 0) - 1) : shippingEst.days,
          method: shippingMethod,
          cost: amounts.shipping,
          serviceable: shippingEst.serviceable,
        } : null,
      })
  decrementStock(product.id, qty)
  try { removeFromCart(product.id) } catch {}
  // Show a lightweight success state then navigate
  setSuccess({ id: order.id })
  try { push('Order placed successfully', 'success') } catch {}
      setTimeout(() => nav('/buyer', { replace: true }), 1200)
    }, 600)
  }

  const [success, setSuccess] = useState(null)

  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Checkout</h2>
        <Link to={product ? `/product/${product.id}` : '/marketplace'} className="text-sm text-teal-300 hover:underline">Back to product</Link>
      </div>

      {success && (
        <div className="card p-5 mt-4 border border-teal-700/60">
          <div className="text-teal-300 font-medium">Order placed successfully!</div>
          <div className="text-xs text-gray-400 mt-1">Redirecting to your dashboard…</div>
        </div>
      )}

      <form onSubmit={placeOrder} className="mt-4 grid md:grid-cols-2 gap-5">
        <div className="card p-4">
          <h3 className="section-title mb-3">Shipping Address</h3>
          <label className="label">Full Name</label>
          <input className="input" value={address.name} onChange={e => setAddress({ ...address, name: e.target.value })} placeholder="Your full name" />
          {errors.name && <div className="text-xs text-rose-400 mt-1">{errors.name}</div>}
          <label className="label mt-3">Address Line 1</label>
          <input className="input" value={address.line1} onChange={e => setAddress({ ...address, line1: e.target.value })} placeholder="Street address" />
          {errors.line1 && <div className="text-xs text-rose-400 mt-1">{errors.line1}</div>}
          <label className="label mt-3">Address Line 2</label>
          <input className="input" value={address.line2} onChange={e => setAddress({ ...address, line2: e.target.value })} placeholder="Apt, suite, etc. (optional)" />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">City</label>
              <input className="input" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} />
              {errors.city && <div className="text-xs text-rose-400 mt-1">{errors.city}</div>}
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} />
              {errors.state && <div className="text-xs text-rose-400 mt-1">{errors.state}</div>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div>
              <label className="label">ZIP</label>
              <input className="input" value={address.zip} onChange={e => setAddress({ ...address, zip: e.target.value })} />
              {errors.zip && <div className="text-xs text-rose-400 mt-1">{errors.zip}</div>}
            </div>
            <div>
              <label className="label">Country</label>
              <input className="input" value={address.country} onChange={e => setAddress({ ...address, country: e.target.value })} />
              {errors.country && <div className="text-xs text-rose-400 mt-1">{errors.country}</div>}
            </div>
          </div>
        </div>
        <div>
          <div className="card p-4">
            <h3 className="section-title mb-3">Order Summary</h3>
            <div className="text-sm text-gray-300">{product.name}</div>
            <div className="text-xs text-gray-500">{fmt(product.price)} each</div>
            <div className="flex items-center gap-2 mt-2">
              <label className="label m-0">Quantity</label>
              <div className="flex items-center gap-1.5">
                <button type="button" className="btn btn-outline !px-2 !py-1" onClick={() => setQty(q => clampQty((q||1) - 1))}>-</button>
                <input className="input w-14 h-8 text-center text-sm" type="number" min="1" max={product.stock || 1} value={qty} onChange={e => setQty(clampQty(e.target.value))} />
                <button type="button" className="btn btn-outline !px-2 !py-1" onClick={() => setQty(q => clampQty((q||1) + 1))}>+</button>
              </div>
            </div>
            {errors.qty && <div className="text-xs text-rose-400 mt-1">{errors.qty}</div>}
            <div className="mt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{fmt(amounts.subtotal)}</span></div>
              {amounts.discount > 0 && (
                <div className="flex justify-between text-teal-300"><span>Discount</span><span>-{fmt(amounts.discount)}</span></div>
              )}
              <div className="flex justify-between mt-1"><span>Shipping</span><span>{fmt(amounts.shipping)}</span></div>
              {etaLabel && (
                <div className="mt-1 text-xs text-gray-400">ETA: {etaLabel} {originZip && address?.zip ? `(from ${originZip} → ${String(address.zip).trim()})` : ''}</div>
              )}
              <div className="flex justify-between mt-1 text-gray-300"><span>Tax (8%)</span><span>{fmt(amounts.tax)}</span></div>
              <div className="flex justify-between mt-2 text-lg font-semibold"><span>Total</span><span>{fmt(amounts.total)}</span></div>
            </div>
          </div>
          <div className="card p-4 mt-4">
            <h3 className="section-title mb-3">Delivery & Payment</h3>
            {/* Shipping method */}
            <label className="label">Shipping Method</label>
            <select className="input" value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)}>
              <option value="Standard">Standard (3-6 days) — {fmt(5)}</option>
              <option value="Express">Express (1-2 days) — {fmt(15)}</option>
            </select>
            {etaLabel && (
              <div className="text-xs text-gray-400 mt-1">Estimated delivery: {etaLabel}</div>
            )}

            {/* Promo code */}
            <div className="mt-3">
              <label className="label">Promo Code</label>
              <div className="flex gap-2">
                <input className="input flex-1" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="SAVE10, FREESHIP, BULK5" />
                <button type="button" className="btn btn-outline !px-3 !py-1.5" onClick={applyPromo}>Apply</button>
              </div>
              {promoApplied && promoApplied.type === 'INVALID' && (
                <div className="text-xs text-rose-400 mt-1">Invalid promo code</div>
              )}
              {promoApplied && promoApplied.type !== 'INVALID' && (
                <div className="text-xs text-teal-300 mt-1">Applied: {promoApplied.label}</div>
              )}
            </div>

            {/* Payment method */}
            <label className="label mt-4">Payment Method</label>
            <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option>Card</option>
              <option>UPI</option>
              <option>Cash on Delivery</option>
            </select>

            {paymentMethod === 'Card' && (
              <div className="mt-3 grid gap-3">
                <div>
                  <label className="label">Card Number</label>
                  <input className="input" inputMode="numeric" maxLength={19} placeholder="1234 5678 9012 3456"
                         value={card.number}
                         onChange={(e) => setCard({ ...card, number: e.target.value.replace(/[^\d\s-]/g, '') })} />
                  {errors.cardNumber && <div className="text-xs text-rose-400 mt-1">{errors.cardNumber}</div>}
                </div>
                <div>
                  <label className="label">Name on Card</label>
                  <input className="input" value={card.name} onChange={(e) => setCard({ ...card, name: e.target.value })} />
                  {errors.cardName && <div className="text-xs text-rose-400 mt-1">{errors.cardName}</div>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Expiry (MM/YY)</label>
                    <input className="input" placeholder="MM/YY" value={card.expiry}
                           onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
                    {errors.cardExpiry && <div className="text-xs text-rose-400 mt-1">{errors.cardExpiry}</div>}
                  </div>
                  <div>
                    <label className="label">CVV</label>
                    <input className="input" inputMode="numeric" maxLength={4} placeholder="123"
                           value={card.cvv}
                           onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/[^\d]/g, '') })} />
                    {errors.cardCvv && <div className="text-xs text-rose-400 mt-1">{errors.cardCvv}</div>}
                  </div>
                </div>
              </div>
            )}

            {paymentMethod === 'UPI' && (
              <div className="mt-3 grid gap-3">
                <div>
                  <label className="label">UPI ID (VPA)</label>
                  <input className="input" placeholder="username@bank" value={upi.vpa} onChange={(e) => setUpi({ ...upi, vpa: e.target.value })} />
                  {errors.vpa && <div className="text-xs text-rose-400 mt-1">{errors.vpa}</div>}
                </div>
                <div>
                  <label className="label">Note (optional)</label>
                  <input className="input" placeholder="Payment note" value={upi.note} onChange={(e) => setUpi({ ...upi, note: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a className="btn btn-secondary w-full text-center !py-1.5" href={upiUri} onClick={() => push('Opened UPI app', 'info')}>Pay in UPI app</a>
                  <button type="button" className="btn btn-outline w-full !py-1.5" onClick={() => { navigator.clipboard?.writeText(upiUri); push('UPI link copied', 'success') }}>Copy UPI link</button>
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
                  <input type="checkbox" className="h-4 w-4" checked={upiConfirmed} onChange={(e) => setUpiConfirmed(e.target.checked)} />
                  I’ve completed the payment in my UPI app
                </label>
              </div>
            )}

            <button type="submit" className="btn btn-primary text-white mt-4 w-full" disabled={submitting || (paymentMethod === 'UPI' && !upiConfirmed)}>
              {submitting ? 'Processing…' : (paymentMethod === 'UPI' ? `Confirm Payment ${fmt(amounts.total)}` : `Pay ${fmt(amounts.total)}`)}
            </button>
            <p className="text-xs text-gray-400 mt-2">By placing an order, the seller will be notified to pack and ship to your address.</p>
          </div>
        </div>
      </form>
    </section>
  )
}
