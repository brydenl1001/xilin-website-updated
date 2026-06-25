import { useState, useEffect } from 'react'
import { listPublicCourses } from '../../lib/supabaseClient'
import { Users, BookOpen, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'

const SUBJECT_COLORS = ['bg-yellow-100 text-yellow-700', 'bg-cyan-100 text-cyan-700', 'bg-sky-100 text-sky-700', 'bg-slate-100 text-slate-700', 'bg-emerald-100 text-emerald-700', 'bg-blue-100 text-blue-700']

export default function PublicClasses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listPublicCourses()
      .then(setCourses)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Group courses by subject area so the catalog reads as a set of categories.
  const bySubject = courses.reduce((acc, c) => {
    const key = c.subject_area || 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  const subjects = Object.keys(bySubject).sort()

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">Academics</p>
        <h1 className="font-display text-4xl text-slate-900 mb-4">Class Catalog</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Browse our full catalog of classes. Students and parents alike are welcome to enroll in any class that interests them.
        </p>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading classes…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && (
        <div className="space-y-8 mb-12">
          {subjects.map(subject => (
            <div key={subject}>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-display text-xl text-slate-900">{subject}</h2>
                <span className="text-xs text-slate-400">
                  {bySubject[subject].length} class{bySubject[subject].length !== 1 ? 'es' : ''}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {bySubject[subject].map((course, i) => (
                  <div key={course.id} className="border border-slate-200 bg-white rounded-2xl p-5 hover:border-yellow-300 transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-display text-lg text-slate-900 leading-snug">{course.name}</h3>
                      {course.code && (
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`}>
                          {course.code}
                        </span>
                      )}
                    </div>
                    {course.description && (
                      <p className="text-sm text-slate-600 leading-relaxed mb-3">{course.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs">
                      {course.grade_level && (
                        <span className="text-slate-500">{course.grade_level}</span>
                      )}
                      {course.price != null && (
                        <span className="font-medium text-yellow-700">${Number(course.price).toLocaleString()}/term</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {subjects.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-12">No classes published yet.</p>
          )}
        </div>
      )}

      {/* Info grid */}
      <div className="bg-navy rounded-2xl p-8 text-white grid md:grid-cols-3 gap-8">
        {[
          { icon: BookOpen, title: 'Choose Your Classes', desc: 'Pick any class from the catalog — each lists its suggested grade range and term price.' },
          { icon: Users, title: 'Small Class Sizes', desc: 'An average of 30 learners per class ensures personalised attention.' },
          { icon: ArrowRight, title: 'Open to Everyone', desc: 'Both students and parents can enroll in classes that match their interests.' },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title}>
            <div className="w-9 h-9 rounded-lg bg-yellow-400/15 flex items-center justify-center mb-3">
              <Icon size={16} className="text-yellow-400" />
            </div>
            <h3 className="font-display text-base text-white mb-1">{title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <p className="text-slate-500 mb-4">Ready to join a class?</p>
        <Link to="/enroll">
          <Button variant="gold" size="lg">Apply to Enroll <ArrowRight size={16} /></Button>
        </Link>
      </div>
    </div>
  )
}
