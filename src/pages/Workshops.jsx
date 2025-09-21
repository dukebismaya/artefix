import { Link } from 'react-router-dom'
import { useWorkshops } from '../context/WorkshopsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatINR } from '../utils/format.js'

export default function Workshops() {
  const { workshops } = useWorkshops()
  const { auth } = useAuth()
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold gradient-text">Skill & Workshop Marketplace</h2>
        {auth?.role==='seller' && <Link to="/workshops/upload" className="btn btn-primary text-white">Create Workshop</Link>}
      </div>
      <p className="text-sm text-gray-400 mt-1">Learn from artisans: live classes, DIY kits, and more.</p>
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {workshops.length === 0 ? (
          <div className="text-sm text-gray-400">No workshops yet.</div>
        ) : workshops.map(w => (
          <Link key={w.id} to={`/workshops/${w.id}`} className="card p-0 overflow-hidden hover-lift">
            <div className="aspect-[4/3] bg-gray-800/60">{w.cover && <img src={w.cover} alt={w.title} className="w-full h-full object-cover"/>}</div>
            <div className="p-4">
              <div className="font-semibold">{w.title}</div>
              <div className="text-xs text-gray-400">{w.mode} • {w.level} • {w.date || 'Flexible'}</div>
              <div className="mt-1 text-sm">{formatINR(w.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
