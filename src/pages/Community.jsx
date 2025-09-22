import { useMemo, useRef, useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useCommunity } from '../context/CommunityContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'
import DirectChat from '../components/DirectChat.jsx'
import YouTubeLazy from '../components/YouTubeLazy.jsx'
import GenericEmbedLazy from '../components/GenericEmbedLazy.jsx'

export default function Community() {
  const { db, addPost, updatePost, toggleLike, addComment } = useCommunity()
  const { auth, users } = useAuth()
  const meId = auth?.userId
  const [params] = useSearchParams()
  const activeTag = params.get('tag') || ''
  const { id: focusId } = useParams()
  const postRefs = useRef({})
  const [text, setText] = useState('')
  const [image, setImage] = useState('')
  const [chatWith, setChatWith] = useState(null)
  const [video, setVideo] = useState('')
  const [tags, setTags] = useState('')
  // Centralized edit state per post id: { [id]: { editing, eText, eImage, eVideo, eTags } }
  const [editById, setEditById] = useState({})

  const authors = useMemo(() => {
    const map = new Map()
    ;(users?.buyers||[]).forEach(u => map.set(u.id, u))
    ;(users?.sellers||[]).forEach(u => map.set(u.id, u))
    // Admin stub user
    if (!map.has('admin')) {
      map.set('admin', { id: 'admin', name: 'Artifex Team', avatarUrl: '' })
    }
    return map
  }, [users])

  const posts = useMemo(() => {
    if (!activeTag) return db.posts
    return db.posts.filter(p => (p.tags||[]).includes(activeTag))
  }, [db.posts, activeTag])

  useEffect(() => {
    if (!focusId) return
    // Wait for paint then scroll into view
    const timeout = setTimeout(() => {
      const el = postRefs.current[focusId]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        el.classList.add('ring-2','ring-sky-500/60')
        setTimeout(() => el.classList.remove('ring-2','ring-sky-500/60'), 1600)
      }
    }, 50)
    return () => clearTimeout(timeout)
  }, [focusId, posts.length])
  function onCreate(e) {
    e.preventDefault()
    if (!meId) return alert('Login to post')
    if (!text.trim() && !image) return
  const cleanedTags = parseTags(tags)
  addPost({ authorId: meId, text, image, video, tags: cleanedTags })
  setText(''); setImage(''); setVideo(''); setTags('')
  }

  function likeCount(postId) { return db.likes.filter(l => l.postId === postId).length }
  function commentsFor(postId) { return db.comments.filter(c => c.postId === postId) }
  function isLiked(postId) { return !!db.likes.find(l => l.postId === postId && l.userId === meId) }

  function startEdit(p) {
    setEditById(prev => ({
      ...prev,
      [p.id]: {
        editing: true,
        eText: p.text || '',
        eImage: p.image || '',
        eVideo: p.video || '',
        eTags: (p.tags || []).join(', '),
      }
    }))
  }
  function cancelEdit(p) {
    setEditById(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), editing: false } }))
  }
  function changeEdit(p, patch) {
    setEditById(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), ...patch } }))
  }
  function saveEdit(p) {
    const ed = editById[p.id] || {}
    updatePost(p.id, meId, { text: ed.eText || '', image: ed.eImage || '', video: ed.eVideo || '', tags: parseTags(ed.eTags || '') })
    setEditById(prev => ({ ...prev, [p.id]: { ...(prev[p.id]||{}), editing: false } }))
  }

  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pt-8 pb-16">
      <h2 className="text-2xl font-bold gradient-text">Community</h2>
      <p className="text-sm text-gray-400">Share your craft stories, WIP, tips, and connect with others.</p>

      <form onSubmit={onCreate} className="card p-4 mt-4 grid gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-800/60 flex items-center justify-center text-xs">{(users?.sellers?.find(u=>u.id===meId)?.name || users?.buyers?.find(u=>u.id===meId)?.name || 'U')[0] || 'U'}</div>
          <div className="flex-1">
            <textarea className="input min-h-[60px] resize-y" value={text} onChange={e=>setText(e.target.value)} placeholder="What’s happening?" maxLength={280} />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <input className="input" placeholder="Image URL (optional)" value={image} onChange={e=>setImage(e.target.value)} />
              <input className="input" placeholder="Video URL or iframe embed (optional)" value={video} onChange={e=>setVideo(e.target.value)} />
            </div>
            <input className="input" placeholder="#tags (comma or space separated)" value={tags} onChange={e=>setTags(e.target.value)} />
            <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
              <span>{text.length}/280</span>
              <button className="btn btn-primary text-white" type="submit" disabled={!text.trim() && !image && !video}>Post</button>
            </div>
          </div>
        </div>
      </form>

      <div className="mt-6 space-y-4">
        {posts.length === 0 ? (
          <div className="text-sm text-gray-400">No posts yet. Be the first to share!</div>
        ) : posts.map(p => {
          const author = authors.get(p.authorId)
          const mine = p.authorId === meId
          const ed = editById[p.id] || { editing: false, eText: p.text||'', eImage: p.image||'', eVideo: p.video||'', eTags: (p.tags||[]).join(', ') }
          return (
            <article key={p.id} ref={el => { if (el) postRefs.current[p.id] = el }} className="card p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-800/60">
                    {author?.avatarUrl ? <img src={author.avatarUrl} alt="avatar" className="h-full w-full object-cover"/> : <div className="h-full w-full text-[10px] grid place-items-center">{(author?.name||'U')[0]}</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{author?.name || 'User'} {p.authorId==='admin' && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-200 align-middle">Official</span>}</div>
                    <div className="text-[11px] text-gray-500">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {author?.id && author.id !== meId && (
                    <button className="btn btn-outline btn-sm" onClick={() => setChatWith(author)}>DM</button>
                  )}
                  {mine && !ed.editing && (
                    <button className="btn btn-secondary btn-sm" onClick={() => startEdit(p)}>Edit</button>
                  )}
                </div>
              </div>
              {!ed.editing ? (
                <>
                  {p.text && <p className="mt-3 text-sm">{renderTextWithTags(p.text)}</p>}
                  {p.image && (
                    <div className="mt-3 rounded-xl overflow-hidden bg-gray-800/60">
                      <img src={p.image} alt="post" className="w-full h-auto object-cover"/>
                    </div>
                  )}
                  {p.video && (
                    <div className="mt-3 rounded-xl overflow-hidden bg-black">
                      {p.video.includes('<iframe') ? (
                        <GenericEmbedHtml html={p.video} storageKey={`post:${p.id}:iframe`} />
                      ) : (p.video.includes('youtube.com') || p.video.includes('youtu.be')) ? (
                        <YouTubeLazy url={p.video} storageKey={`post:${p.id}:youtube`} />
                      ) : isVimeo(p.video) ? (
                        <GenericEmbedLazy src={toVimeoEmbed(p.video)} storageKey={`post:${p.id}:vimeo`} title="Vimeo video" allow="autoplay; fullscreen; picture-in-picture" />
                      ) : isDrive(p.video) ? (
                        <GenericEmbedLazy src={toDriveEmbed(p.video)} storageKey={`post:${p.id}:drive`} title="Drive video" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" />
                      ) : (
                        <video className="w-full" src={p.video} controls playsInline preload="none" />
                      )}
                    </div>
                  )}
                  {(p.tags||[]).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(p.tags||[]).map(tg => (
                        <Link key={tg} to={`/community?tag=${encodeURIComponent(tg)}`} className="text-[11px] px-2 py-0.5 rounded-full bg-sky-900/40 text-sky-300 hover:bg-sky-900/60">#{tg}</Link>
                      ))}
                    </div>
                  )}
                    {p.updatedAt && (
                      <div className="text-[11px] text-gray-500 mt-1">Edited {new Date(p.updatedAt).toLocaleString()}</div>
                    )}
                </>
              ) : (
                <div className="mt-3 grid gap-2">
                  <textarea className="input min-h-[60px]" value={ed.eText} onChange={e=>changeEdit(p, { eText: e.target.value })} />
                  <input className="input" placeholder="Image URL" value={ed.eImage} onChange={e=>changeEdit(p, { eImage: e.target.value })} />
                  <input className="input" placeholder="Video URL or iframe" value={ed.eVideo} onChange={e=>changeEdit(p, { eVideo: e.target.value })} />
                  <input className="input" placeholder="#tags" value={ed.eTags} onChange={e=>changeEdit(p, { eTags: e.target.value })} />
                  <div className="flex items-center gap-2">
                    <button className="btn btn-primary text-white btn-sm" onClick={() => saveEdit(p)} type="button">Save</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => cancelEdit(p)} type="button">Cancel</button>
                  </div>
                </div>
              )}
              <div className="mt-3 flex items-center gap-3 text-sm">
                <button className={`btn btn-outline btn-sm ${isLiked(p.id)?'!border-teal-600/60':''}`} onClick={() => meId && toggleLike(p.id, meId)}>
                  <ion-icon name={isLiked(p.id)?'heart':'heart-outline'}></ion-icon>
                  <span className="ml-1">{likeCount(p.id)}</span>
                </button>
              </div>
              <Comments post={p} db={db} meId={meId} addComment={addComment} users={users} />
            </article>
          )
        })}
      </div>

      {chatWith && (
        <DirectChat userA={meId} userB={chatWith.id} postId={null} sellerName={chatWith.name} onClose={() => setChatWith(null)} />
      )}
    </section>
  )
}

function toYouTubeEmbed(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.slice(1)}`
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }
  } catch {}
  return url
}

function parseTags(input) {
  if (!input) return []
  // split by commas or whitespace, strip leading '#', normalize to lowercase, dedupe
  const parts = input.split(/[\s,]+/).map(s => s.replace(/^#/, '').trim().toLowerCase()).filter(Boolean)
  return Array.from(new Set(parts))
}

function renderTextWithTags(text) {
  const parts = text.split(/(#[A-Za-z0-9_]+)/g)
  return parts.map((part, i) => {
    if (part.startsWith('#')) {
      const t = part.replace(/^#/, '').toLowerCase()
  return <Link key={i} to={`/community?tag=${encodeURIComponent(t)}`} className="text-sky-300 hover:underline">{part}</Link>
    }
    return <span key={i}>{part}</span>
  })
}

function youTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {}
  return null
}

function GenericEmbedHtml({ html, storageKey }) {
  const [load, setLoad] = useState(false)
  const lsKey = storageKey ? `embed.play.${storageKey}` : null
  const mountRef = useRef(null)
  const mountedRef = useRef(false)
  useEffect(() => {
    if (!lsKey) return
    try {
      const v = localStorage.getItem(lsKey)
      if (v === '1') setLoad(true)
    } catch {}
  }, [lsKey])
  function onLoad() {
    setLoad(true)
    if (lsKey) {
      try { localStorage.setItem(lsKey, '1') } catch {}
    }
  }
  useEffect(() => {
    if (!load || mountedRef.current || !mountRef.current) return
    // Mount once to avoid re-renders replacing the iframe
    const container = mountRef.current
    container.innerHTML = html
    mountedRef.current = true
  }, [load, html])
  if (load) return <div className="aspect-video" ref={mountRef}></div>
  return (
    <button
      type="button"
      onClick={onLoad}
      className="relative block w-full aspect-video group bg-gray-900"
      title="This will load a third-party embed (may set cookies and make network requests)."
      aria-label="Click to load embed"
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="px-3 py-2 rounded-full bg-black/60 text-white text-sm group-hover:scale-105 transition">Click to load embed</div>
      </div>
      <div className="absolute left-2 right-2 bottom-2 text-[10px] text-gray-300/90 bg-black/40 rounded px-2 py-1">
        Loads third-party content. Click to continue.
      </div>
    </button>
  )
}

function isVimeo(url) {
  return /vimeo\.com\//i.test(url)
}
function toVimeoEmbed(url) {
  // Accept https://vimeo.com/{id} or player.vimeo.com/video/{id}
  try {
    const u = new URL(url)
    if (u.hostname.includes('vimeo.com') && !u.hostname.includes('player')) {
      const id = u.pathname.split('/').filter(Boolean)[0]
      if (id) return `https://player.vimeo.com/video/${id}`
    }
    if (u.hostname.includes('player.vimeo.com')) return url
  } catch {}
  return url
}
function isDrive(url) {
  return /drive\.google\.com\//i.test(url)
}
function toDriveEmbed(url) {
  // Accept typical sharing links and convert to /preview which renders an embeddable player
  // Examples:
  // https://drive.google.com/file/d/FILE_ID/view?usp=sharing -> https://drive.google.com/file/d/FILE_ID/preview
  // https://drive.google.com/open?id=FILE_ID -> https://drive.google.com/file/d/FILE_ID/preview
  try {
    const u = new URL(url)
    let fileId = null
    if (u.pathname.startsWith('/file/d/')) {
      const parts = u.pathname.split('/') // ['', 'file', 'd', 'FILE_ID', 'view']
      fileId = parts[3] || null
    } else {
      fileId = u.searchParams.get('id')
    }
    if (fileId) {
      const qp = new URLSearchParams()
      const resourceKey = u.searchParams.get('resourcekey')
      const authuser = u.searchParams.get('authuser')
      if (resourceKey) qp.set('resourcekey', resourceKey)
      if (authuser) qp.set('authuser', authuser)
      const qs = qp.toString()
      return `https://drive.google.com/file/d/${fileId}/preview${qs ? `?${qs}` : ''}`
    }
  } catch {}
  return url
}

function Comments({ post, db, meId, addComment, users }) {
  const [text, setText] = useState('')
  const comments = db.comments.filter(c => c.postId === post.id).sort((a,b) => new Date(a.createdAt)-new Date(b.createdAt))
  const idToUser = new Map()
  ;(users?.buyers||[]).forEach(u=>idToUser.set(u.id,u))
  ;(users?.sellers||[]).forEach(u=>idToUser.set(u.id,u))
  function submit(e){ e.preventDefault(); if (!meId || !text.trim()) return; addComment(post.id, meId, text); setText('') }
  return (
    <div className="mt-3">
      <div className="space-y-2">
        {comments.map(c => {
          const u = idToUser.get(c.userId)
          return (
            <div key={c.id} className="flex items-start gap-2">
              <div className="h-7 w-7 rounded-full overflow-hidden bg-gray-800/60 flex-shrink-0">
                {u?.avatarUrl ? <img src={u.avatarUrl} alt="avatar" className="h-full w-full object-cover"/> : <div className="h-full w-full text-[10px] grid place-items-center">{(u?.name||'U')[0]}</div>}
              </div>
              <div>
                <div className="text-xs text-gray-300"><span className="font-medium">{u?.name||'User'}</span> <span className="text-gray-500">• {new Date(c.createdAt).toLocaleString()}</span></div>
                <div className="text-sm">{c.text}</div>
              </div>
            </div>
          )
        })}
      </div>
      <form onSubmit={submit} className="mt-2 flex items-center gap-2">
        <input className="input flex-1" placeholder="Add a comment" value={text} onChange={e=>setText(e.target.value)} />
        <button className="btn btn-secondary btn-sm">Post</button>
      </form>
    </div>
  )
}
