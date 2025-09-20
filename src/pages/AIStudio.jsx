import { useMemo, useState } from 'react'
import { useProducts } from '../context/ProductsContext.jsx'
import { embedImageFromFile, embedImageFromUrl, embedText, similarityMatrix, cloudEmbedText, cloudEmbedImage, fileToDataUrl } from '../ai/clipClient.js'
import { formatINR } from '../utils/format.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function AIStudio() {
  const { products } = useProducts()
  const { users } = useAuth()
  const [mode, setMode] = useState('image') // 'image' | 'style'
  const [file, setFile] = useState(null)
  const [style, setStyle] = useState('minimalist, earthy tones, natural materials')
  const [status, setStatus] = useState('')
  const [results, setResults] = useState([])
  const [useCloud, setUseCloud] = useState(false)

  const productImages = useMemo(() => products.map(p => p.image).filter(Boolean), [products])

  async function run() {
    try {
      setStatus('Loading model…')
      let queryVec
      if (mode === 'image') {
        if (!file) { setStatus('Please upload an image'); return }
        setStatus(useCloud ? 'Embedding your image in cloud…' : 'Embedding your image…')
        try {
          if (useCloud) {
            const dataUrl = await fileToDataUrl(file)
            queryVec = await cloudEmbedImage(dataUrl)
          } else {
            queryVec = await embedImageFromFile(file)
          }
        } catch (e) {
          if (useCloud) {
            setStatus('Cloud embedding failed; falling back to local…')
            try { queryVec = await embedImageFromFile(file) } catch {}
          }
          if (!queryVec) { setStatus('Could not process the uploaded image. Try a different file.'); return }
        }
      } else {
        const text = style.trim()
        if (!text) { setStatus('Enter style or colors'); return }
        setStatus(useCloud ? 'Embedding style text in cloud…' : 'Embedding style text…')
        try {
          queryVec = useCloud ? await cloudEmbedText(text) : await embedText(text)
        } catch (e) {
          if (useCloud) {
            setStatus('Cloud text embedding failed; falling back to local…')
            try { queryVec = await embedText(text) } catch {}
          }
          if (!queryVec) { setStatus('Could not embed the text. Try a shorter description.'); return }
        }
      }

      // Build embeddings for product images
      setStatus(useCloud ? 'Embedding product images in cloud…' : 'Embedding product images…')
      const items = []
      for (const p of products) {
        if (!p.image || typeof p.image !== 'string') continue
        if (!/^\w+:\/\//.test(p.image) && !p.image.startsWith('/') && !p.image.startsWith('data:')) continue
        try {
          const cloudSrc = p.image.startsWith('/') ? (location.origin + p.image) : p.image
          const v = useCloud ? await cloudEmbedImage(cloudSrc) : await embedImageFromUrl(p.image)
          items.push({ product: p, vec: v })
        } catch (e) {
          console.warn('Embed failed for', p.name, e)
        }
      }

      if (items.length === 0) {
        setStatus('No usable product images to compare. Ensure products have accessible image URLs or data URLs.')
        setResults([])
        return
      }

      setStatus('Computing similarity…')
      const sims = similarityMatrix(queryVec, items.map(it => it.vec))
      const ranked = items
        .map((it, i) => ({ ...it, score: sims[i] }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)

      setResults(ranked)
      setStatus('Done')
    } catch (e) {
      console.error(e)
      setStatus('Error: ' + (e?.message || 'Failed'))
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
      <h1 className="text-2xl font-bold">AI Studio</h1>
      <p className="text-sm text-gray-400 mt-1">Find handcrafted items that match your style. Runs fully in your browser using CLIP embeddings.</p>

      <div className="mt-6 card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <button className={`btn ${mode==='image'?'btn-primary text-white':'btn-secondary'}`} onClick={() => setMode('image')}>Inspiration Image</button>
          <button className={`btn ${mode==='style'?'btn-primary text-white':'btn-secondary'}`} onClick={() => setMode('style')}>Style / Colors</button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={useCloud} onChange={(e)=>setUseCloud(e.target.checked)} />
            <span>Use cloud embeddings (Hugging Face via serverless)</span>
          </label>
        </div>
        {mode === 'image' ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input" />
            <button className="btn btn-primary text-white" onClick={run}>Find Matches</button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input type="text" value={style} onChange={(e) => setStyle(e.target.value)} className="input" placeholder="e.g. warm neutrals, linen, minimal" />
            <button className="btn btn-primary text-white" onClick={run}>Find Matches</button>
          </div>
        )}
        <div className="text-xs text-gray-400 mt-2">{status}</div>
      </div>

      {results.length > 0 && (
        <div className="mt-6">
          <h2 className="section-title">Top matches</h2>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((r, idx) => (
              <div key={idx} className="card overflow-hidden">
                <div className="aspect-[4/3] bg-black/20">
                  {r.product.image && <img src={r.product.image} alt={r.product.name} className="w-full h-full object-cover" />}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold">{r.product.name}</div>
                      <div className="text-xs text-gray-400">{r.product.category}</div>
                      <div className="text-xs text-gray-500">Artisan: {users?.sellers?.find?.(s => s.id === r.product.sellerId)?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">Score: {r.score.toFixed(3)}</div>
                    </div>
                    <div className="text-right font-semibold">{formatINR(r.product.price)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-10 card p-4">
        <h3 className="section-title">Optional: Customize with Stable Diffusion</h3>
        <p className="text-sm text-gray-400 mt-1">Attempt to load a browser Stable Diffusion pipeline to generate a preview with selected colors/materials. This is experimental and may not be supported on all devices.</p>
        <CustomizerStub />
      </div>
    </section>
  )
}

function CustomizerStub() {
  const [prompt, setPrompt] = useState('A handcrafted ceramic mug with indigo glaze, product photo, soft light')
  const [img, setImg] = useState(null)
  const [status, setStatus] = useState('Idle')

  async function tryRun() {
    // Transformers.js (the library we load in-browser) does not currently support the
    // `text-to-image` pipeline (see the console list of supported tasks). Running this would
    // always fail, so we provide guidance instead without throwing errors.
    setStatus('In-browser text-to-image is not available in the current JS runtime (Transformers.js). Use style-based matching above, or try a Hugging Face Space for Stable Diffusion.')
  }

  return (
    <div className="mt-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input className="input" value={prompt} onChange={(e)=>setPrompt(e.target.value)} />
        <button className="btn btn-secondary" onClick={tryRun}>Generate Preview</button>
      </div>
      <div className="text-xs text-gray-400 mt-2">{status}</div>
      {img && (
        <div className="mt-3 card overflow-hidden">
          <img src={img} alt="Generated preview" className="w-full h-auto" />
        </div>
      )}
    </div>
  )
}
