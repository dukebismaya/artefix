import { useParams, Link, useNavigate } from 'react-router-dom'
import { useWorkshops } from '../context/WorkshopsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR } from '../utils/format.js'

export default function WorkshopDetail() {
  const { id } = useParams()
  const { workshops } = useWorkshops()
  const w = workshops.find(x => x.id === id)
  const { auth } = useAuth()
  const nav = useNavigate()
  if (!w) return <section className="p-6">Workshop not found.</section>
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <Link to="/workshops" className="text-sm text-teal-300">← Back to Workshops</Link>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="aspect-[4/3] bg-gray-800/60">{w.cover && <img src={w.cover} alt={w.title} className="w-full h-full object-cover"/>}</div>
        </div>
        <div>
          <h2 className="text-2xl font-bold">{w.title}</h2>
          <div className="text-sm text-gray-400">{w.mode} • {w.level}</div>
          <div className="mt-2 text-xl font-semibold">{formatINR(w.price)}</div>
          <div className="text-sm text-gray-400">{w.date || 'Flexible'} {w.time ? `• ${w.time}`:''}</div>
          <p className="mt-3 text-sm text-gray-200">{w.description}</p>
          <div className="mt-4 flex items-center gap-2">
            <button className="btn btn-primary text-white" onClick={() => auth ? alert('Enrollment recorded (demo)') : nav('/login-buyer')}>Enroll</button>
            <Link className="btn btn-outline" to="/workshops">Explore more</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
