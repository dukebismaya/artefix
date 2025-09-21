// Simple buyer personalization focusing on surfacing unique artisans over top sellers
// Heuristics:
// - Diversity across sellers: limit max items per seller
// - Boost matches to user interests: wishlist items' categories/techniques, previously viewed or ordered categories
// - Mix recent/new items with some random exploration
// Inputs:
// - products: [{id, sellerId, category, techniques, createdAt, price, ...}]
// - userProfile: { wishlistIds: [], orders: [], viewedIds: [], preferredRegions: [], preferredTechniques: [] }
// Output: ranked product list

function scoreProduct(p, ctx) {
  let s = 0
  const now = Date.now()
  const ageDays = Math.max(0, (now - new Date(p.createdAt || 0).getTime()) / 86400000)
  // Recency boost (up to +1)
  s += Math.max(0, 1 - Math.min(ageDays / 30, 1))

  // Interest boosts
  if (ctx.preferredCategories.has(p.category)) s += 1
  if (ctx.preferredRegions.has(p.region)) s += 0.8
  for (const t of (p.techniques || [])) {
    if (ctx.preferredTechniques.has(t)) { s += 0.4; break }
  }

  // Price fairness nudging: avoid only expensive items
  if (p.price <= ctx.priceMedian) s += 0.2

  // Light exploration randomness
  s += Math.random() * 0.2

  return s
}

export function personalizeProducts(products, userProfile = {}, opts = {}) {
  const {
    limit = 12,
    maxPerSeller = 3,
  } = opts

  const preferredCategories = new Set()
  const preferredRegions = new Set(userProfile.preferredRegions || [])
  const preferredTechniques = new Set(userProfile.preferredTechniques || [])

  // Derive from wishlist and orders
  const wishlist = new Set(userProfile.wishlistIds || [])
  const orderedIds = new Set((userProfile.orders || []).map(o => o.productId))
  const viewed = new Set(userProfile.viewedIds || [])

  for (const p of products) {
    if (wishlist.has(p.id) || orderedIds.has(p.id) || viewed.has(p.id)) {
      if (p.category) preferredCategories.add(p.category)
      if (p.region) preferredRegions.add(p.region)
      for (const t of (p.techniques || [])) preferredTechniques.add(t)
    }
  }

  // Price median for gentle bias
  const prices = products.map(p => Number(p.price || 0)).filter(n => Number.isFinite(n) && n > 0).sort((a,b)=>a-b)
  const priceMedian = prices.length ? prices[Math.floor(prices.length/2)] : 0

  const ctx = { preferredCategories, preferredRegions, preferredTechniques, priceMedian }
  const scored = products.map(p => ({ p, s: scoreProduct(p, ctx) }))
  scored.sort((a,b) => b.s - a.s)

  // Enforce seller diversity
  const bySeller = new Map()
  const result = []
  for (const { p } of scored) {
    const cnt = bySeller.get(p.sellerId) || 0
    if (cnt >= maxPerSeller) continue
    result.push(p)
    bySeller.set(p.sellerId, cnt + 1)
    if (result.length >= limit) break
  }

  return result
}
