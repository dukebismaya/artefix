import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE = 'apma_workshops_v1'
const WorkshopsContext = createContext(null)

export function WorkshopsProvider({ children }) {
  const [workshops, setWorkshops] = useState(() => {
    try { const raw = localStorage.getItem(STORAGE); return raw ? JSON.parse(raw) : [] } catch { return [] }
  })
  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(workshops)) } catch {} }, [workshops])

  function addWorkshop(w) {
    const id = Date.now().toString()
    const rec = { id, title: w.title?.trim()||'Workshop', description: w.description?.trim()||'', price: Number(w.price||0), seats: Number(w.seats||10), date: w.date||'', time: w.time||'', mode: w.mode||'Live Online', sellerId: w.sellerId||null, cover: w.cover||'', kitIncluded: !!w.kitIncluded, level: w.level||'Beginner', createdAt: new Date().toISOString() }
    setWorkshops(prev => [rec, ...prev])
    return rec
  }
  function updateWorkshop(id, updates) { setWorkshops(prev => prev.map(w => w.id===id?{...w, ...updates}:w)) }
  function removeWorkshop(id) { setWorkshops(prev => prev.filter(w => w.id !== id)) }

  const value = useMemo(() => ({ workshops, addWorkshop, updateWorkshop, removeWorkshop }), [workshops])
  return <WorkshopsContext.Provider value={value}>{children}</WorkshopsContext.Provider>
}

export function useWorkshops() {
  const ctx = useContext(WorkshopsContext)
  if (!ctx) throw new Error('useWorkshops must be used within WorkshopsProvider')
  return ctx
}
