import { useState, useMemo } from 'react'

// Read a possibly-nested path like "courses.name" off an object.
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)

// Compare values numerically when both look numeric, otherwise natural string order.
const cmp = (a, b) => {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  const na = Number(a), nb = Number(b)
  if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

/**
 * Shared search + sort state for list pages.
 *   searchKeys: array of (possibly dotted) paths to match the query against
 *   sortOptions: [{ key, label }]
 * Returns the controls plus the filtered+sorted `result`.
 */
export function useListControls(items, { searchKeys = [], sortOptions = [], initialSortKey, initialDir = 'asc' } = {}) {
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState(initialSortKey ?? sortOptions[0]?.key ?? '')
  const [sortDir, setSortDir] = useState(initialDir)

  const result = useMemo(() => {
    let r = items || []
    if (query.trim()) {
      const q = query.toLowerCase()
      r = r.filter(it => searchKeys.some(k => String(getPath(it, k) ?? '').toLowerCase().includes(q)))
    }
    if (sortKey) {
      r = [...r].sort((a, b) => cmp(getPath(a, sortKey), getPath(b, sortKey)) * (sortDir === 'asc' ? 1 : -1))
    }
    return r
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, sortKey, sortDir])

  const toggleDir = () => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
  return { query, setQuery, sortKey, setSortKey, sortDir, setSortDir, toggleDir, result }
}
