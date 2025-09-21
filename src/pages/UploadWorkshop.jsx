import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useWorkshops } from '../context/WorkshopsContext.jsx'
import { useNavigate } from 'react-router-dom'

export default function UploadWorkshop() {
  const { auth, currentUser } = useAuth()
  const seller = currentUser()
  const { addWorkshop } = useWorkshops()
  const nav = useNavigate()
  const [form, setForm] = useState({ title:'', description:'', price:'', seats:10, date:'', time:'', mode:'Live Online', cover:'', kitIncluded:false, level:'Beginner' })

  function submit(e){
    e.preventDefault()
    const rec = addWorkshop({ ...form, price: Number(form.price||0), seats: Number(form.seats||10), sellerId: seller?.id || null })
    nav(`/workshops/${rec.id}`)
  }

  if (auth?.role !== 'seller') return <div className="p-6">Only sellers can create workshops.</div>

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <h2 className="text-2xl font-bold gradient-text">Create Workshop/Experience</h2>
      <form onSubmit={submit} className="mt-4 card p-5 grid gap-3">
        <div>
          <label className="label">Title</label>
          <input className="input" value={form.title} onChange={e=>setForm({ ...form, title:e.target.value })} required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[100px]" value={form.description} onChange={e=>setForm({ ...form, description:e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Price (INR)</label>
            <input type="number" className="input" value={form.price} onChange={e=>setForm({ ...form, price:e.target.value })} />
          </div>
          <div>
            <label className="label">Seats</label>
            <input type="number" className="input" value={form.seats} onChange={e=>setForm({ ...form, seats:e.target.value })} />
          </div>
          <div>
            <label className="label">Level</label>
            <select className="input" value={form.level} onChange={e=>setForm({ ...form, level:e.target.value })}>
              <option>Beginner</option>
              <option>Intermediate</option>
              <option>Advanced</option>
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Mode</label>
            <select className="input" value={form.mode} onChange={e=>setForm({ ...form, mode:e.target.value })}>
              <option>Live Online</option>
              <option>In-person</option>
              <option>DIY Kit</option>
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={form.date} onChange={e=>setForm({ ...form, date:e.target.value })} />
          </div>
          <div>
            <label className="label">Time</label>
            <input type="time" className="input" value={form.time} onChange={e=>setForm({ ...form, time:e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Cover Image URL</label>
          <input className="input" value={form.cover} onChange={e=>setForm({ ...form, cover:e.target.value })} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.kitIncluded} onChange={e=>setForm({ ...form, kitIncluded: e.target.checked })} />
          DIY Kit Included
        </label>
        <div><button className="btn btn-primary text-white">Create</button></div>
      </form>
    </section>
  )
}
