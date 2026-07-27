import { schoolInfo } from '../lib/basicInfo'

// Week numbers aren't stored — they're the running count of class days, so a
// holiday leaves a blank and inserting/removing a date renumbers on its own.
export function withWeekNumbers(sessions) {
  let week = 0
  return [...sessions]
    .sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''))
    .map(s => ({ ...s, weekNo: s.has_class ? ++week : null }))
}

/** "2026-08-23" → "08-23-2026" (matches the printed calendar). */
export const fmtCalDate = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${m}-${d}-${y}`
}

/** "2026 Fall Semester" from the semester's term + class-start year. */
const semesterHeading = (sem) => {
  const year = (sem.class_start || '').slice(0, 4) || ''
  return `${year} ${sem.term || sem.name} Semester`.trim()
}

function SemesterTable({ semester, sessions }) {
  const rows = withWeekNumbers(sessions)
  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden">
      <div className="bg-slate-200/70 px-3 py-1.5 text-center">
        <p className="font-display text-sm text-slate-900">{semesterHeading(semester)}</p>
      </div>
      <table className="w-full text-[11px] sm:text-xs">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="px-2 py-1 font-medium border-b border-slate-200 w-12">Week #</th>
            <th className="px-2 py-1 font-medium border-b border-slate-200 whitespace-nowrap">Date</th>
            <th className="px-2 py-1 font-medium border-b border-slate-200 w-12">Class</th>
            <th className="px-2 py-1 font-medium border-b border-slate-200 text-left">Descriptions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={4} className="px-2 py-6 text-center text-slate-400">No dates scheduled yet.</td></tr>
          ) : rows.map(r => (
            <tr key={r.id || r.session_date} className={r.has_class ? '' : 'bg-slate-50/70 text-slate-500'}>
              <td className="px-2 py-1 text-center border-b border-slate-100">{r.weekNo ?? ''}</td>
              <td className="px-2 py-1 text-center border-b border-slate-100 whitespace-nowrap">{fmtCalDate(r.session_date)}</td>
              <td className="px-2 py-1 text-center border-b border-slate-100">{r.has_class ? 'Yes' : 'No'}</td>
              <td className="px-2 py-1 border-b border-slate-100">{r.description || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * The printed-style school-year calendar: one table per semester, side by side.
 *   semesters — the semesters of a single academic year (ordered by class_start)
 *   sessions  — every session row for those semesters
 */
export default function SchoolYearCalendar({ academicYear, semesters = [], sessions = [], tentative = true }) {
  if (semesters.length === 0) return null
  const ordered = [...semesters].sort((a, b) => (a.class_start || '').localeCompare(b.class_start || ''))
  const lastUpdated = sessions.reduce((max, s) => (s.updated_at > max ? s.updated_at : max), '')

  return (
    <div className="bg-white border border-slate-300 rounded-xl p-4 sm:p-5">
      <p className="text-center font-display text-base sm:text-lg text-slate-900 mb-3">
        {schoolInfo.name} {academicYear} School Year Calendar
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {ordered.map(sem => (
          <SemesterTable key={sem.id} semester={sem}
            sessions={sessions.filter(s => s.semester_id === sem.id)} />
        ))}
      </div>
      <div className="flex justify-between items-center gap-3 flex-wrap mt-3 text-[11px] text-slate-400">
        <span>{tentative ? 'Tentative plan only 计划日期.' : ''}</span>
        {lastUpdated && <span>(Updated on {fmtCalDate(lastUpdated.slice(0, 10))}, subject to change.)</span>}
      </div>
    </div>
  )
}
