import { createContext, useContext, useEffect, useMemo, useState } from 'react'

// Minimal social graph: posts, likes, comments
// Post: { id, authorId, text, image, video, tags?: string[], createdAt, updatedAt? }
// Like: { id, postId, userId }
// Comment: { id, postId, userId, text, createdAt }

const STORAGE = 'apma_community_v1'
const CommunityContext = createContext(null)

export function CommunityProvider({ children }) {
  const [db, setDb] = useState(() => {
    let initial
    try {
      const raw = localStorage.getItem(STORAGE)
      initial = raw ? JSON.parse(raw) : { posts: [], likes: [], comments: [] }
    } catch {
      initial = { posts: [], likes: [], comments: [] }
    }
    // Seed admin posts once
    try {
      const seeded = localStorage.getItem('apma_community_seed_v1') === '1'
      if (!seeded) {
        const now = Date.now()
        const seeds = [
          {
            id: 'seed-welcome',
            authorId: 'admin',
            text: "Welcome to Artifex! Browse handmade goods in Marketplace, follow tags in Community, chat with artisans, and enjoy transparent shipping. New? Start with #howto and #workshops.",
            image: '',
            video: 'https://drive.google.com/file/d/1oGwKLPEpm3bzJg4lQtXzvnNJpqF5X-bn/view?usp=sharing',
            tags: ['welcome','howto','marketplace'],
            createdAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString()
          },
          {
            id: 'seed-process',
            authorId: 'admin',
            text: "How we're doing this: curated listings, fair payouts, community moderation, and smart discovery to connect you with real artisans. Watch for a quick behind‑the‑scenes.",
            image: '',
            video: 'https://drive.google.com/file/d/1hQhMTWHSX3Mr3ix_KtlksW9MEX7zUAi-/view?usp=sharing',
            tags: ['behindthescenes','process','fair'],
            createdAt: new Date(now - 1000 * 60 * 60 * 24 * 2).toISOString()
          },
          {
            id: 'seed-workshops',
            authorId: 'admin',
            text: "Workshops are live! Learn techniques directly from artisans or host your own session. Explore #workshops to get started and share your creations in Community.",
            image: '',
            video: 'https://drive.google.com/file/d/17ePsfRklxqkETSbBtCZmJxBInEj7JzGA/view?usp=sharing',
            tags: ['workshops','learn','community'],
            createdAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString()
          }
        ]
        // Only prepend if not already present
        const existingIds = new Set((initial.posts || []).map(p => p.id))
        const toAdd = seeds.filter(p => !existingIds.has(p.id))
        if (toAdd.length) {
          initial = { ...initial, posts: [...toAdd, ...(initial.posts || [])] }
        }
        localStorage.setItem('apma_community_seed_v1', '1')
      }
    } catch {}
    // Migration: if earlier seeds used placeholder Drive IDs, replace them with the canonical URLs
    try {
      const canonicalById = {
        'seed-welcome': 'https://drive.google.com/file/d/1oGwKLPEpm3bzJg4lQtXzvnNJpqF5X-bn/view?usp=sharing',
        'seed-process': 'https://drive.google.com/file/d/1hQhMTWHSX3Mr3ix_KtlksW9MEX7zUAi-/view?usp=sharing',
        'seed-workshops': 'https://drive.google.com/file/d/17ePsfRklxqkETSbBtCZmJxBInEj7JzGA/view?usp=sharing',
      }
      const hasPlaceholder = (s) => typeof s === 'string' && /PLACEHOLDER/i.test(s)
      const fixedPosts = (initial.posts || []).map(p => {
        if (canonicalById[p.id] && hasPlaceholder(p.video)) {
          return { ...p, video: canonicalById[p.id] }
        }
        return p
      })
      if (fixedPosts !== initial.posts) {
        initial = { ...initial, posts: fixedPosts }
      }
    } catch {}
    return initial
  })

  useEffect(() => { try { localStorage.setItem(STORAGE, JSON.stringify(db)) } catch {} }, [db])

  function addPost({ authorId, text, image, video, tags }) {
    const p = { id: Date.now().toString(), authorId, text: text?.trim()||'', image: image||'', video: video || '', tags: Array.isArray(tags)? tags: [], createdAt: new Date().toISOString() }
    setDb(prev => ({ ...prev, posts: [p, ...prev.posts] }))
    return p
  }
  function updatePost(id, byUser, patch) {
    setDb(prev => ({
      ...prev,
      posts: prev.posts.map(p => (p.id === id && p.authorId === byUser ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p))
    }))
  }
  function removePost(id, byUser) {
    setDb(prev => ({
      posts: prev.posts.filter(p => p.id !== id || p.authorId !== byUser),
      likes: prev.likes.filter(l => l.postId !== id),
      comments: prev.comments.filter(c => c.postId !== id),
    }))
  }
  function toggleLike(postId, userId) {
    setDb(prev => {
      const exists = prev.likes.find(l => l.postId === postId && l.userId === userId)
      return exists
        ? { ...prev, likes: prev.likes.filter(l => !(l.postId===postId && l.userId===userId)) }
        : { ...prev, likes: [{ id: Date.now().toString(), postId, userId }, ...prev.likes] }
    })
  }
  function addComment(postId, userId, text) {
    const c = { id: Date.now().toString(), postId, userId, text: (text||'').trim(), createdAt: new Date().toISOString() }
    setDb(prev => ({ ...prev, comments: [...prev.comments, c] }))
    return c
  }

  const value = useMemo(() => ({ db, addPost, updatePost, removePost, toggleLike, addComment }), [db])
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>
}

export function useCommunity() {
  const ctx = useContext(CommunityContext)
  if (!ctx) throw new Error('useCommunity must be used within CommunityProvider')
  return ctx
}
