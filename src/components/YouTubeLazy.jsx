import { memo, useEffect, useRef, useState } from 'react'

function toYouTubeEmbed(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`
    }
  } catch {}
  return url
}

function youTubeId(url) {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1)
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v')
  } catch {}
  return null
}

function YouTubeLazyImpl({ url, storageKey }) {
  const [play, setPlay] = useState(false)
  const id = youTubeId(url)
  const embed = toYouTubeEmbed(url)
  const lsKey = storageKey ? `embed.play.${storageKey}` : (id ? `embed.play.youtube:${id}` : null)
  const mountRef = useRef(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!lsKey) return
    try {
      const v = localStorage.getItem(lsKey)
      if (v === '1') setPlay(true)
    } catch {}
  }, [lsKey])

  function onPlay() {
    setPlay(true)
    if (lsKey) {
      try { localStorage.setItem(lsKey, '1') } catch {}
    }
  }
  useEffect(() => {
    if (!play || mountedRef.current || !mountRef.current) return
    // Imperatively create iframe once to avoid remounting on re-renders
    const iframe = document.createElement('iframe')
    iframe.setAttribute('loading', 'lazy')
    iframe.setAttribute('title', 'YouTube video')
    iframe.setAttribute('frameborder', '0')
    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share')
    iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
    iframe.allowFullscreen = true
    iframe.src = embed
    iframe.className = 'w-full h-full'
    mountRef.current.appendChild(iframe)
    mountedRef.current = true
  }, [play, embed])

  if (play || !id) {
    return <div className="aspect-video" ref={mountRef}></div>
  }
  const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  return (
    <button
      type="button"
      onClick={onPlay}
      className="relative block w-full aspect-video group"
      title="This will load content from YouTube (third-party). It may set cookies and make network requests."
      aria-label="Click to load YouTube video"
    >
      <img src={thumb} alt="YouTube thumbnail" className="w-full h-full object-cover" />
      <div className="absolute inset-0 grid place-items-center">
        <div className="h-14 w-14 rounded-full bg-black/60 grid place-items-center group-hover:scale-105 transition">
          <ion-icon name="play" className="text-white text-2xl"></ion-icon>
        </div>
      </div>
      <div className="absolute left-2 right-2 bottom-2 text-[10px] text-gray-300/90 bg-black/40 rounded px-2 py-1">
        Loads YouTube (3P). Click to continue.
      </div>
    </button>
  )
}

const YouTubeLazy = memo(YouTubeLazyImpl)
export default YouTubeLazy
