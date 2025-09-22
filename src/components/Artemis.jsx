import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { artemisAsk, artemisPyAsk } from '../ai/artemisClient.js'

// Artemis: site-wide AI guide (rule-based for now)
// - Floating button bottom-right
// - Context-aware hints on product, marketplace, cart, checkout, workshops, community
// - Listens to window event 'artemis:open' to open with optional context { productId }

const STORAGE_OPEN = 'artemis_open_v1'
const STORAGE_MSGS = 'artemis_msgs_v1'
const STORAGE_SETTINGS = 'artemis_settings_v1'

export default function Artemis() {
  const { products } = useProducts()
  const { auth, currentUser, users } = useAuth()
  const { cart, wishlist, viewed } = useUI()
  const nav = useNavigate()
  const location = useLocation()

  const [open, setOpen] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_OPEN) || 'false') } catch { return false }
  })
  const [input, setInput] = useState('')
  const [forcedProductId, setForcedProductId] = useState(null)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_MSGS) || '[]')
      if (Array.isArray(saved) && saved.length) return saved
    } catch {}
    return []
  })
  const [settings, setSettings] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_SETTINGS) || '{}')
      return {
        muted: !!s.muted,
        localOnly: !!s.localOnly,
        hfModel: s.hfModel || '',
        hfFallback: s.hfFallback || '',
        usePythonBackend: !!s.usePythonBackend
      }
    } catch { return { muted: false, localOnly: false, hfModel: '', hfFallback: '', usePythonBackend: false } }
  })
  const [showSettings, setShowSettings] = useState(false)
  const [typing, setTyping] = useState(false)
  const [provider, setProvider] = useState('')
  const [connStatus, setConnStatus] = useState('idle') // idle | connecting | connected | failed
  const [lastLatency, setLastLatency] = useState(0)
  const [lastNote, setLastNote] = useState('')
  const [lastTrace, setLastTrace] = useState('')
  const [lastModel, setLastModel] = useState('')
  const scrollRef = useRef(null)

  // Persist panel state and messages
  useEffect(() => {
    try { localStorage.setItem(STORAGE_OPEN, JSON.stringify(open)) } catch {}
  }, [open])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_MSGS, JSON.stringify(messages.slice(-200))) } catch {}
  }, [messages])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(settings)) } catch {}
  }, [settings])

  // Event bus to open with context
  useEffect(() => {
    function onOpen(e) {
      setOpen(true)
      const pid = e?.detail?.productId || null
      if (pid) setForcedProductId(pid)
    }
    window.addEventListener('artemis:open', onOpen)
    return () => window.removeEventListener('artemis:open', onOpen)
  }, [])

  // Auto-greet when opened
  useEffect(() => {
    if (!open) return
    if (messages.length > 0) return
    if (settings.muted) return
    const ctx = context()
    const greet = initialGreeting(ctx)
    setMessages([{ role: 'assistant', content: greet }])
    setConnStatus('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, settings.muted])

  // Seed settings from URL params (once)
  useEffect(() => {
    const sp = new URLSearchParams(location.search)
    const seed = {}
    if (sp.has('localOnly')) seed.localOnly = sp.get('localOnly') === '1' || sp.get('localOnly') === 'true'
    if (sp.has('hfModel')) seed.hfModel = sp.get('hfModel') || ''
    if (sp.has('hfFallback')) seed.hfFallback = sp.get('hfFallback') || ''
    if (Object.keys(seed).length) {
      setSettings(s => ({ ...s, ...seed }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open])

  function context() {
    const path = location.pathname || '/'
    let product = null
    let productId = forcedProductId
    if (!productId && path.startsWith('/product/')) {
      const id = path.split('/')[2]
      productId = id || null
    }
    if (productId) product = products.find(p => p.id === productId) || null
    const role = auth?.role || 'guest'
    const user = currentUser?.() || null
    const seller = product ? (users?.sellers || []).find(s => s.id === product.sellerId) : null
    return { path, product, productId, role, user, cart, wishlist, viewed, seller }
  }

  function initialGreeting(ctx) {
    const name = ctx.user?.name || (ctx.role === 'seller' ? 'Seller' : ctx.role === 'buyer' ? 'Buyer' : 'there');
    const base = `Hello ${name}, I'm Artemis. `;
    if (ctx.product) return `${base}I can help with questions about "${ctx.product.name}", like materials, care, or delivery.`
    return `${base}How can I help you today?`
  }

  async function sendUser(q) {
    const text = q.trim()
    if (!text) return
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    const ctx = context()
    setTyping(true)
    setConnStatus('connecting')
    try {
      // Slash command for image: /img prompt here
      const isImageCmd = /^\s*\/img\b|^\s*\/image\b/i.test(text)
      if (isImageCmd) {
        const prompt = text.replace(/^\s*\/(img|image)\b\s*/i, '') || text
        const { reply, provider, elapsedMs, note, traceId, modelUsed, imageDataUri } = await artemisPyAsk({
          messages: [...messages, userMsg],
          context: ctx,
          options: { generateImage: true, imagePrompt: prompt }
        })
        setProvider(provider || '')
        setLastLatency(elapsedMs || 0)
        setLastNote(note || '')
        setLastModel(modelUsed || '')
        setLastTrace(traceId || '')
        setConnStatus(provider && provider.startsWith('huggingface') ? 'connected' : (provider==='local-fallback'?'failed':'connected'))
        setMessages(prev => [...prev, { role: 'assistant', content: reply, imageDataUri: imageDataUri || null }])
        console.debug('[Artemis] image reply', { provider, elapsedMs, note })
        return
      }

      const askFn = settings.usePythonBackend ? artemisPyAsk : artemisAsk
      const { reply, provider, elapsedMs, note, traceId, modelUsed, imageDataUri } = await askFn({ messages: [...messages, userMsg], context: ctx, options: {
        forceLocal: !!settings.localOnly,
        hfModel: settings.hfModel || undefined,
        hfFallback: settings.hfFallback || undefined
      } })
      setProvider(provider || '')
      setLastLatency(elapsedMs || 0)
      setLastNote(note || '')
      setLastModel(modelUsed || '')
      setLastTrace(traceId || '')
      try {
        // Attempt to extract extra info from the last fetch via headers
        // Not directly available here; we rely on body fields only.
      } catch {}
      setConnStatus(provider && provider !== 'local-fallback' && provider !== 'local-only' ? 'connected' : 'failed')
      setMessages(prev => [...prev, { role: 'assistant', content: reply, imageDataUri: imageDataUri || null }])
      console.debug('[Artemis] reply', { provider, elapsedMs, note })
    } catch (e) {
      // Fallback to local rule-based
      const a = answer(text, ctx)
      setProvider('local-fallback')
      setLastLatency(0)
      setLastNote(e?.message || 'request-error')
      setConnStatus('failed')
      setMessages(prev => [...prev, { role: 'assistant', content: a }])
      console.debug('[Artemis] error', e)
    } finally {
      setTyping(false)
    }
  }

  function answer(q, ctx) {
    const t = q.toLowerCase()

    // Basic greetings
    if (/^(hi|hello|hey)$/.test(t)) return `Hello! I'm Artemis, your friendly guide. How can I help?`

    // Navigation intents
    if (/go to cart|open cart|my cart/.test(t)) { nav('/cart'); return 'Opening your cart. I can help you review items or adjust quantities.' }
    if (/checkout|pay|buy now/.test(t)) { nav('/checkout-cart'); return 'Taking you to checkout. I’ll be here if you need help.' }
    if (/market|browse|shop/.test(t)) { nav('/marketplace'); return 'Let’s explore the marketplace. You can ask for ideas like “gifts under ₹1000”.' }
    if (/workshop/.test(t)) { nav('/workshops'); return 'Opening workshops. Ask me about skill level, duration, or materials.' }
    if (/community|forum|post/.test(t)) { nav('/community'); return 'Heading to the community. Be kind, support artisans, and share your thoughts.' }

    // Product context Q&A
    if (ctx.product) {
      const hints = []
      if (ctx.product.category) hints.push(`Category: ${ctx.product.category}`)
      if (ctx.product.price != null) hints.push(`Price: ₹${Number(ctx.product.price).toLocaleString('en-IN')}`)
      if (ctx.product.stock != null) hints.push(`Stock: ${ctx.product.stock}`)
      const sellerName = ctx.seller?.name || 'the artisan'
      const region = ctx.product.region?.trim()
      const techniques = Array.isArray(ctx.product.techniques) ? ctx.product.techniques.filter(Boolean) : []

      if (/(what|which) (is it made of|material|materials)|made of|material/.test(t)) {
        const techLine = techniques.length ? ` Notable technique: ${techniques.slice(0,2).join(', ')}.` : ''
        const regionLine = region ? ` Origin: ${region}.` : ''
        return `This piece is handcrafted by ${sellerName}.${techLine}${regionLine} Artisans typically use premium, sustainable materials suited to the design. ${hints.join(' • ')}`
      }
      if (/care|wash|clean|maintenance/.test(t)) {
        return `Care tips: avoid harsh chemicals and prolonged moisture. Wipe gently with a soft, dry cloth. Store away from direct sun.`
      }
      if (/size|dimension|measure|weight/.test(t)) {
        return `Sizes can vary slightly as each item is handmade. If you need exact dimensions, the artisan can share details on request.`
      }
      if (/ship|deliver|pincode|zip|eta/.test(t)) {
        return `Delivery: tap “Check delivery” on this page and enter your PIN, or use “Use my location.” Standard orders reach most cities in 3–6 days.`
      }
      if (/gift|present|occasion|festival/.test(t)) {
        return `It makes a thoughtful gift. Consider pairing it with a handwritten note or eco-friendly wrapping for a personal touch.`
      }
      if (/return|refund|replace/.test(t)) {
        return `We support easy returns within 7 days for eligible items in original condition. I can guide you if you ever need help.`
      }
      if (/discount|offer|deal/.test(t)) {
        return `We price fairly to honor artisan craftsmanship. Seasonal offers may appear on the marketplace — I’ll let you know if I spot one.`
      }
      if (/contact|message|chat|talk to (the )?artisan/.test(t)) {
        return `You can “Chat with Artisan” on this page. Ask for customizations, dimensions, or delivery specifics.`
      }
      if (/custom|personal|engrave|color|colour/.test(t)) {
        return `Many artisans accept custom requests (colors, sizes, engravings). Use “Chat with Artisan” to discuss options and timelines.`
      }
      if (/where.*from|origin|region/.test(t)) {
        return region ? `This craft traces to ${region}. Regional heritage adds unique character to every piece.` : `This craft is locally sourced; artisan origin varies by item.`
      }
      if (/how.*made|technique|handmade/.test(t)) {
        return techniques.length ? `It’s handmade using ${techniques.slice(0,3).join(', ')} techniques, reflecting skilled craftsmanship.` : `It’s handmade by skilled artisans with techniques best suited to the design.`
      }
      // generic product fallback
      const extra = [region ? `Origin: ${region}` : null, techniques.length ? `Technique: ${techniques.slice(0,2).join(', ')}` : null].filter(Boolean)
      return `Here’s what I know: ${[...hints, `Seller: ${sellerName}`, ...extra].filter(Boolean).join(' • ')}. Ask about materials, care, delivery, or gifting.`
    }

    // General shopper Q&A
    if (/gift|present/.test(t)) return 'Tell me who and your budget (e.g., “gifts for mom under ₹1500”), and I’ll suggest categories to explore.'
    if (/budget|under|price|₹|rs/.test(t)) return 'Try browsing “Marketplace” and apply filters like category and price. I can also help you shortlist.'
    if (/return|refund|replace/.test(t)) return 'We offer easy returns within 7 days for eligible items. Keep packaging safe and request from your orders.'
    if (/order|track/.test(t)) return 'To track orders, open your “Buyer Dashboard” and select the order for details and status.'
    if (/seller|artisan|custom/.test(t)) return 'Many artisans accept custom requests. Use “Chat with Artisan” on a product to discuss details.'
    if (/safe|secure|payment|cod/.test(t)) return 'Payments are secure. We don’t recommend cash on delivery for delicate items; prepaid ensures safe, tracked shipping.'

    // Fallback
    return 'I’m here to help with shopping, delivery, returns, gifts, or talking to artisans. Ask me anything or try a suggestion below.'
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendUser(input)
    }
  }

  const ctx = useMemo(() => context(), [location.pathname, products, forcedProductId, cart, wishlist, viewed, auth?.role])
  const suggestions = useMemo(() => {
    if (ctx.product) {
      const base = [
        'What materials are used?',
        'How to care for it?',
        'Is it a good gift?',
        'When can it deliver to my PIN?'
      ]
      const extras = []
      if (ctx.product.region) extras.push('Where is this craft from?')
      if (Array.isArray(ctx.product.techniques) && ctx.product.techniques.length) extras.push('How is it made?')
      return [...base, ...extras]
    }
    if (ctx.path.startsWith('/marketplace')) return ['Gifts under ₹1000', 'Woodwork bowls', 'Textile table runners']
    if (ctx.path.startsWith('/cart')) return ['Review my cart', 'Is shipping safe?', 'Return policy?']
    if (ctx.path.startsWith('/checkout')) return ['Is payment secure?', 'Address tips', 'Delivery time?']
    if (ctx.path.startsWith('/workshops')) return ['Beginner workshops', 'Materials needed', 'How to join?']
    return ['Find artisan gifts', 'Go to my cart', 'How to contact an artisan?']
  }, [ctx])

  return (
    <>
      {/* Floating open button */}
      {!open && (
        <button
          className="fixed z-40 bottom-5 right-5 w-16 h-16 bg-transparent text-white focus:outline-none transition-transform hover:scale-110 active:scale-95"
          title="Chat with Artemis"
          onClick={() => setOpen(true)}
          aria-label="Open Artemis assistant"
        >
          <img src="/icons/chatbot.png" alt="Chat" className="w-full h-full" />
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 py-6 bg-black/50 animate-fade-in">
          <div className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-teal-600 text-white grid place-items-center">
                  <img src="/icons/chatbot.png" alt="Chat" className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-semibold">Artemis</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Your AI guide</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {ctx.product && (
                  <button className="btn btn-outline btn-sm" title="Open product page"
                          onClick={() => nav(`/product/${ctx.product.id}`)}>
                    View Product
                  </button>
                )}
                {/* Connection status and provider chip */}
                <span className={`text-[11px] px-2 py-1 rounded-full ${connStatus==='connected' ? 'bg-teal-700 text-white' : connStatus==='connecting' ? 'bg-amber-600 text-white' : connStatus==='failed' ? 'bg-rose-700 text-white' : 'bg-gray-700 text-gray-100'}`} title={lastNote || 'Connection status'}>
                  {connStatus==='connecting' && 'Connecting…'}
                  {connStatus==='connected' && `Connected ${lastLatency?`(${lastLatency}ms)`:''}`}
                  {connStatus==='failed' && (provider==='local-fallback' ? 'Local (fallback)' : 'Failed')}
                  {connStatus==='idle' && (provider ? (provider.includes('openai') ? 'Cloud' : provider.includes('huggingface') ? 'HuggingFace' : 'Local') : 'Idle')}
                </span>
                <div className="relative">
                  <button className="btn btn-outline btn-sm" onClick={() => setShowSettings(v => !v)} title="Settings">Settings</button>
                  {showSettings && (
                    <div className="absolute right-0 mt-2 w-56 card p-2 z-10">
                      <label className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5">
                        <span className="text-sm">Mute greetings</span>
                        <input type="checkbox" checked={settings.muted} onChange={(e) => setSettings(s => ({ ...s, muted: e.target.checked }))} />
                      </label>
                      <label className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5">
                        <span className="text-sm">Local only (no cloud)</span>
                        <input type="checkbox" checked={settings.localOnly} onChange={(e) => setSettings(s => ({ ...s, localOnly: e.target.checked }))} />
                      </label>
                      <label className="flex items-center justify-between p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5">
                        <span className="text-sm">Use Python backend</span>
                        <input type="checkbox" checked={settings.usePythonBackend} onChange={(e) => setSettings(s => ({ ...s, usePythonBackend: e.target.checked }))} />
                      </label>
                      <div className="p-2 rounded hover:bg-gray-50 dark:hover:bg-white/5">
                        <div className="text-xs mb-1 text-gray-500">HF model overrides</div>
                        <input className="input input-sm w-full mb-1" placeholder="HF model e.g. mistralai/Mistral-7B-Instruct-v0.3" value={settings.hfModel} onChange={(e) => setSettings(s => ({ ...s, hfModel: e.target.value }))} />
                        <input className="input input-sm w-full" placeholder="HF fallback e.g. TinyLlama/TinyLlama-1.1B-Chat-v1.0" value={settings.hfFallback} onChange={(e) => setSettings(s => ({ ...s, hfFallback: e.target.value }))} />
                      </div>
                      <button className="btn btn-outline btn-sm w-full mt-2" onClick={() => setMessages([])}>Clear conversation</button>
                      <div className="mt-2 p-2 rounded bg-gray-900/60 text-[11px] text-gray-200">
                        <div>Status: {connStatus}</div>
                        <div>Provider: {provider || '-'}</div>
                        <div>Latency: {lastLatency ? `${lastLatency}ms` : '-'}</div>
                        <div>Note: {lastNote || '-'}</div>
                        <div>Model: {lastModel || '-'}</div>
                        <div>Trace: {lastTrace || '-'}</div>
                        <button className="btn btn-outline btn-sm w-full mt-1" onClick={() => {
                          const payload = JSON.stringify({ status: connStatus, provider, latencyMs: lastLatency, note: lastNote, model: lastModel, trace: lastTrace }, null, 2)
                          try { navigator.clipboard.writeText(payload) } catch {}
                        }}>Copy debug</button>
                        <div className="mt-1 text-gray-400">Check browser console for [Artemis] logs.</div>
                      </div>
                    </div>
                  )}
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setOpen(false)}>Close</button>
              </div>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4 bg-gray-100 dark:bg-gray-800">
              {messages.length === 0 && (
                <div className="text-sm text-center text-gray-400 py-8">Say hello to start…</div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`px-4 py-2 rounded-2xl max-w-[90%] sm:max-w-[70%] ${m.role === 'assistant' ? 'bg-teal-50 text-gray-800 dark:bg-teal-900/60 dark:text-teal-50 rounded-bl-sm' : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 rounded-br-sm'}`}>
                    <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    {m.imageDataUri && (
                      <div className="mt-2">
                        <img src={m.imageDataUri} alt="Generated" className="max-h-72 rounded-lg border border-black/10" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {typing && (
                <div className="flex justify-start">
                  <div className="bg-teal-50 text-gray-800 dark:bg-teal-900/60 dark:text-teal-50 px-4 py-2 rounded-2xl rounded-bl-sm">
                    <p className="text-sm">Typing…</p>
                  </div>
                </div>
              )}
            </div>
            {/* Suggestions */}
            <div className="px-4 pt-2 pb-3 flex flex-wrap gap-2 border-t border-gray-200/80 dark:border-gray-800/80">
              {suggestions.map((s, idx) => (
                <button key={idx} className="btn btn-chip" type="button" onClick={() => sendUser(s)}>{s}</button>
              ))}
            </div>
            <div className="border-t border-gray-200 dark:border-gray-800 p-3">
              <div className="flex items-center gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  className="input min-h-[44px] max-h-32 flex-1 resize-y"
                  placeholder={ctx.product ? `Ask about “${ctx.product.name}”…` : 'Ask about shopping, delivery, gifts…'}
                />
                <button className="btn btn-primary text-white" onClick={() => sendUser(input)}>Send</button>
              </div>
              <div className="mt-2 text-[11px] text-gray-400">Artemis provides guidance to help you navigate and decide. For specifics (dimensions, customizations), message the artisan directly on a product.</div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
