// Vercel serverless: Artemis chat proxy
// Supports OpenAI-compatible APIs via env:
// - AI_API_BASE (e.g., https://api.openai.com/v1 or compatible)
// - AI_API_KEY
// - AI_MODEL (default: gpt-4o-mini)

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const body = await getJson(req)
    const { messages, context } = body || {}
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' })

    const base = process.env.AI_API_BASE
    const key = process.env.AI_API_KEY
    const model = process.env.AI_MODEL || 'gpt-4o-mini'
    const hfToken = process.env.HF_TOKEN
    const hfChatModel = process.env.HF_CHAT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3'

    // Provider priority: OpenAI-compatible -> Hugging Face Inference API -> local fallback
    if (!base || !key) {
      if (hfToken) {
        const sys = systemPrompt(context)
        const prompt = toHuggingFacePrompt(sys, messages)
        try {
          const reply = await hfGenerate(hfChatModel, hfToken, prompt)
          return res.status(200).json({ reply, provider: 'huggingface' })
        } catch (e) {
          console.error('HF chat error', e)
          const reply = localFallback(messages, context)
          return res.status(200).json({ reply, provider: 'local-fallback' })
        }
      } else {
        const reply = localFallback(messages, context)
        return res.status(200).json({ reply, provider: 'local-fallback' })
      }
    }

    const sys = systemPrompt(context)
    const payload = {
      model,
      messages: [
        { role: 'system', content: sys },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
      ],
      temperature: 0.3,
      max_tokens: 400,
    }
    const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify(payload)
    })
    if (!r.ok) {
      const text = await r.text()
      return res.status(500).json({ error: `AI error ${r.status}: ${text}` })
    }
    const data = await r.json()
    const reply = data?.choices?.[0]?.message?.content || 'I’m here to help.'
    return res.status(200).json({ reply, provider: 'openai-compatible' })
  } catch (e) {
    console.error('artemis-chat error', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

function systemPrompt(ctx) {
  const { path, product, role } = ctx || {}
  const basics = `You are Artemis, a friendly assistant for an artisan marketplace. Be concise, kind, and helpful. Never invent unavailable product specifics (dimensions, materials) — instead, suggest asking the artisan.`
  const page = path ? `Current page: ${path}.` : ''
  const prod = product ? `Product: ${product.name} • Category: ${product.category || ''} • Price: ₹${product.price ?? ''} • Stock: ${product.stock ?? ''} • Origin: ${product.region || ''} • Techniques: ${(product.techniques || []).join(', ')}` : 'Product: none.'
  const persona = role ? `User role: ${role}.` : ''
  return `${basics}\n${page}\n${prod}\n${persona}\nGuidelines: Help with materials/care/gifting/delivery generally; for exact details, recommend “Chat with Artisan.”`
}

function localFallback(messages, context) {
  const last = messages[messages.length - 1]?.content?.toLowerCase?.() || ''
  const p = context?.product
  if (p) {
    if (/material|made of/.test(last)) return `It’s artisan-made with premium materials chosen for the design. For exact materials, ask the artisan via “Chat with Artisan.”`
    if (/care|wash|clean/.test(last)) return `Avoid harsh chemicals and moisture; wipe with a soft dry cloth. Store away from direct sun.`
    if (/ship|deliver|pincode|zip|eta/.test(last)) return `Tap “Check delivery” on the product page and enter your PIN. Standard orders arrive in ~3–6 days in most cities.`
  }
  return `I’m here to help with shopping, delivery, returns, gifts, or talking to artisans. Ask me anything.`
}

function toHuggingFacePrompt(system, messages) {
  // Generic chat prompt suitable for many instruct models.
  // Format:
  // <system>...</system>\nHistory: ...\nUser: ...\nAssistant:
  const parts = []
  if (system) parts.push(`<system>\n${system}\n</system>\n`)
  const hist = []
  for (const m of messages.slice(-10)) {
    if (!m || !m.content) continue
    if (m.role === 'assistant') hist.push(`Assistant: ${m.content}`)
    else hist.push(`User: ${m.content}`)
  }
  parts.push(hist.join('\n'))
  parts.push('\nAssistant:')
  return parts.join('\n')
}

async function hfGenerate(model, token, prompt) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 320, temperature: 0.3, return_full_text: false } })
  })
  if (!r.ok) throw new Error(`HF chat error ${r.status}: ${await r.text()}`)
  const data = await r.json()
  // Inference API typically returns an array of objects with generated_text
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text
  // Some models return { generated_text: '...' }
  if (data?.generated_text) return data.generated_text
  // Fallback to string
  return typeof data === 'string' ? data : 'I’m here to help.'
}

async function getJson(req) {
  if (typeof req.body === 'object' && req.body) return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(raw) } catch { return null }
}
