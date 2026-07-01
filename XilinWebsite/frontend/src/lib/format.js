// Small shared formatting helpers used across pages.

/**
 * Format a number as USD with a leading minus sign for negatives,
 * e.g. 12 → "$12.00", -12 → "-$12.00", null → "$0.00".
 */
export function money(n) {
  return `${Number(n) < 0 ? '-' : ''}$${Math.abs(Number(n || 0)).toFixed(2)}`
}

/** Trim an HH:MM:SS time string down to HH:MM, e.g. "09:30:00" → "09:30". */
export function fmtTime(t) {
  return t ? t.slice(0, 5) : ''
}
