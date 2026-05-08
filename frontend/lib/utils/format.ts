export function indianNumber(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '0'
  return new Intl.NumberFormat('en-IN').format(n)
}

export function formatINRShort(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '₹0'
  const v = Number(n)
  const abs = Math.abs(v)
  if (abs >= 10000000) {
    return `₹${(v/10000000).toFixed(2)}Cr`
  }
  if (abs >= 100000) {
    return `₹${(v/100000).toFixed(2)}L`
  }
  if (abs >= 1000) {
    return `₹${(v/1000).toFixed(2)}K`
  }
  return `₹${v}`
}
