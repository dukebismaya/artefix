export function formatINR(value) {
  const amount = Number(value || 0)
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount)
  } catch {
    // Fallback
    return `₹${amount.toFixed(2)}`
  }
}
