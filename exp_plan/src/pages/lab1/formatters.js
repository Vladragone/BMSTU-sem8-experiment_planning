export function formatNumber(value, digits = 4) {
  if (!Number.isFinite(value)) {
    return 'n/a'
  }

  return value.toFixed(digits)
}
