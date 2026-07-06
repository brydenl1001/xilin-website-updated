import { useNavigate } from 'react-router-dom'
import { Badge, Select } from './ui'
import { fmtTime } from '../lib/format'

const DAY_ORDER = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }

// Order classes by day, then start time (untimed classes last).
export const byTime = (a, b) => {
  const da = DAY_ORDER[a.day_of_week] ?? 9, db = DAY_ORDER[b.day_of_week] ?? 9
  if (da !== db) return da - db
  return (a.start_time || '99').localeCompare(b.start_time || '99')
}

const timeRange = (c) => c.start_time
  ? `${fmtTime(c.start_time)}${c.end_time ? ` – ${fmtTime(c.end_time)}` : ''}`
  : 'TBA'

// Distinct semesters present among a set of classes (embed may be null for
// semesters the viewer can't see), newest term first.
export function distinctSemesters(classes) {
  const byId = {}
  classes.forEach(c => { if (c?.semesters) byId[c.semesters.id] = c.semesters })
  return Object.values(byId).sort((a, b) => (b.class_start || '').localeCompare(a.class_start || ''))
}

export function SemesterPicker({ semesters, value, onChange, className = 'w-56' }) {
  if (semesters.length === 0) return null
  return (
    <Select id="sem-pick" value={value} onChange={e => onChange(e.target.value)} className={className}>
      {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>)}
    </Select>
  )
}

function ClassRow({ cls, action }) {
  const navigate = useNavigate()
  return (
    <div onClick={() => navigate(`/class/${cls.id}`)}
      className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900">{cls.name}</p>
          <Badge variant="academics">{cls.courses?.subject_area || 'General'}</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{cls.courses?.name}{cls.room ? ` · ${cls.room}` : ''}</p>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="text-right">
          <p className="font-display text-lg text-slate-900 leading-none whitespace-nowrap">{timeRange(cls)}</p>
          <p className="text-[11px] text-slate-400 mt-1">{cls.day_of_week || '—'}</p>
        </div>
        {action && <span onClick={e => e.stopPropagation()}>{action}</span>}
      </div>
    </div>
  )
}

/**
 * Time-ordered list of class rows, or an empty message.
 * `renderAction(cls)` optionally renders a trailing control (e.g. a drop button).
 */
export default function ClassScheduleList({ classes, empty = 'No classes.', renderAction }) {
  if (!classes.length) return <p className="text-center text-slate-400 py-8 text-sm">{empty}</p>
  return (
    <div className="divide-y divide-slate-100">
      {[...classes].sort(byTime).map(cls => <ClassRow key={cls.id} cls={cls} action={renderAction?.(cls)} />)}
    </div>
  )
}
