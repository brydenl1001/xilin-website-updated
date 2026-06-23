import { useState, useEffect } from 'react'
import { listPublicCourses } from '../../lib/supabaseClient'
import { Users, BookOpen, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'

const GRADE_COLOR = ['bg-blue-50 border-blue-200', 'bg-yellow-50 border-amber-200', 'bg-green-50 border-green-200', 'bg-purple-50 border-purple-200']
const SUBJECT_COLORS = ['bg-blue-100 text-blue-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700', 'bg-red-100 text-red-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700']

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

  // Group courses by grade_level so the page reads the same as before
  const byGrade = courses.reduce((acc, c) => {
    const key = c.grade_level
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})
  const grades = Object.keys(byGrade).sort((a, b) => a - b)

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">Academics</p>
        <h1 className="font-display text-4xl text-slate-900 mb-4">Our Classes</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Each grade level offers a tailored curriculum across core subjects, taught by dedicated faculty.
        </p>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading courses…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && (
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {grades.map((grade, i) => {
            const courseList = byGrade[grade]
            return (
              <div key={grade} className={`border rounded-2xl p-6 ${GRADE_COLOR[i % GRADE_COLOR.length]}`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display text-xl text-slate-900 mb-0.5">Grade {grade}</h2>
                    <p className="text-sm text-slate-500">{courseList.length} course{courseList.length !== 1 ? 's' : ''} offered</p>
                  </div>
                  <div className="bg-white rounded-xl px-3 py-2 text-center shadow-sm border border-slate-200">
                    <p className="font-display text-2xl text-slate-900">{courseList.length}</p>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wide">Subjects</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {courseList.map((course, si) => (
                    <span key={course.id} className={`text-xs px-2.5 py-1 rounded-full font-medium ${SUBJECT_COLORS[si % SUBJECT_COLORS.length]}`}>
                      {course.name}
                    </span>
                  ))}
                </div>
                {courseList[0]?.description && (
                  <p className="text-sm text-slate-600 mt-4 leading-relaxed">{courseList[0].description}</p>
                )}
              </div>
            )
          })}
          {grades.length === 0 && (
            <p className="text-slate-400 text-sm text-center py-12 col-span-2">No courses published yet.</p>
          )}
        </div>
      )}

      {/* Info grid */}
      <div className="bg-slate-900 rounded-2xl p-8 text-white grid md:grid-cols-3 gap-8">
        {[
          { icon: BookOpen, title: 'Holistic Curriculum', desc: 'Core academics complemented by arts, technology, and physical education.' },
          { icon: Users, title: 'Small Class Sizes', desc: 'An average of 30 students per class ensures personalised attention.' },
          { icon: ArrowRight, title: 'University Pathways', desc: 'Our Grade 12 graduates go on to top universities worldwide.' },
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
        <p className="text-slate-500 mb-4">Interested in enrolling your child?</p>
        <Link to="/enroll">
          <Button variant="gold" size="lg">Start Application <ArrowRight size={16} /></Button>
        </Link>
      </div>
    </div>
  )
}
