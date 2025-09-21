import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { useChat } from '../context/ChatContext.jsx'

export default function DirectChat({ buyerId, sellerId, userA, userB, postId, productId, onClose, sellerName="Artisan" }) {
  const { sendMessage, threadMessages, getOrCreateThread, markSeen } = useChat()
  const { auth } = useAuth()
  const meId = auth?.userId
  const thread = getOrCreateThread({ buyerId, sellerId, userA, userB, productId, postId })
  const [input, setInput] = useState('')
  const listRef = useRef(null)
  const messages = threadMessages(thread.id)

  useEffect(() => {
    document.documentElement.classList.add('modal-open')
    return () => document.documentElement.classList.remove('modal-open')
  }, [])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages.length])

  // Mark messages as seen when opening and when list updates
  useEffect(() => {
    if (!meId) return
    markSeen(thread.id, meId)
  }, [thread.id, meId, messages.length])

  function send() {
    const text = input.trim()
    if (!text) return
  sendMessage({ buyerId, sellerId, userA, userB, fromUserId: meId, content: text, productId, postId })
    setInput('')
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 py-6 bg-black/50 animate-fade-in">
      <div className="card w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="font-semibold">Chat with {sellerName}</h3>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto space-y-2 p-4">
          {messages.map(m => (
            <div key={m.id} className={m.fromUserId === meId ? 'flex justify-end' : 'flex justify-start'}>
              <div className={`px-3 py-2 rounded-2xl text-sm ${m.fromUserId===meId?'bg-teal-600/80 text-white':'bg-gray-800/70 text-gray-100'}`}>{m.content}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <textarea className="input min-h-[44px] max-h-32 flex-1" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Ask about custom sizes, colors, names…" />
            <button className="btn btn-primary text-white" onClick={send}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
