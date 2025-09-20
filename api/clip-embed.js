// Vercel serverless function: proxy to Hugging Face Inference API for CLIP embeddings
// Env: HF_TOKEN (required), HF_CLIP_MODEL (optional, default: sentence-transformers/clip-ViT-B-32-multilingual-v1)

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const token = process.env.HF_TOKEN
    if (!token) return res.status(500).json({ error: 'HF_TOKEN not configured' })

    const body = await getJson(req)
    const { type, text, image, model } = body || {}
    const usedModel = model || process.env.HF_CLIP_MODEL || 'sentence-transformers/clip-ViT-B-32-multilingual-v1'

    if (type === 'text') {
      if (!text || typeof text !== 'string') return res.status(400).json({ error: 'text required' })
      const out = await hfFeatureExtraction(usedModel, { inputs: text }, token)
      return sendVector(out, res)
    }

    if (type === 'image') {
      if (!image || typeof image !== 'string') return res.status(400).json({ error: 'image (url or data:) required' })
      const imageBytes = await fetchImageBytes(image)
      const out = await hfFeatureExtraction(usedModel, imageBytes, token, true)
      return sendVector(out, res)
    }

    return res.status(400).json({ error: 'type must be "text" or "image"' })
  } catch (e) {
    console.error('clip-embed error', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

async function getJson(req) {
  if (typeof req.body === 'object' && req.body) return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(raw) } catch { return null }
}

async function hfFeatureExtraction(model, payload, token, isBinary = false) {
  const url = `https://api-inference.huggingface.co/pipeline/feature-extraction/${encodeURIComponent(model)}`
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(isBinary ? {} : { 'Content-Type': 'application/json' })
    },
    body: isBinary ? payload : JSON.stringify(payload)
  })
  if (!r.ok) throw new Error(`HF error ${r.status}: ${await r.text()}`)
  return await r.json()
}

async function fetchImageBytes(src) {
  if (src.startsWith('data:')) {
    const base64 = src.split(',')[1] || ''
    return Buffer.from(base64, 'base64')
  }
  const r = await fetch(src)
  if (!r.ok) throw new Error(`fetch image failed: ${r.status}`)
  return Buffer.from(await r.arrayBuffer())
}

function sendVector(out, res) {
  // HF returns nested arrays; flatten a mean pooling layer here if needed
  const vec = Array.isArray(out) ? flattenOnce(out) : out
  res.setHeader('Content-Type', 'application/json')
  res.status(200).send(JSON.stringify({ vector: vec }))
}

function flattenOnce(arr) {
  if (!Array.isArray(arr)) return arr
  if (Array.isArray(arr[0])) return arr[0]
  return arr
}
