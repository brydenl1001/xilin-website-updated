import { useState, useEffect } from 'react'
import { listPublicClasses } from '../../lib/supabaseClient'
import { Users, BookOpen, ArrowRight, ChevronRight, X, Clock, MapPin, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button, ListToolbar, Badge } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'

const money = (n) => `$${Number(n || 0).toLocaleString()}`
const fmtTime = (t) => (t ? t.slice(0, 5) : '')
const schedule = (c) => c.day_of_week
  ? `${c.day_of_week}${c.start_time ? ` · ${fmtTime(c.start_time)}${c.end_time ? `–${fmtTime(c.end_time)}` : ''}` : ''}`
  : 'Sundays'

const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'start_time', label: 'Time' },
  { key: 'price', label: 'Price' },
  { key: 'grade_level', label: 'Grade' },
]

export default function PublicClasses() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    listPublicClasses().then(setClasses).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(classes, { searchKeys: ['name', 'course_name', 'subject_area', 'grade_level', 'description', 'code', 'room'], sortOptions: SORT_OPTIONS })

  // Group the filtered+sorted result by subject; groups stay alphabetical while
  // classes inside each group keep the chosen sort order.
  const bySubject = filtered.reduce((acc, c) => {
    const key = c.subject_area || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  const subjects = Object.keys(bySubject).sort()

  const isFull = (c) => c.max_students != null && Number(c.enrolled) >= Number(c.max_students)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">Academics</p>
        <h1 className="font-display text-4xl text-slate-900 mb-3">Class Catalog</h1>
        <p className="text-slate-500 max-w-xl mx-auto">Browse the classes running this term — students and parents alike are welcome to enroll. Tap any class for details.</p>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading classes…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && (
        <>
        {classes.length > 0 && (
          <ListToolbar query={query} onQuery={setQuery} placeholder="Search classes…"
            sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />
        )}
        <div className="space-y-6 mb-10">
          {subjects.map(subject => (
            <div key={subject}>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="font-display text-base text-slate-900">{subject}</h2>
                <span className="text-xs text-slate-400">{bySubject[subject].length}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {bySubject[subject].map(cls => {
                  const full = isFull(cls)
                  return (
                    <button key={cls.id} onClick={() => setSelected(cls)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-900 truncate">{cls.name}</span>
                          {cls.grade_level && <span className="text-xs text-slate-400">{cls.grade_level}</span>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center flex-wrap gap-x-1.5 gap-y-0.5">
                          <Clock size={11} /> {schedule(cls)}
                          {cls.room && <><span className="text-slate-300">·</span><MapPin size={11} /> {cls.room}</>}
                          {cls.teacher_name && <><span className="text-slate-300">·</span><User size={11} /> {cls.teacher_name}</>}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {cls.max_students != null && (
                          full
                            ? <Badge variant="danger">Full</Badge>
                            : <span className="text-[11px] text-slate-400">{cls.enrolled}/{cls.max_students}</span>
                        )}
                        {cls.price != null && <span className="text-sm font-medium text-yellow-700">{money(cls.price)}</span>}
                        <ChevronRight size={15} className="text-slate-300" />
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {subjects.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-12">
              {classes.length === 0 ? 'No classes are scheduled right now. Please check back soon.' : 'No classes match your search.'}
            </p>
          )}
        </div>
        </>
      )}

      {/* Info strip */}
      <div className="bg-navy rounded-2xl p-7 text-white grid md:grid-cols-3 gap-6">
        {[
          { icon: BookOpen, title: 'Choose Your Classes', desc: 'Pick any class — each lists its schedule, suggested grade range and term price.' },
          { icon: Users, title: 'Small Class Sizes', desc: 'Personalised attention with caring, experienced teachers.' },
          { icon: ArrowRight, title: 'Open to Everyone', desc: 'Both students and parents can enroll in classes they love.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title}>
            <div className="w-9 h-9 rounded-lg bg-yellow-400/15 flex items-center justify-center mb-3"><Icon size={16} className="text-yellow-400" /></div>
            <h3 className="font-display text-base text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-8">
        <Link to="/enroll"><Button variant="gold" size="lg">Apply to Enroll <ArrowRight size={16} /></Button></Link>
      </div>

      {/* Class detail popup */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-1">{selected.subject_area || 'Class'}</p>
            <h2 className="font-display text-2xl text-slate-900 mb-1">{selected.name}</h2>
            <p className="text-sm text-slate-500 mb-4">{selected.course_name}{selected.code ? ` · ${selected.code}` : ''}</p>
            {selected.description && <p className="text-sm text-slate-600 leading-relaxed mb-5">{selected.description}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50 rounded-xl p-4 mb-5">
              {[
                ['Schedule', schedule(selected)],
                ['Teacher', selected.teacher_name || 'To be announced'],
                ['Room', selected.room || '—'],
                ['Grade Range', selected.grade_level || 'All ages'],
                ['Availability', selected.max_students != null
                  ? (isFull(selected) ? 'Full' : `${selected.enrolled}/${selected.max_students} enrolled`)
                  : 'Open'],
                ['Tuition', selected.price != null ? `${money(selected.price)}/term` : '—'],
                ['Materials Fee', selected.materials_fee != null ? money(selected.materials_fee) : 'None'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-slate-900">{v}</p>
                </div>
              ))}
            </div>
            <Link to="/enroll"><Button variant="gold" className="w-full">Enroll in this class <ArrowRight size={15} /></Button></Link>
          </div>
        </div>
      )}
    </div>
  )
}
