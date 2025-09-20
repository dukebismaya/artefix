import { useEffect, useRef, useState } from 'react'

export default function ChatBot({ product, onClose }) {
  const [messages, setMessages] = useState(() => ([
    { role: 'assistant', content: `Hi! Ask me anything about “${product.name}”. I can help with materials, use-cases, care, and gifting ideas.` }
  ]))
  const [input, setInput] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    document.documentElement.classList.add('modal-open')
    return () => document.documentElement.classList.remove('modal-open')
  }, [])

  function mockAnswer(q) {
    const lower = q.toLowerCase()
    const hints = []
    if (product.category) hints.push(`Category: ${product.category}`)
    if (product.price) hints.push(`Price: $${Number(product.price).toFixed(2)}`)

    if (lower.includes('material') || lower.includes('made')) {
      return `This ${product.name} is handcrafted with high-quality materials chosen by the artisan. ${hints.join(' • ')}`
    }
    if (lower.includes('care') || lower.includes('wash')) {
      return `Care tips: Keep away from harsh chemicals and prolonged moisture. Clean gently with a soft cloth.`
    }
    if (lower.includes('gift') || lower.includes('present')) {
      return `It makes a thoughtful gift! Consider pairing it with a handwritten note or local wrapping for a personal touch.`
    }
    if (lower.includes('size') || lower.includes('dimension')) {
      return `Sizes vary as each piece is handmade. If you need exact dimensions, the artisan can provide them upon request.`
    }
    return `This piece is artisan-made and unique. ${hints.join(' • ')}`
  }

  function sendMessage() {
    const q = input.trim()
    if (!q) return
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInput('')
    setTimeout(() => {
      const a = mockAnswer(q)
      setMessages(prev => [...prev, { role: 'assistant', content: a }])
    }, 500)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6 bg-black/50 animate-fade-in" ref={dialogRef}>
      <div className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/60 dark:border-gray-800/60">
          <h3 className="font-semibold">Ask AI about “{product.name}”</h3>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 p-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'assistant' ? 'flex justify-start' : 'flex justify-end'}>
              <div className={m.role === 'assistant' ? 'bg-indigo-50 text-gray-800 dark:bg-indigo-900/40 dark:text-indigo-50' : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'} style={{}}>
                <p className={`px-3 py-2 rounded-2xl ${m.role === 'assistant' ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>{m.content}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200/60 dark:border-gray-800/60 p-3">
          <div className="flex items-center gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              className="input min-h-[44px] max-h-32 flex-1 resize-y"
              placeholder="Ask about materials, care, gifting ideas..."
            />
            <button className="btn btn-primary text-white" onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
