import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const push = useCallback((message, type = 'info', timeout = 2500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, type }])
    if (timeout) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, timeout)
    }
  }, [])

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed z-50 bottom-4 right-4 space-y-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-2 rounded-xl shadow bg-gray-900/90 border ${
            t.type === 'success' ? 'border-teal-600 text-teal-200' :
            t.type === 'error' ? 'border-rose-600 text-rose-200' :
            'border-gray-700 text-gray-200'
          }`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
