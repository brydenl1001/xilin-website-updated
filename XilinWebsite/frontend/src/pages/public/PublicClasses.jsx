import { useState, useEffect } from 'react'
import { listPublicCourses } from '../../lib/supabaseClient'
import { Users, BookOpen, ArrowRight, ChevronRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'

const money = (n) => `$${Number(n || 0).toLocaleString()}`

export default function PublicClasses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    listPublicCourses().then(setCourses).catch(err => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const bySubject = courses.reduce((acc, c) => {
    const key = c.subject_area || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  const subjects = Object.keys(bySubject).sort()

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8 text-center">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">Academics</p>
        <h1 className="font-display text-4xl text-slate-900 mb-3">Class Catalog</h1>
        <p className="text-slate-500 max-w-xl mx-auto">Browse our classes — students and parents alike are welcome to enroll. Tap any class for details.</p>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading classes…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && (
        <div className="space-y-6 mb-10">
          {subjects.map(subject => (
            <div key={subject}>
              <div className="flex items-baseline gap-2 mb-2 px-1">
                <h2 className="font-display text-base text-slate-900">{subject}</h2>
                <span className="text-xs text-slate-400">{bySubject[subject].length}</span>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {bySubject[subject].map(course => (
                  <button key={course.id} onClick={() => setSelected(course)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-slate-900">{course.name}</span>
                      {course.grade_level && <span className="text-xs text-slate-400 ml-2">{course.grade_level}</span>}
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {course.price != null && <span className="text-sm font-medium text-yellow-700">{money(course.price)}</span>}
                      <ChevronRight size={15} className="text-slate-300" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {subjects.length === 0 && <p className="text-slate-400 text-sm text-center py-12">No classes published yet.</p>}
        </div>
      )}

      {/* Info strip */}
      <div className="bg-navy rounded-2xl p-7 text-white grid md:grid-cols-3 gap-6">
        {[
          { icon: BookOpen, title: 'Choose Your Classes', desc: 'Pick any class — each lists its suggested grade range and term price.' },
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-1">{selected.subject_area || 'Class'}</p>
            <h2 className="font-display text-2xl text-slate-900 mb-1">{selected.name}</h2>
            {selected.code && <p className="font-mono text-xs text-slate-400 mb-4">{selected.code}</p>}
            {selected.description && <p className="text-sm text-slate-600 leading-relaxed mb-5">{selected.description}</p>}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50 rounded-xl p-4 mb-5">
              {[
                ['Grade Range', selected.grade_level || 'All ages'],
                ['Schedule', 'Sundays'],
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
