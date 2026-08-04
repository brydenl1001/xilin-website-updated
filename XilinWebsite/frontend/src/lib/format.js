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

/**
 * Display name for a person record. Names are stored as separate first_name /
 * last_name columns — this composes them for display ("First Last").
 * Accepts any object with those fields; returns '' when both are missing.
 */
export function personName(p) {
  if (!p) return ''
  return [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
}
