import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { formatINR } from '../utils/format.js'

/**
 * SharePoster: renders a social share poster to a canvas and provides download/share actions.
 * Props:
 * - product: { id, name, price, image }
 * - shareUrl: string (e.g., product deep link)
 * - onReady?: (dataUrl) => void
 */
export default function SharePoster({ product, shareUrl, onReady }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    let active = true
    async function draw() {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      const W = 1080, H = 1920
      canvas.width = W
      canvas.height = H

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, '#0b1220')
      grad.addColorStop(1, '#05070d')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Product image
      const img = await loadImage(product.image)
      const imgH = Math.min(H * 0.48, (W - 160) * (img.height / img.width))
      const imgW = imgH * (img.width / img.height)
      const imgX = (W - imgW) / 2
      const imgY = 160
      // image shadow card
      roundedRect(ctx, imgX - 12, imgY - 12, imgW + 24, imgH + 24, 28)
      ctx.fillStyle = 'rgba(0,0,0,0.35)'
      ctx.fill()
      // cover
      drawCover(ctx, img, imgX, imgY, imgW, imgH)

      // Title
      ctx.fillStyle = '#e5e7eb'
      ctx.font = 'bold 56px Poppins, Arial, sans-serif'
      wrapText(ctx, product.name || 'Artisan Craft', 80, imgY + imgH + 80, W - 160, 64)

      // Price pill
      const price = formatINR(product.price || 0)
      pricePill(ctx, price, W - 80, imgY + imgH + 70)

      // QR code
      const qrData = await QRCode.toDataURL(shareUrl, { margin: 0, width: 512 })
      const qr = await loadImage(qrData)
      const qrSize = 320
      ctx.drawImage(qr, W/2 - qrSize/2, H - 480, qrSize, qrSize)
      ctx.fillStyle = 'rgba(186,230,253,0.9)'
      ctx.font = 'bold 32px Poppins, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Scan to buy now', W/2, H - 130)

      if (active && typeof onReady === 'function') {
        onReady(canvas.toDataURL('image/png'))
      }
    }
    draw()
    return () => { active = false }
  }, [product?.id, product?.image, product?.name, product?.price, shareUrl])

  function onDownload() {
    const url = canvasRef.current?.toDataURL('image/png')
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `artifex-${product?.id || 'poster'}.png`
    a.click()
  }

  async function onShare() {
    try {
      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'))
      const file = new File([blob], `artifex-${product?.id || 'poster'}.png`, { type: 'image/png' })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: product?.name || 'Artisan Craft', text: 'Check out this handcrafted piece on Artifex' })
      } else {
        onDownload()
      }
    } catch {
      onDownload()
    }
  }

  return (
    <div className="space-y-3">
      <canvas ref={canvasRef} className="w-full rounded-xl shadow-lg" style={{ maxHeight: 640 }} />
      <div className="flex gap-2">
        <button type="button" className="btn btn-secondary" onClick={onDownload}>Download PNG</button>
        <button type="button" className="btn btn-primary text-white" onClick={onShare}>Share</button>
      </div>
    </div>
  )
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawCover(ctx, img, x, y, w, h) {
  // cover-fit draw
  const iw = img.width
  const ih = img.height
  const ir = iw / ih
  const r = w / h
  let dw = w, dh = h
  if (ir > r) {
    dh = h
    dw = h * ir
  } else {
    dw = w
    dh = w / ir
  }
  const dx = x + (w - dw) / 2
  const dy = y + (h - dh) / 2
  ctx.drawImage(img, dx, dy, dw, dh)
}

function pricePill(ctx, text, right, y) {
  ctx.font = 'bold 40px Poppins, Arial, sans-serif'
  const padX = 24, padY = 10
  const w = ctx.measureText(text).width + padX * 2
  const x = right - w
  roundedRect(ctx, x, y - 44, w, 64, 18)
  const grad = ctx.createLinearGradient(x, y - 44, x + w, y + 20)
  grad.addColorStop(0, '#38bdf8')
  grad.addColorStop(1, '#22d3ee')
  ctx.fillStyle = grad
  ctx.fill()
  ctx.fillStyle = '#0b1220'
  ctx.fillText(text, x + padX, y)
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
