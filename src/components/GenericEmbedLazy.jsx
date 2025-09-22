import { useEffect, useRef, useState, memo } from 'react'

function GenericEmbedLazyImpl({ src, storageKey, title = 'Embedded content', allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen', referrerPolicy = 'strict-origin-when-cross-origin', sandbox, className = '' }) {
  const [load, setLoad] = useState(false)
  const mountRef = useRef(null)
  const mountedRef = useRef(false)
  const lsKey = storageKey ? `embed.play.${storageKey}` : null

  useEffect(() => {
    if (!lsKey) return
    try { if (localStorage.getItem(lsKey) === '1') setLoad(true) } catch {}
  }, [lsKey])

  useEffect(() => {
    if (!load || mountedRef.current || !mountRef.current) return
    const iframe = document.createElement('iframe')
    iframe.src = src
    iframe.title = title
    iframe.loading = 'lazy'
    iframe.className = 'w-full h-full'
  iframe.setAttribute('frameborder', '0')
  iframe.setAttribute('allow', allow)
  iframe.setAttribute('referrerpolicy', referrerPolicy)
  if (sandbox) iframe.setAttribute('sandbox', sandbox)
  // Use the property (not attribute) to avoid precedence warnings
  iframe.allowFullscreen = true
    mountRef.current.appendChild(iframe)
    mountedRef.current = true
  }, [load, src, title, allow, referrerPolicy, sandbox])

  function onLoad() {
    setLoad(true)
    if (lsKey) {
      try { localStorage.setItem(lsKey, '1') } catch {}
    }
  }

  if (load) return <div className={`aspect-video ${className}`} ref={mountRef}></div>

  return (
    <button
      type="button"
      onClick={onLoad}
      className={`relative block w-full aspect-video group bg-gray-900 ${className}`}
      title="This will load third-party content. It may set cookies and make network requests."
      aria-label="Click to load embed"
    >
      <div className="absolute inset-0 grid place-items-center">
        <div className="px-3 py-2 rounded-full bg-black/60 text-white text-sm group-hover:scale-105 transition">Click to load embed</div>
      </div>
      <div className="absolute left-2 right-2 bottom-2 text-[10px] text-gray-300/90 bg-black/40 rounded px-2 py-1">
        Loads third-party content. Click to continue.
      </div>
    </button>
  )
}

export default memo(GenericEmbedLazyImpl)
