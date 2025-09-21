import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'

// Simple local chat store:
// - Threads keyed by `${a}_${b}` (sorted user ids) for generic DMs
// - Supports optional productId or postId context
// Message shape: { id, threadId, fromUserId, toUserId, content, createdAt, productId, postId }
// Unread tracking:
// - db.seen: { [threadId]: { [userId]: ISOString } } indicates last seen timestamp per user per thread

const STORAGE = 'apma_chats_v1'
const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [db, setDb] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE)
      const parsed = raw ? JSON.parse(raw) : null
      if (parsed) {
        // Backward compatibility: ensure seen map exists
        return { seen: {}, ...parsed }
      }
      return { threads: {}, messages: [], seen: {} }
    } catch {
      return { threads: {}, messages: [], seen: {} }
    }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE, JSON.stringify(db)) } catch {}
  }, [db])

  function threadKey(a, b) {
    if (!a || !b) return ''
    return [a, b].sort().join('_')
  }

  function getOrCreateThread({ buyerId, sellerId, userA, userB, productId, postId }) {
    const A = userA || buyerId
    const B = userB || sellerId
    const key = threadKey(A, B)
    let t = db.threads[key]
    if (!t) {
      t = { id: key, a: A, b: B, buyerId: buyerId || null, sellerId: sellerId || null, productId: productId || null, postId: postId || null, createdAt: new Date().toISOString(), lastMessageAt: null }
      setDb(prev => ({ ...prev, threads: { ...prev.threads, [key]: t }, seen: { ...prev.seen, [key]: { ...(prev.seen?.[key]||{}) } } }))
    }
    return t
  }

  function sendMessage({ buyerId, sellerId, userA, userB, fromUserId, content, productId, postId }) {
    const t = getOrCreateThread({ buyerId, sellerId, userA, userB, productId, postId })
    const toUserId = fromUserId === t.a ? t.b : t.a
    const m = { id: Date.now().toString(), threadId: t.id, fromUserId, toUserId, content: content.trim(), productId: productId || null, postId: postId || null, createdAt: new Date().toISOString() }
    setDb(prev => ({
      threads: { ...prev.threads, [t.id]: { ...prev.threads[t.id], lastMessageAt: m.createdAt } },
      messages: [m, ...prev.messages],
    }))
    return m
  }

  function threadMessages(threadId) {
    return db.messages.filter(m => m.threadId === threadId).sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
  }

  function userThreads(userId) {
    const list = Object.values(db.threads)
    return list.filter(t => t.a === userId || t.b === userId)
               .sort((a,b) => new Date(b.lastMessageAt || b.createdAt) - new Date(a.lastMessageAt || a.createdAt))
  }

  // Mark a thread as seen for a given user (up to a specific time, default now or last message time)
  function markSeen(threadId, userId, time) {
    if (!threadId || !userId) return
    const lastMsg = db.messages.find(m => m.threadId === threadId)
    const ts = time || (lastMsg ? lastMsg.createdAt : new Date().toISOString())
    setDb(prev => ({
      ...prev,
      seen: {
        ...prev.seen,
        [threadId]: { ...(prev.seen?.[threadId] || {}), [userId]: ts }
      }
    }))
  }

  // Compute unread messages in a thread for a user
  function unreadCount(threadId, userId) {
    if (!threadId || !userId) return 0
    const lastSeen = db.seen?.[threadId]?.[userId]
    return db.messages.filter(m => m.threadId === threadId && m.toUserId === userId && (!lastSeen || new Date(m.createdAt) > new Date(lastSeen))).length
  }

  // Total unread across all threads for a user
  function totalUnread(userId) {
    if (!userId) return 0
    return userThreads(userId).reduce((sum, t) => sum + unreadCount(t.id, userId), 0)
  }

  const value = useMemo(() => ({ db, sendMessage, threadMessages, userThreads, getOrCreateThread, markSeen, unreadCount, totalUnread }), [db])
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat() {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}
