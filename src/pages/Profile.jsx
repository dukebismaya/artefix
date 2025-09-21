import { useMemo, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useProducts } from '../context/ProductsContext.jsx'
import { formatINR } from '../utils/format.js'

export default function Profile() {
  const { users, auth, currentUser, updateCurrentUser, changePassword, addAddress, updateAddress, removeAddress, setDefaultAddress, addPaymentMethod, removePaymentMethod } = useAuth()
  const me = currentUser()
  const { orders } = useOrders()
  const { wishlist, saved } = useUI()
  const { products } = useProducts()

  const myOrders = useMemo(() => orders.filter(o => o.buyerId === me?.id), [orders, me?.id])

  const [tab, setTab] = useState('overview')
  if (!auth || !me) return null

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        {['overview','addresses','orders','wishlist','saved','payment','security'].map(t => (
          <button key={t} className={`btn ${tab===t?'btn-primary text-white':'btn-secondary'}`} onClick={() => setTab(t)}>{label(t)}</button>
        ))}
      </div>

      <div className="mt-6 card p-5">
        {tab === 'overview' && <Overview me={me} update={updateCurrentUser} />}
        {tab === 'addresses' && <Addresses me={me} add={addAddress} upd={updateAddress} del={removeAddress} setDefault={setDefaultAddress} />}
        {tab === 'orders' && <Orders orders={myOrders} products={products} />}
        {tab === 'wishlist' && <Wishlist ids={wishlist} products={products} />}
        {tab === 'saved' && <Saved saved={saved} products={products} />}
        {tab === 'payment' && <Payment me={me} add={addPaymentMethod} del={removePaymentMethod} />}
        {tab === 'security' && <Security onChangePass={changePassword} />}
      </div>
    </section>
  )
}

function label(t) {
  return t[0].toUpperCase() + t.slice(1)
}

function Overview({ me, update }) {
  const [name, setName] = useState(me.name || '')
  const [email, setEmail] = useState(me.email || '')
  const [phone, setPhone] = useState(me.phone || '')
  const [avatarUrl, setAvatarUrl] = useState(me.avatarUrl || '')
  const [introVideoUrl, setIntroVideoUrl] = useState(me.introVideoUrl || '')
  function save() { update({ name, email, phone, avatarUrl, introVideoUrl }) }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="label">Name</label>
        <input className="input" value={name} onChange={e=>setName(e.target.value)} />
        <label className="label mt-3">Email</label>
        <input className="input" value={email} onChange={e=>setEmail(e.target.value)} />
        <label className="label mt-3">Phone</label>
        <input className="input" value={phone} onChange={e=>setPhone(e.target.value)} />
        <label className="label mt-3">Intro Video URL</label>
        <input className="input" value={introVideoUrl} onChange={e=>setIntroVideoUrl(e.target.value)} placeholder="https://... (MP4, WebM, or YouTube embed)" />
      </div>
      <div>
        <label className="label">Avatar URL</label>
        <input className="input" value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)} />
        <div className="mt-3 h-32 w-32 rounded-xl overflow-hidden bg-gray-800/50">
          {avatarUrl ? <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-xs text-gray-500">No avatar</div>}
        </div>
      </div>
      <div className="sm:col-span-2"><button className="btn btn-primary text-white" onClick={save}>Save</button></div>
    </div>
  )
}

function Addresses({ me, add, upd, del, setDefault }) {
  const [form, setForm] = useState({ label:'Home', name: me.name||'', line1:'', line2:'', city:'', state:'', zip:'', country:'India', phone:'' })
  const list = me.addresses || []
  function submit(e){ e.preventDefault(); add(form); setForm({ label:'Home', name: me.name||'', line1:'', line2:'', city:'', state:'', zip:'', country:'India', phone:'' }) }
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.length === 0 && <div className="text-sm text-gray-400">No addresses.</div>}
        {list.map(a => (
          <div key={a.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{a.label}</div>
              {me.defaultAddressId === a.id && <span className="text-xs text-teal-300">Default</span>}
            </div>
            <div className="mt-1 text-sm text-gray-300">{a.name}</div>
            <div className="text-xs text-gray-400">{a.line1}, {a.city}, {a.state} {a.zip}, {a.country}</div>
            <div className="text-xs text-gray-400">{a.phone}</div>
            <div className="mt-3 flex items-center gap-2">
              <button className="btn btn-secondary" onClick={() => setDefault(a.id)} disabled={me.defaultAddressId === a.id}>Set default</button>
              <button className="btn btn-danger" onClick={() => del(a.id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 card p-4 grid sm:grid-cols-2 gap-3">
        <div>
          <label className="label">Label</label>
          <input className="input" value={form.label} onChange={e=>setForm({ ...form, label:e.target.value })} />
        </div>
        <div>
          <label className="label">Full Name</label>
          <input className="input" value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Address Line 1</label>
          <input className="input" value={form.line1} onChange={e=>setForm({ ...form, line1:e.target.value })} />
        </div>
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
        <div>
          <label className="label">Country</label>
          <input className="input" value={form.country} onChange={e=>setForm({ ...form, country:e.target.value })} />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={e=>setForm({ ...form, phone:e.target.value })} />
        </div>
        <div className="sm:col-span-2"><button className="btn btn-primary text-white">Add Address</button></div>
      </form>
    </div>
  )
}

function Orders({ orders, products }) {
  if (orders.length === 0) return <div className="text-sm text-gray-400">No orders yet.</div>
  return (
    <div className="space-y-3">
      {orders.map(o => {
        const p = products.find(pr => pr.id === o.productId)
        return (
          <div key={o.id} className="card p-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold truncate">{p?.name || 'Item'}</div>
              <div className="text-xs text-gray-400">Qty {o.qty} • {new Date(o.createdAt).toLocaleString()} • {o.status}</div>
            </div>
            <div className="text-sm">{formatINR(o.amounts?.total || 0)}</div>
          </div>
        )
      })}
    </div>
  )
}

function Wishlist({ ids, products }) {
  const list = (ids||[]).map(id => products.find(p => p.id === id)).filter(Boolean)
  if (list.length === 0) return <div className="text-sm text-gray-400">No wishlist items.</div>
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {list.map(p => (
        <div key={p.id} className="card p-4 flex items-center gap-3">
          <div className="h-16 w-20 rounded-lg overflow-hidden bg-gray-800/50">
            {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-xs text-gray-500">No image</div>}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{p.name}</div>
            <div className="text-sm text-gray-400">{formatINR(p.price)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Saved({ saved, products }) {
  const list = (saved||[]).map(it => products.find(p => p.id === it.id) || it)
  if (list.length === 0) return <div className="text-sm text-gray-400">No saved items.</div>
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {list.map(p => (
        <div key={p.id} className="card p-4 flex items-center gap-3">
          <div className="h-16 w-20 rounded-lg overflow-hidden bg-gray-800/50">
            {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <div className="h-full w-full grid place-items-center text-xs text-gray-500">No image</div>}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{p.name}</div>
            <div className="text-sm text-gray-400">{formatINR(p.price || 0)}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Payment({ me, add, del }) {
  const list = me.paymentMethods || []
  const [form, setForm] = useState({ type:'Card', label:'Card', name: me.name||'', last4:'', vpa:'', note:'' })
  function submit(e){ e.preventDefault(); add(form); setForm({ type:'Card', label:'Card', name: me.name||'', last4:'', vpa:'', note:'' }) }
  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.length === 0 && <div className="text-sm text-gray-400">No payment methods.</div>}
        {list.map(pm => (
          <div key={pm.id} className="card p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{pm.label}</div>
              <div className="text-xs text-gray-400">
                {pm.type === 'UPI' ? (
                  <>UPI • {pm.vpa}</>
                ) : (
                  <>Card •••• {pm.last4}</>
                )}
              </div>
            </div>
            <button className="btn btn-danger" onClick={() => del(pm.id)}>Remove</button>
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="mt-4 card p-4 grid gap-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={e=>setForm({ ...form, type: e.target.value, label: e.target.value==='UPI'?'UPI':'Card' })}>
              <option>Card</option>
              <option>UPI</option>
            </select>
          </div>
          <div>
            <label className="label">Label</label>
            <input className="input" value={form.label} onChange={e=>setForm({ ...form, label:e.target.value })} />
          </div>
        </div>
        {form.type === 'UPI' ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">UPI ID (VPA)</label>
              <input className="input" value={form.vpa} onChange={e=>setForm({ ...form, vpa:e.target.value })} placeholder="username@bank" />
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <input className="input" value={form.note} onChange={e=>setForm({ ...form, note:e.target.value })} />
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Cardholder Name</label>
              <input className="input" value={form.name} onChange={e=>setForm({ ...form, name:e.target.value })} />
            </div>
            <div>
              <label className="label">Last 4 digits</label>
              <input className="input" value={form.last4} onChange={e=>setForm({ ...form, last4:e.target.value.replace(/[^\d]/g,'').slice(0,4) })} />
            </div>
          </div>
        )}
        <div><button className="btn btn-primary text-white">Add Payment Method</button></div>
      </form>
    </div>
  )
}

function Security({ onChangePass }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [msg, setMsg] = useState('')
  function submit(e){
    e.preventDefault()
    try { onChangePass(current, next); setMsg('Password changed successfully'); setCurrent(''); setNext('') } catch (e) { setMsg(e.message || 'Error') }
  }
  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label">Current Password</label>
        <input type="password" className="input" value={current} onChange={e=>setCurrent(e.target.value)} />
      </div>
      <div>
        <label className="label">New Password</label>
        <input type="password" className="input" value={next} onChange={e=>setNext(e.target.value)} />
      </div>
      <div className="sm:col-span-2"><button className="btn btn-primary text-white">Update Password</button></div>
      {msg && <div className="text-xs text-teal-300 sm:col-span-2">{msg}</div>}
    </form>
  )
}
