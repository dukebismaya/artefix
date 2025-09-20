// Lightweight CLIP client using @xenova/transformers running fully in-browser (WebGPU/WebAssembly)
// Responsibilities:
// - Lazy load CLIP image/text encoders
// - Compute normalized embeddings for images and text
// - Cosine similarity utilities
// - Image helpers: load via URL, canvas to tensor

let clip = null
let envPatched = false

async function getTransformers() {
  // Use explicit ESM build to avoid format mismatches in some browsers/bundlers
  const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2?module')
  return mod?.default ? mod.default : mod
}

async function ensureEnv() {
  if (envPatched) return
  const { env } = await getTransformers()
  // Browser/CDN settings
  env.allowRemoteModels = true
  env.localModelPath = undefined
  env.useBrowserCache = true
  // Prefer WASM proxy + reasonable threads; WebGPU picked automatically when supported by the pipeline
  env.backends.onnx.wasm.proxy = true
  try { env.backends.onnx.wasm.numThreads = Math.min(2, navigator.hardwareConcurrency || 2) } catch {}
  envPatched = true
}

export async function loadCLIP() {
  await ensureEnv()
  if (clip) return clip
  const { pipeline } = await getTransformers()
  // Create dedicated pipelines for images and text
  const imageEmb = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch16', { quantized: true })
  const textEmb = await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch16', { quantized: true })
  clip = { imageEmb, textEmb }
  return clip
}

function l2norm(vec) {
  const n = Math.hypot(...vec)
  return n === 0 ? vec : vec.map(v => v / n)
}

export function cosineSim(a, b) {
  // a, b are arrays of numbers (already normalized recommended)
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export async function embedText(text) {
  const { textEmb } = await loadCLIP()
  const output = await textEmb(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export async function embedImageFromUrl(url) {
  const { imageEmb } = await loadCLIP()
  const img = await loadImage(url)
  const output = await imageEmb(img, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export async function embedImageFromFile(file) {
  const url = URL.createObjectURL(file)
  try {
    return await embedImageFromUrl(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function similarityMatrix(queryVec, itemVecs) {
  const q = l2norm(queryVec)
  return itemVecs.map(v => cosineSim(q, l2norm(v)))
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// --- Cloud fallback helpers (Vercel serverless proxy) ---
// Allow overriding the endpoint via Vite env for local testing against a deployed API
const CLOUD_ENDPOINT = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_CLOUD_EMBED_URL) || '/api/clip-embed'

export async function cloudEmbedText(text, model) {
  const r = await fetch(CLOUD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'text', text, model })
  })
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  return data.vector
}

export async function cloudEmbedImage(src, model) {
  const r = await fetch(CLOUD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'image', image: src, model })
  })
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  return data.vector
}

export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
