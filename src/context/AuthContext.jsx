import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'

const STORAGE_USERS = 'apma_users_v1' // { buyers: [], sellers: [] }
const STORAGE_AUTH = 'apma_auth_v1'   // { role: 'buyer'|'seller', userId }

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [users, setUsers] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_USERS)
      const parsed = raw ? JSON.parse(raw) : { buyers: [], sellers: [] }
      return migrateUsers(parsed)
    } catch {
      return { buyers: [], sellers: [] }
    }
  })
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_AUTH)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_USERS, JSON.stringify(users)) } catch {}
  }, [users])
  useEffect(() => {
    try {
      if (auth) localStorage.setItem(STORAGE_AUTH, JSON.stringify(auth))
      else localStorage.removeItem(STORAGE_AUTH)
    } catch {}
  }, [auth])

  function signup(role, { name, email, password }) {
    if (!['buyer', 'seller'].includes(role)) throw new Error('Invalid role')
    const listKey = role === 'buyer' ? 'buyers' : 'sellers'
    const exists = users[listKey].some(u => u.email.toLowerCase() === (email||'').toLowerCase())
    if (exists) throw new Error('Email already registered')
    const user = withDefaults({ id: Date.now().toString(), name: name?.trim() || 'User', email: email.trim(), password })
    setUsers(prev => ({ ...prev, [listKey]: [...prev[listKey], user] }))
    setAuth({ role, userId: user.id })
    return user
  }

  function login(role, { email, password }) {
    const listKey = role === 'buyer' ? 'buyers' : 'sellers'
    const user = users[listKey].find(u => u.email.toLowerCase() === (email||'').toLowerCase() && u.password === password)
    if (!user) throw new Error('Invalid credentials')
    setAuth({ role, userId: user.id })
    return user
  }

  function logout() { setAuth(null) }

  function currentUser() {
    if (!auth) return null
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    return users[listKey].find(u => u.id === auth.userId) || null
  }

  // Profile helpers
  function updateCurrentUser(updates) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => u.id === auth.userId ? withDefaults({ ...u, ...updates }) : u)
    }))
  }

  function changePassword(current, next) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    const u = users[listKey].find(u => u.id === auth.userId)
    if (!u) throw new Error('User not found')
    if (u.password !== current) throw new Error('Current password is incorrect')
    updateCurrentUser({ password: next })
  }

  // Address CRUD
  function addAddress(addr) {
    if (!auth) throw new Error('Not authenticated')
    const id = Date.now().toString()
    const a = { id, label: addr.label?.trim() || 'Address', name: addr.name || '', line1: addr.line1 || '', line2: addr.line2 || '', city: addr.city || '', state: addr.state || '', zip: addr.zip || '', country: addr.country || 'India', phone: addr.phone || '' }
    const me = currentUser()
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => u.id === auth.userId ? { ...u, addresses: [...(u.addresses||[]), a], defaultAddressId: u.defaultAddressId || id } : u)
    }))
    return a
  }
  function updateAddress(addrId, updates) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => u.id === auth.userId ? { ...u, addresses: (u.addresses||[]).map(a => a.id === addrId ? { ...a, ...updates } : a) } : u)
    }))
  }
  function removeAddress(addrId) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => {
        if (u.id !== auth.userId) return u
        const filtered = (u.addresses||[]).filter(a => a.id !== addrId)
        const defaultId = u.defaultAddressId === addrId ? (filtered[0]?.id || null) : u.defaultAddressId
        return { ...u, addresses: filtered, defaultAddressId: defaultId }
      })
    }))
  }
  function setDefaultAddress(addrId) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => u.id === auth.userId ? { ...u, defaultAddressId: addrId } : u)
    }))
  }

  // Payment methods (basic demo)
  function addPaymentMethod(pm) {
    if (!auth) throw new Error('Not authenticated')
    const id = Date.now().toString()
  const method = { id, type: pm.type || 'Card', label: pm.label || (pm.type==='UPI'?'UPI':'Card'), last4: pm.last4 || '', name: pm.name || '', vpa: pm.vpa || '', note: pm.note || '' }
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => u.id === auth.userId ? { ...u, paymentMethods: [...(u.paymentMethods||[]), method] } : u)
    }))
    return method
  }
  function removePaymentMethod(pmId) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => {
        if (u.id !== auth.userId) return u
        const filtered = (u.paymentMethods||[]).filter(p => p.id !== pmId)
        const defaultPm = u.defaultPaymentMethodId === pmId ? (filtered[0]?.id || null) : u.defaultPaymentMethodId
        return { ...u, paymentMethods: filtered, defaultPaymentMethodId: defaultPm }
      })
    }))
  }

  function setDefaultPaymentMethod(pmId) {
    if (!auth) throw new Error('Not authenticated')
    const listKey = auth.role === 'buyer' ? 'buyers' : 'sellers'
    setUsers(prev => ({
      ...prev,
      [listKey]: prev[listKey].map(u => u.id === auth.userId ? { ...u, defaultPaymentMethodId: pmId } : u)
    }))
  }

  function withDefaults(u) {
    return {
      avatarUrl: '', phone: '', introVideoUrl: '', addresses: [], defaultAddressId: null, paymentMethods: [], defaultPaymentMethodId: null,
      ...u,
    }
  }
  function migrateUsers(db) {
    const fix = (arr=[]) => arr.map(u => withDefaults(u))
    return { buyers: fix(db.buyers), sellers: fix(db.sellers) }
  }

  const value = useMemo(() => ({ users, auth, signup, login, logout, currentUser, updateCurrentUser, changePassword, addAddress, updateAddress, removeAddress, setDefaultAddress, addPaymentMethod, removePaymentMethod, setDefaultPaymentMethod }), [users, auth])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function RequireAuth({ role, children }) {
  const { auth } = useAuth()
  if (!auth) return <Navigate to={role === 'seller' ? '/login-seller' : '/login-buyer'} replace />
  if (role && auth.role !== role) return <Navigate to={auth.role === 'seller' ? '/seller' : '/buyer'} replace />
  return children
}
