const ARTEMIS_ENDPOINT = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_ARTEMIS_CHAT_URL) || '/api/artemis-chat'

export async function artemisAsk({ messages, context, options }) {
  const r = await fetch(ARTEMIS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, context, options })
  })
  if (!r.ok) throw new Error(await r.text())
  const data = await r.json()
  return {
    reply: data.reply || '',
    provider: data.provider || 'unknown',
    elapsedMs: data.elapsedMs || 0,
    note: data.note || '',
    traceId: data.traceId || '',
    modelUsed: data.modelUsed || ''
  }
}
