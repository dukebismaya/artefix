// Vercel serverless: Artemis chat proxy
// Supports OpenAI-compatible APIs via env:
// - AI_API_BASE (e.g., https://api.openai.com/v1 or compatible)
// - AI_API_KEY
// - AI_MODEL (default: gpt-4o-mini)

export default async function handler(req, res) {
  try {
    // CORS headers for cross-origin (dev or external calls)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
      return res.status(204).end()
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return res.status(405).json({ error: 'Method Not Allowed' })
    }

    const body = await getJson(req)
    const { messages, context, options } = body || {}
    if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be an array' })

  const base = process.env.AI_API_BASE
  const key = process.env.AI_API_KEY
  const model = process.env.AI_MODEL || 'gpt-4o-mini'
  const hfToken = process.env.HF_TOKEN
  // Allow runtime overrides from options
  const hfChatModel = sanitizeModelId(options?.hfModel || process.env.HF_CHAT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3')
  const hfFallbackModel = sanitizeModelId(options?.hfFallback || process.env.HF_CHAT_MODEL_FALLBACK || 'google/gemma-2-2b-it')
  const t0 = Date.now()
  const traceId = `${t0.toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  res.setHeader('x-trace-id', traceId)

    // Provider selection with optional overrides
    const forcedLocal = !!options?.forceLocal
    const forcedProvider = options?.forceProvider === 'huggingface' || options?.forceProvider === 'openai' ? options.forceProvider : null
    const openaiAvailable = !!(base && key)
    const hfAvailable = !!hfToken

    if (forcedLocal) {
      const reply = localFallback(messages, context)
      const elapsedMs = Date.now() - t0
      return res.status(200).json({ reply, provider: 'local-only', note: 'forced-local', elapsedMs, traceId })
    }

    // If explicitly forced to a provider, try it first
    if (forcedProvider === 'openai' && openaiAvailable) {
      const sys = systemPrompt(context, options)
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
        // If forced provider fails, do not cascade silently; fall back to HF if available, else local
        if (hfAvailable) {
          try {
            const sys2 = systemPrompt(context, options)
            const prompt2 = toHuggingFacePrompt(sys2, messages)
            const reply2 = await hfGenerate(hfChatModel, hfToken, prompt2)
            const elapsedMs = Date.now() - t0
            return res.status(200).json({ reply: reply2, provider: 'huggingface', modelUsed: hfChatModel, note: `openai-failed:${r.status}`, elapsedMs, traceId })
          } catch (e2) {
            const reply3 = localFallback(messages, context)
            const elapsedMs = Date.now() - t0
            return res.status(200).json({ reply: reply3, provider: 'local-fallback', modelUsed: model, note: `openai-failed:${text}`, elapsedMs, traceId })
          }
        }
        return res.status(500).json({ error: `AI error ${r.status}: ${text}` })
      }
      const data = await r.json()
      const reply = data?.choices?.[0]?.message?.content || 'I’m here to help.'
      const elapsedMs = Date.now() - t0
      return res.status(200).json({ reply, provider: 'openai-compatible', modelUsed: model, note: 'ok', elapsedMs, traceId })
    }

    if (forcedProvider === 'huggingface' && hfAvailable) {
      const sys = systemPrompt(context, options)
      const prompt = toHuggingFacePrompt(sys, messages)
      try {
        const reply = await hfGenerate(hfChatModel, hfToken, prompt)
        const elapsedMs = Date.now() - t0
        return res.status(200).json({ reply, provider: 'huggingface', modelUsed: hfChatModel, note: 'ok', elapsedMs, traceId })
      } catch (e) {
        // Try fallback model if specified/available
        if ((e?.code === 'HF_LOADING' || e?.code === 'HF_TIMEOUT' || e?.code === 'HF_NOT_FOUND') && hfFallbackModel && hfFallbackModel !== hfChatModel) {
          try {
            const reply2 = await hfGenerate(hfFallbackModel, hfToken, prompt)
            const elapsedMs = Date.now() - t0
            return res.status(200).json({ reply: reply2, provider: 'huggingface', modelUsed: hfFallbackModel, note: `fallback:${e?.code||'error'}` , elapsedMs, traceId })
          } catch (e2) {}
        }
        // If forced HF fails and OpenAI is available, try OpenAI before local
        if (openaiAvailable) {
          const sys2 = systemPrompt(context, options)
          const payload2 = {
            model,
            messages: [
              { role: 'system', content: sys2 },
              ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
            ],
            temperature: 0.3,
            max_tokens: 400,
          }
          try {
            const r2 = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
              body: JSON.stringify(payload2)
            })
            if (r2.ok) {
              const data2 = await r2.json()
              const reply2 = data2?.choices?.[0]?.message?.content || 'I’m here to help.'
              const elapsedMs = Date.now() - t0
              return res.status(200).json({ reply: reply2, provider: 'openai-compatible', modelUsed: model, note: 'hf-failed:openai-ok', elapsedMs, traceId })
            }
          } catch {}
        }
        const reply = localFallback(messages, context)
        const elapsedMs = Date.now() - t0
        return res.status(200).json({ reply, provider: 'local-fallback', modelUsed: hfChatModel, note: e?.message || 'hf-error', elapsedMs, traceId })
      }
    }

    // Provider priority: OpenAI-compatible -> Hugging Face Inference API -> local fallback
    if (!openaiAvailable) {
      if (hfAvailable) {
        const sys = systemPrompt(context, options)
        const prompt = toHuggingFacePrompt(sys, messages)
        try {
          const reply = await hfGenerate(hfChatModel, hfToken, prompt)
          const elapsedMs = Date.now() - t0
          return res.status(200).json({ reply, provider: 'huggingface', modelUsed: hfChatModel, note: 'ok', elapsedMs, traceId })
        } catch (e) {
          console.error('HF chat error (primary)', e)
          // Try fallback model on known transient or model issues
          if ((e?.code === 'HF_LOADING' || e?.code === 'HF_TIMEOUT' || e?.code === 'HF_NOT_FOUND') && hfFallbackModel && hfFallbackModel !== hfChatModel) {
            try {
              const reply2 = await hfGenerate(hfFallbackModel, hfToken, prompt)
              const elapsedMs = Date.now() - t0
              return res.status(200).json({ reply: reply2, provider: 'huggingface', modelUsed: hfFallbackModel, note: `fallback:${e?.code||'error'}`, elapsedMs, traceId })
            } catch (e2) {
              console.error('HF chat error (fallback model)', e2)
            }
          }
          const reply = localFallback(messages, context)
          const elapsedMs = Date.now() - t0
          return res.status(200).json({ reply, provider: 'local-fallback', modelUsed: hfChatModel, note: e?.message || 'hf-error', elapsedMs, traceId })
        }
      } else {
        const reply = localFallback(messages, context)
        const elapsedMs = Date.now() - t0
        return res.status(200).json({ reply, provider: 'local-fallback', note: 'no-provider', elapsedMs, traceId })
      }
    }

    const sys = systemPrompt(context, options)
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
    const elapsedMs = Date.now() - t0
    return res.status(200).json({ reply, provider: 'openai-compatible', modelUsed: model, note: 'ok', elapsedMs, traceId })
  } catch (e) {
    console.error('artemis-chat error', e)
    return res.status(500).json({ error: e?.message || 'Server error' })
  }
}

function systemPrompt(ctx, options) {
  const { path, product, role } = ctx || {}
  const personaStyle = options?.persona || 'friendly and helpful';
  const basics = `You are Artemis, an AI assistant for an artisan marketplace. Your personality is ${personaStyle}. Be concise, kind, and helpful. Never invent unavailable product specifics (dimensions, materials) — instead, suggest asking the artisan.`
  const page = path ? `Current page: ${path}.` : ''
  const prod = product ? `Product: ${product.name} • Category: ${product.category || ''} • Price: ₹${product.price ?? ''} • Stock: ${product.stock ?? ''} • Origin: ${product.region || ''} • Techniques: ${(product.techniques || []).join(', ')}` : 'Product: none.'
  const userRole = role ? `User role: ${role}.` : ''
  return `${basics}\n${page}\n${prod}\n${userRole}\nGuidelines: Help with materials/care/gifting/delivery generally; for exact details, recommend “Chat with Artisan.”`
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
  parts.push( hist.join('\n'))
  parts.push('\nAssistant:')
  return parts.join('\n')
}

async function hfGenerate(model, token, prompt) {
  const url = `https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 320, temperature: 0.3, return_full_text: false }, options: { wait_for_model: true } })
  })
  if (r.status === 404) {
    const err = new Error(`HF_NOT_FOUND: ${model}`)
    err.code = 'HF_NOT_FOUND'
    err.raw = await r.text()
    throw err
  }
  if (!r.ok) throw new Error(`HF chat error ${r.status}: ${await r.text()}`)
  const data = await r.json()
  // Inference API typically returns an array of objects with generated_text
  if (Array.isArray(data) && data[0]?.generated_text) return data[0].generated_text
  // Some models return { generated_text: '...' }
  if (data?.generated_text) return data.generated_text
  // Fallback to string
  return typeof data === 'string' ? data : 'I’m here to help.'
}

function sanitizeModelId(s) {
  if (!s) return s
  let id = String(s).trim()
  // Strip surrounding quotes accidentally added in dashboards
  id = id.replace(/^"|"$/g, '')
  id = id.replace(/^'|'$/g, '')
  // Remove accidental trailing version spec like ":something" that Inference API may not accept
  if (id.includes(':')) {
    id = id.split(':')[0]
  }
  return id
}

async function getJson(req) {
  if (typeof req.body === 'object' && req.body) return req.body
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(raw) } catch { return null }
}
