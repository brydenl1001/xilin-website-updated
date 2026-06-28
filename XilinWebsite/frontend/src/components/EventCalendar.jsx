import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// Category styling shared by the calendar grid + legend + event list.
export const EVENT_CAT = {
  registration: { dot: 'bg-yellow-500', text: 'text-yellow-700', label: 'Registration' },
  class:        { dot: 'bg-blue-500',   text: 'text-blue-700',   label: 'Class term' },
  'class-day':  { dot: 'bg-emerald-400', text: 'text-emerald-600', label: 'Class day' },
  event:        { dot: 'bg-amber-500',  text: 'text-amber-700',  label: 'Event' },
  holiday:      { dot: 'bg-red-500',    text: 'text-red-700',    label: 'Holiday / No class' },
  general:      { dot: 'bg-slate-400',  text: 'text-slate-600',  label: 'Other' },
}
const cat = (c) => EVENT_CAT[c] || EVENT_CAT.general

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }

/**
 * Derive calendar events from a semester record: registration + class
 * milestones, plus a "Class day" marker on every Sunday in the class term.
 */
export function semesterEvents(sem) {
  if (!sem) return []
  const evs = []
  if (sem.registration_start) evs.push({ date: sem.registration_start, title: 'Registration opens', category: 'registration' })
  if (sem.registration_end)   evs.push({ date: sem.registration_end, title: 'Registration closes', category: 'registration' })
  if (sem.class_start)        evs.push({ date: sem.class_start, title: 'First day of classes', category: 'class' })
  if (sem.class_end)          evs.push({ date: sem.class_end, title: 'Last day of classes', category: 'class' })
  if (sem.class_start && sem.class_end) {
    const end = parse(sem.class_end)
    const d = parse(sem.class_start)
    while (d.getDay() !== 0) d.setDate(d.getDate() + 1) // advance to first Sunday
    while (d <= end) {
      const s = ymd(d)
      if (s !== sem.class_start && s !== sem.class_end) evs.push({ date: s, title: 'Class day', category: 'class-day' })
      d.setDate(d.getDate() + 7)
    }
  }
  return evs
}

/**
 * Month-grid calendar. `events` is an array of
 *   { date: 'YYYY-MM-DD', endDate?: 'YYYY-MM-DD', title, category, description? }
 * `initialDate` (Date or 'YYYY-MM-DD') sets which month is shown first.
 */
export default function EventCalendar({ events = [], initialDate }) {
  const start = initialDate ? (typeof initialDate === 'string' ? parse(initialDate) : initialDate) : new Date()
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() })

  const todayStr = ymd(new Date())
  const first = new Date(view.y, view.m, 1)
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()
  const leading = first.getDay()
  const cells = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const onDay = (dayStr) => events.filter(e => dayStr >= e.date && dayStr <= (e.endDate || e.date))

  // Events that fall (or are in progress) within the visible month, for the list.
  const monthPrefix = `${view.y}-${String(view.m + 1).padStart(2, '0')}`
  const monthEvents = events
    .filter(e => (e.date || '').startsWith(monthPrefix) || (e.endDate || '').startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date))

  const go = (delta) => setView(v => {
    const nm = v.m + delta
    return { y: v.y + Math.floor(nm / 12), m: ((nm % 12) + 12) % 12 }
  })

  const usedCats = [...new Set(events.map(e => e.category))]

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-xl text-slate-900">{MONTHS[view.m]} {view.y}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => go(-1)} aria-label="Previous month"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
          <button onClick={() => setView({ y: new Date().getFullYear(), m: new Date().getMonth() })}
            className="px-3 h-8 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer">Today</button>
          <button onClick={() => go(1)} aria-label="Next month"
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {WEEKDAYS.map(w => <div key={w} className="text-[10px] font-medium uppercase tracking-wide text-slate-400 py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />
          const dayStr = `${monthPrefix}-${String(d).padStart(2, '0')}`
          const evs = onDay(dayStr)
          const isToday = dayStr === todayStr
          return (
            <div key={i} className={`aspect-square rounded-lg border p-1 flex flex-col ${isToday ? 'border-yellow-400 bg-yellow-50/50' : 'border-slate-100'}`}>
              <span className={`text-[11px] leading-none ${isToday ? 'font-semibold text-yellow-700' : 'text-slate-500'}`}>{d}</span>
              <div className="flex-1 flex flex-col gap-0.5 mt-0.5 overflow-hidden">
                {evs.slice(0, 3).map((e, j) => (
                  <span key={j} title={e.title}
                    className={`hidden sm:block text-[9px] leading-tight truncate px-1 rounded ${cat(e.category).text} bg-slate-50`}>{e.title}</span>
                ))}
                {/* Mobile: dots only */}
                <div className="flex sm:hidden flex-wrap gap-0.5">
                  {evs.slice(0, 3).map((e, j) => <span key={j} className={`w-1.5 h-1.5 rounded-full ${cat(e.category).dot}`} />)}
                </div>
                {evs.length > 3 && <span className="hidden sm:block text-[9px] text-slate-400 px-1">+{evs.length - 3} more</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      {usedCats.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-slate-100">
          {usedCats.map(c => (
            <span key={c} className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className={`w-2 h-2 rounded-full ${cat(c).dot}`} />{cat(c).label}
            </span>
          ))}
        </div>
      )}

      {/* This month's events */}
      <div className="mt-4">
        {monthEvents.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-3">No events this month.</p>
        ) : (
          <div className="space-y-1.5">
            {monthEvents.map((e, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5">
                <div className="text-center flex-shrink-0 w-10">
                  <p className="text-[10px] uppercase text-slate-400 leading-none">{MONTHS[parse(e.date).getMonth()].slice(0, 3)}</p>
                  <p className="font-display text-lg text-slate-900 leading-none mt-0.5">{parse(e.date).getDate()}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat(e.category).dot}`} />{e.title}
                  </p>
                  {e.description && <p className="text-xs text-slate-400 mt-0.5">{e.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
