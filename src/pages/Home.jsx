import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useUI } from '../context/UIContext.jsx'
import { useOrders } from '../context/OrdersContext.jsx'
import { personalizeProducts } from '../utils/recommend.js'
import ProductCard from '../components/ProductCard.jsx'
import { useToast } from '../components/Toast.jsx'
import { useCommunity } from '../context/CommunityContext.jsx'

const IMAGES = [
  '/backgrounds/vecteezy_a-wooden-table-with-many-different-types-of-tools_70238682.jpeg',
  '/backgrounds/vecteezy_artisan-crafts-aesthetic_25431017.jpg',
  '/backgrounds/vecteezy_cane-furninture-and-dishes_11932840.jpg',
  '/backgrounds/vecteezy_cane-furninture-and-dishes_11932840_1.jpg',
  '/backgrounds/vecteezy_handcrafted-baskets-and-pottery-showcasing-intricate-designs_68513905.jpeg',
  '/backgrounds/vecteezy_handicrafts-from-rattan-exhibited-by-the-dayak-tribe-the_13856664.jpg',
]

export default function Home() {
  const { products } = useProducts()
  const { currentUser, auth } = useAuth()
  const { wishlist, viewed } = useUI()
  const { orders } = useOrders()
  const { push } = useToast()
  const { db: community } = useCommunity()
  const [index, setIndex] = useState(0)
  const [prev, setPrev] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setPrev(index)
      setIndex((i) => (i + 1) % IMAGES.length)
    }, 7000)
    return () => clearInterval(timerRef.current)
  }, [index])

  const currentImg = IMAGES[index]
  const prevImg = prev != null ? IMAGES[prev] : null
  const [loadedKey, setLoadedKey] = useState('')

  // Prefetch the next image so crossfades are seamless
  useEffect(() => {
    const next = IMAGES[(index + 1) % IMAGES.length]
    if (!next) return
    const img = new Image()
    img.decoding = 'async'
    img.loading = 'eager'
    img.src = next
    // No-op handlers; relying on browser cache
    return () => { /* GC hint */ }
  }, [index])

  // Idle prefetch all remaining slideshow images once (best-effort)
  useEffect(() => {
    let done = false
    const already = new Set()
    const prefetchAll = () => {
      if (done) return
      for (const src of IMAGES) {
        if (already.has(src)) continue
        already.add(src)
        const i = new Image()
        i.decoding = 'async'
        i.loading = 'eager'
        i.src = src
      }
      done = true
    }
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 500))
    const handle = ric(prefetchAll, { timeout: 2000 })
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle)
      // setTimeout fallback can't be canceled safely without keeping a ref, skip
    }
  }, [])

  // Trending community posts: sort by like count then recency; take 5
  const trendingPosts = useMemo(() => {
    if (!community) return []
    const likeCounts = new Map()
    community.likes.forEach(l => likeCounts.set(l.postId, (likeCounts.get(l.postId)||0)+1))
    const posts = [...community.posts]
    posts.sort((a, b) => {
      const la = likeCounts.get(a.id) || 0
      const lb = likeCounts.get(b.id) || 0
      if (lb !== la) return lb - la
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
    return posts.slice(0, 5)
  }, [community])

  function youTubeId(url) {
    try {
      const u = new URL(url)
      if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
      if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
    } catch {}
    return null
  }

  return (
    <div className="relative isolate">
      {/* Background slideshow (smoother crossfade) */}
      <div className="hero-stage bg-gradient-to-b from-gray-900 via-gray-950 to-black">
        {prevImg && (
          <img
            key={`prev-${prev}`}
            src={prevImg}
            alt="Artisan background"
            loading="lazy"
            decoding="async"
            className="hero-layer h-full w-full object-cover opacity-60 animate-fade-out-slow"
          />
        )}
        <img
          key={`cur-${index}`}
          src={currentImg}
          alt="Artisan background"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoadedKey(`cur-${index}`)}
          className={`hero-layer h-full w-full object-cover opacity-70 animate-fade-in-slow animate-kenburns-slow ${loadedKey===`cur-${index}` ? 'loaded' : 'blur-up'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/45 to-black/70" />
      </div>

      {/* Hero content */}
      <section className="relative z-10 pt-24 pb-20 sm:pt-28 sm:pb-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center" style={{animationDelay: '200ms'}}>
      <div className="pill inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-rose-400 border-rose-500/50 animate-slide-up">
        <span className="text-sm font-semibold text-white">Sale is Live!</span>
        <span className="text-xs text-white/80">Discounts up to 30%</span>
      </div>
    </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight drop-shadow-xl animate-slide-up gradient-text mt-4">
            Artifex — Handcrafted, Perfected by AI
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-xl text-gray-200 max-w-3xl mx-auto animate-slide-up" style={{animationDelay:'100ms'}}>
            Discover and sell unique handmade goods with AI-assisted listings, fair pricing, and helpful chat support.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up" style={{animationDelay:'150ms'}}>
            <Link to="/upload" className="btn btn-primary text-white">
              List Your Craft
            </Link>
            <Link to="/marketplace" className="btn btn-outline">
              Explore Artifex
            </Link>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="relative z-10 section-gradient">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title:'Free Shipping', text:'On orders over ₹999', icon:'🚚' },
              { title:'Easy Returns', text:'7-day return policy', icon:'↩️' },
              { title:'Secure Payments', text:'100% protected checkout', icon:'🔒' },
              { title:'Dedicated Support', text:'24/7 chat & email', icon:'💬' },
            ].map((s,i) => (
              <li key={i} className="card p-5 hover-lift">
                <div className="text-2xl">{s.icon}</div>
                <div className="mt-2 font-semibold text-slate-100">{s.title}</div>
                <div className="text-sm text-muted">{s.text}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Categories */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="h2 section-title text-center">Shop by Category</h2>
          <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[{
              key:'Pottery', img:'/categoryimgs/pottery.png'
            },{
              key:'Jewelry', img:'/categoryimgs/jewellery.png'
            },{
              key:'Textiles', img:'/categoryimgs/textiles.png'
            },{
              key:'Woodwork', img:'/categoryimgs/woodwork.png'
            },{
              key:'Artwork', img:'/backgrounds/vecteezy_artisan-crafts-aesthetic_25431017.jpg'
            },{
              key:'Other', img:'/categoryimgs/other.png'
            }].map((c,idx) => (
              <li key={idx} className="card overflow-hidden hover-lift group">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={c.img}
                    alt={`${c.key} category`}
                    className="absolute inset-0 h-full w-full object-cover transform-gpu transition-transform duration-500 ease-out will-change-transform group-hover:scale-110 group-hover:-rotate-[0.5deg] group-hover:-translate-y-0.5"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent transition-colors duration-300 group-hover:from-black/70" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between">
                    <div className="font-semibold text-slate-100">{c.key}</div>
                    <Link to={`/marketplace?q=${encodeURIComponent(c.key)}`} className="btn btn-secondary btn-sm">Explore</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Personalized for you */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between gap-2">
            <h2 className="h2 section-title">For You</h2>
            <Link to="/marketplace" className="text-sm text-teal-300 hover:underline">See all</Link>
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {personalizeProducts(products, {
              wishlistIds: wishlist,
              orders: orders.filter(o => o.buyerId === currentUser()?.id),
              viewedIds: viewed,
              preferredRegions: [],
              preferredTechniques: [],
            }, { limit: 6, maxPerSeller: 2 }).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Products of the week */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="h2 section-title">Products of the Week</h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {(products.slice(0,6)).map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/marketplace" className="btn btn-outline">View All Products</Link>
          </div>
        </div>
      </section>

      {/* From the Community (trending) */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center justify-between">
            <h2 className="h2 section-title">From the Community</h2>
            <Link to="/community" className="text-sm text-teal-300 hover:underline">Open Community</Link>
          </div>
          {trendingPosts.length === 0 ? (
            <div className="text-sm text-gray-400 mt-4">No posts yet. Visit the Community to get started.</div>
          ) : (
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {trendingPosts.map(p => (
                <li key={p.id} className="card overflow-hidden hover-lift">
                  <Link to={`/community/${p.id}`} className="block">
                    <div className="aspect-[16/10] bg-gray-800/60 relative">
                      {p.image ? (
                        <img src={p.image} alt="post" className="w-full h-full object-cover" />
                      ) : p.video ? (
                        (() => { const id = youTubeId(p.video); return id ? (
                          <img src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`} alt="video thumb" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-black grid place-items-center text-xs text-gray-400">Video</div>
                        )})()
                      ) : (
                        <div className="w-full h-full grid place-items-center text-xs text-gray-500">Post</div>
                      )}
                      {p.video && (
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="h-10 w-10 rounded-full bg-black/60 grid place-items-center">
                            <ion-icon name="play" className="text-white"></ion-icon>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-xs">
                      <div className="line-clamp-2 text-gray-200">{p.text || 'Untitled post'}</div>
                      <div className="text-[11px] text-gray-500 mt-1">{new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
          <div className="card p-6 bg-[url('/backgrounds/vecteezy_artisan-crafts-aesthetic_25431017.jpg')] bg-cover bg-center relative overflow-hidden">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative">
              <h3 className="text-2xl font-semibold">Subscribe to the Artifex Newsletter</h3>
              <p className="text-sm text-gray-300 mt-1">Get tips, new collections, and launches—no spam.</p>
              <form className="mt-4 flex flex-col sm:flex-row gap-3" onSubmit={(e) => { e.preventDefault(); push('Subscribed! Welcome to Artifex.', 'success') }}>
                <input type="email" required placeholder="Enter your email" className="input flex-1" />
                <button className="btn btn-primary text-white">Subscribe</button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
