import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_ORDERS = 'apma_orders_v1'

const OrdersContext = createContext(null)

export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_ORDERS)
      return raw ? JSON.parse(raw) : []
    } catch { return [] }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_ORDERS, JSON.stringify(orders)) } catch {}
  }, [orders])

  function createOrder(order) {
    const o = { id: Date.now().toString(), status: 'PENDING_PACK', createdAt: new Date().toISOString(), ...order }
    setOrders(prev => [o, ...prev])
    return o
  }
  function updateOrder(id, updates) {
    setOrders(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)))
  }

  const value = useMemo(() => ({ orders, createOrder, updateOrder }), [orders])
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
}

export function useOrders() {
  const ctx = useContext(OrdersContext)
  if (!ctx) throw new Error('useOrders must be used within OrdersProvider')
  return ctx
}
