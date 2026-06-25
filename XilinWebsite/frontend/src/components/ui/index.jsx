import { X, Search, ArrowUp, ArrowDown } from 'lucide-react'

// ─── ListToolbar (search + sort) ───────────────────────────────────────────────
export function ListToolbar({ query, onQuery, placeholder = 'Search...', sortOptions = [], sortKey, onSortKey, sortDir, onToggleDir, right }) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 flex-1 min-w-[200px] max-w-sm">
        <Search size={14} className="text-slate-400 flex-shrink-0" />
        <input value={query} onChange={e => onQuery(e.target.value)} placeholder={placeholder}
          className="text-sm outline-none flex-1 placeholder:text-slate-400 bg-transparent text-slate-800" />
      </div>
      {sortOptions.length > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 hidden sm:inline">Sort</span>
          <select value={sortKey} onChange={e => onSortKey(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 h-9 bg-white outline-none text-slate-700 cursor-pointer">
            {sortOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button onClick={onToggleDir} title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            className="h-9 w-9 flex items-center justify-center border border-slate-200 rounded-lg bg-white text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
            {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>
      )}
      {right}
    </div>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'default' }) {
  const styles = {
    default:   'bg-slate-100 text-slate-600',
    success:   'bg-green-100 text-green-700',
    warning:   'bg-amber-100 text-amber-700',
    danger:    'bg-red-100 text-red-700',
    gold:      'bg-yellow-100 text-yellow-800',
    navy:      'bg-blue-100 text-blue-800',
    urgent:    'bg-red-100 text-red-700',
    events:    'bg-amber-100 text-amber-700',
    academics: 'bg-blue-100 text-blue-700',
    general:   'bg-slate-100 text-slate-600',
    pending:   'bg-amber-100 text-amber-700',
    admitted:  'bg-blue-100 text-blue-700',
    enrolled:  'bg-green-100 text-green-700',
    rejected:  'bg-red-100 text-red-700',
    paid:      'bg-green-100 text-green-700',
    failed:    'bg-red-100 text-red-700',
    withdrawn: 'bg-slate-100 text-slate-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[variant] || styles.default}`}>
      {children}
    </span>
  )
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button', disabled, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }
  const variants = {
    primary:   'bg-yellow-500 text-slate-900 hover:bg-yellow-400 active:scale-95',
    secondary: 'bg-navy text-white hover:bg-navy-light active:scale-95',
    outline:   'border border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95',
    ghost:     'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
    danger:    'bg-red-500 text-white hover:bg-red-600 active:scale-95',
    gold:      'bg-yellow-500 text-slate-900 hover:bg-yellow-400 active:scale-95',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200 rounded-xl p-5 ${onClick ? 'cursor-pointer hover:border-yellow-300 transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, delta, trend, Icon }) {
  const iconBg    = trend === 'warn' ? 'bg-amber-100' : 'bg-yellow-50'
  const iconColor = trend === 'warn' ? 'text-amber-700' : 'text-yellow-700'
  const deltaColor = trend === 'warn' ? 'text-amber-600' : 'text-green-600'
  return (
    <Card className="animate-fade-in">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
        {Icon && <Icon size={18} className={iconColor} />}
      </div>
      <p className="font-display text-2xl font-semibold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      <p className={`text-xs mt-2 ${deltaColor}`}>{delta}</p>
    </Card>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ label, id, type = 'text', placeholder, value, onChange, required, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}
        </label>
      )}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 transition-all placeholder:text-slate-300"
      />
    </div>
  )
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ label, id, value, onChange, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 transition-all"
      >
        {children}
      </select>
    </div>
  )
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, id, placeholder, value, onChange, rows = 4, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-slate-600 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 transition-all resize-none placeholder:text-slate-300"
      />
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} p-6 animate-fade-in`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600 transition-colors cursor-pointer">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-base font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  )
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="font-display text-2xl text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ message = 'No data found', icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center mb-3 text-yellow-400 text-xl">
        {icon || '∅'}
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}

// ─── Table helpers ────────────────────────────────────────────────────────────
export function Table({ headers, children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {headers.map(h => (
              <th key={h} className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Tr({ children, onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className = '' }) {
  return (
    <td className={`px-5 py-3.5 text-sm ${className}`}>
      {children}
    </td>
  )
}
