import { ArrowLeft, Clock, MapPin, User, BookOpen, Check, CalendarDays } from 'lucide-react'
import { Button, Card, Badge, ListToolbar } from './ui'
import { useListControls } from '../hooks/useListControls'
import { money, fmtTime } from '../lib/format'

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'start_time', label: 'Time' },
  { key: 'courses.price', label: 'Price' },
  { key: 'courses.subject_area', label: 'Subject' },
  { key: 'courses.grade_level', label: 'Grade' },
]

const leadOf = (c) => c.class_teachers?.find(ct => ct.role === 'lead')?.profiles?.full_name

/**
 * Full-page class browser used when enrolling a member (family + admin).
 *   classes  — the available classes to choose from (already filtered)
 *   counts   — map of class_id → enrolled count (for capacity / "Full")
 *   mode     — 'enroll' | 'request' (controls the action label)
 *   onPick(classId), onBack(), busy
 */
export default function ClassPicker({ memberName, classes, counts = {}, mode = 'enroll', onPick, onBack, busy }) {
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result } =
    useListControls(classes, { searchKeys: ['name', 'courses.name', 'courses.subject_area', 'courses.grade_level', 'room'], sortOptions: SORT_OPTIONS })

  const actionLabel = mode === 'request' ? 'Request' : 'Enroll'
  const semesterNames = [...new Set(classes.map(c => c.semesters?.name).filter(Boolean))]

  return (
    <div className="max-w-4xl animate-fade-in">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer transition-colors">
        <ArrowLeft size={15} /> Back
      </button>

      <div className="mb-5">
        <h1 className="font-display text-2xl text-slate-900">{mode === 'request' ? 'Request a class' : 'Enroll in a class'}</h1>
        {memberName && (
          <p className="text-sm text-slate-400 mt-0.5">
            For <span className="font-medium text-slate-600">{memberName}</span>
            {semesterNames.length === 1 && <> · <span className="font-medium text-slate-600">{semesterNames[0]}</span></>}
            {' · '}{classes.length} class{classes.length === 1 ? '' : 'es'} available
          </p>
        )}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search classes…"
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      {classes.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-8 text-center">No more classes are available to add.</p></Card>
      ) : result.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-8 text-center">No classes match your search.</p></Card>
      ) : (
        <div className="space-y-2.5">
          {result.map(c => {
            const enrolled = counts[c.id] || 0
            const full = c.max_students != null && enrolled >= c.max_students
            const lead = leadOf(c)
            return (
              <Card key={c.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-slate-900">{c.name}</p>
                    {c.courses?.subject_area && <Badge variant="academics">{c.courses.subject_area}</Badge>}
                    {c.courses?.grade_level && <span className="text-xs text-slate-400">{c.courses.grade_level}</span>}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center flex-wrap gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1"><BookOpen size={11} />{c.courses?.name || '—'}</span>
                    {c.day_of_week && <span className="flex items-center gap-1"><Clock size={11} />{c.day_of_week} {fmtTime(c.start_time)}{c.end_time ? `–${fmtTime(c.end_time)}` : ''}</span>}
                    {c.room && <span className="flex items-center gap-1"><MapPin size={11} />{c.room}</span>}
                    {lead && <span className="flex items-center gap-1"><User size={11} />{lead}</span>}
                    {c.semesters?.name && <span className="flex items-center gap-1"><CalendarDays size={11} />{c.semesters.name}</span>}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <div className="text-right">
                    {c.courses?.price != null && <p className="text-sm font-semibold text-yellow-700">{money(c.courses.price)}</p>}
                    <p className="text-[11px] text-slate-400">
                      {full ? <span className="text-red-500 font-medium">Full</span> : `${enrolled}${c.max_students != null ? ` / ${c.max_students}` : ''}`}
                    </p>
                  </div>
                  <Button variant="gold" size="sm" disabled={busy || full} onClick={() => onPick(c.id)}>
                    <Check size={13} /> {actionLabel}
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
