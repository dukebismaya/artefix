// Lightweight shipping estimator for demo purposes
// Heuristic based on first digit distance between Indian PIN/ZIP codes

export function estimateShipping({ fromZip, toZip, weightKg = 0.5 }) {
  const fz = String(fromZip || '').replace(/\D/g, '').slice(0, 6)
  const tz = String(toZip || '').replace(/\D/g, '').slice(0, 6)
  if (!/^\d{6}$/.test(fz) || !/^\d{6}$/.test(tz)) {
    return { serviceable: false, reason: 'Invalid ZIP', zone: null, days: null, cost: 0 }
  }

  const z = Math.abs(Number(fz[0]) - Number(tz[0]))
  const zone = z === 0 ? 'Local/Regional' : z === 1 ? 'Nearby Region' : z <= 3 ? 'Cross-Region' : 'Far'
  const baseDays = z === 0 ? 2 : z === 1 ? 3 : z <= 3 ? 4 : 6
  const days = baseDays + (weightKg > 2 ? 1 : 0)

  const baseCost = z === 0 ? 49 : z === 1 ? 69 : z <= 3 ? 99 : 129
  const weightSurcharge = Math.max(0, Math.ceil(weightKg - 0.5)) * 20
  const cost = Math.max(0, baseCost + weightSurcharge)

  return { serviceable: true, zone, days, cost }
}

export function formatEta(days) {
  if (!days || days < 1) return 'N/A'
  return `${days}–${days + 2} days`
}

// Try to detect user's ZIP using browser geolocation and reverse geocoding (OpenStreetMap Nominatim)
export async function detectZipViaGeolocation({ signal } = {}) {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Geolocation not available')
  }
  const coords = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(err?.message || 'Location permission denied')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    )
  })
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(coords.lat))
  url.searchParams.set('lon', String(coords.lon))
  url.searchParams.set('zoom', '10')
  url.searchParams.set('addressdetails', '1')
  const res = await fetch(url.toString(), { headers: { 'Accept': 'application/json' }, signal })
  if (!res.ok) throw new Error('Reverse geocoding failed')
  const data = await res.json()
  const zip = String(data?.address?.postcode || '')
  if (!/^\d{6}$/.test(zip)) throw new Error('Could not detect a valid PIN')
  return zip
}
