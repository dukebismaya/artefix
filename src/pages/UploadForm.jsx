import { useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../context/ProductsContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const CATEGORIES = ['Pottery', 'Jewelry', 'Textiles', 'Woodwork', 'Artwork', 'Other']

function suggestPrice(name, category) {
  const base = {
    Pottery: [25, 60],
    Jewelry: [30, 150],
    Textiles: [20, 100],
    Woodwork: [40, 200],
    Artwork: [50, 300],
    Other: [20, 80],
  }[category || 'Other']
  const complexity = Math.min(1.4, 0.9 + (name?.split(/\s+/).length || 1) * 0.05)
  const avg = (base[0] + base[1]) / 2
  return Math.round(avg * complexity)
}

function generateDescription(name, category) {
  const c = category || 'handcrafted piece'
  const n = name || 'this item'
  return `${n} is a ${c.toLowerCase()} crafted by a local artisan. Every piece is unique, made with care and attention to detail. Perfect for gifts, home decor, or personal use.`
}

export default function UploadForm() {
  const { addProduct } = useProducts()
  const { auth, currentUser } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('Pottery')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [stock, setStock] = useState(1)
  const [image, setImage] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  // Regional discovery fields
  const me = currentUser()
  const defaultRegion = useMemo(() => {
    const addr = (me?.addresses || []).find(a => a.id === me?.defaultAddressId) || (me?.addresses || [])[0]
    return addr?.state || ''
  }, [me?.addresses, me?.defaultAddressId])
  const [region, setRegion] = useState(defaultRegion)
  const [techniques, setTechniques] = useState('') // comma-separated

  const fileInputRef = useRef(null)

  function onDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }
  function onFileChange(e) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
  }
  function readFile(file) {
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result)
    reader.readAsDataURL(file)
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      alert('Please enter a product name')
      return
    }
    const seller = currentUser()
    const techArr = techniques.split(',').map(t => t.trim()).filter(Boolean)
    const product = addProduct({ name, category, price, description, stock, image, sellerId: seller?.id || null, region, techniques: techArr })
    navigate('/marketplace')
  }

  return (
    <div className="relative">
      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pt-10 pb-16">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 gradient-text-blue">Upload Your Masterpiece</h2>
        <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-6 animate-slide-up">
          {/* Product Details */}
          <div className="card-gradient">
            <div className="card p-5">
              <h3 className="section-title mb-4">Product Details</h3>
              <label className="label">Product Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Handcrafted Ceramic Vase" />

              <label className="label mt-4">Category</label>
              <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="label">Region (State)</label>
                  <input className="input" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g., Bihar, Gujarat, Rajasthan" />
                  <p className="text-xs text-gray-500 mt-1">Used for regional discovery (e.g., Madhubani from Bihar).</p>
                </div>
                <div>
                  <label className="label">Techniques / Styles</label>
                  <input className="input" value={techniques} onChange={(e) => setTechniques(e.target.value)} placeholder="e.g., Madhubani, Kutch embroidery" />
                  <p className="text-xs text-gray-500 mt-1">Comma-separated; helps buyers filter by style.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="card-gradient">
            <div className="card p-5">
              <h3 className="section-title mb-4">Pricing</h3>
              <label className="label">Price (INR)</label>
              <div className="flex items-center gap-2">
                <input className="input" type="number" min="0" step="1" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g., 59" />
                <button type="button" className="btn btn-primary text-white" onClick={() => setPrice(suggestPrice(name, category))}>Suggest Price</button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Rule-based suggestion varies by category and perceived complexity.</p>

              <label className="label mt-4">Stock Count</label>
              <input className="input" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(Number(e.target.value))} placeholder="e.g., 10" />
            </div>
          </div>

          {/* Media */}
          <div className="card-gradient md:col-span-2">
            <div className="card p-5">
              <h3 className="section-title mb-4">Product Images</h3>
              <div
                className={`rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center transition ${dragOver ? 'border-teal-400 bg-gray-900/40' : 'border-teal-700/50'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
              >
                {image ? (
                  <div className="flex items-center gap-4">
                    <img src={image} alt="preview" className="h-24 w-24 rounded-xl object-cover" />
                    <div className="text-left">
                      <p className="text-sm text-gray-300">Preview ready.</p>
                      <button type="button" className="btn btn-secondary mt-2" onClick={() => { setImage(null); fileInputRef.current?.click() }}>Change Image</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-400">Drag & drop an image here, or</p>
                    <button type="button" className="btn btn-secondary mt-3" onClick={() => fileInputRef.current?.click()}>Browse Files</button>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="card-gradient md:col-span-2">
            <div className="card p-5">
              <h3 className="section-title mb-4">Product Description</h3>
              <textarea className="input min-h-32" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your product, materials, process, and story..." />
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <button type="button" className="btn btn-primary text-white flex-1" onClick={() => setDescription(generateDescription(name, category))}>Generate AI Description</button>
                <button type="submit" className="btn btn-primary text-white flex-1">List Your Product</button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
