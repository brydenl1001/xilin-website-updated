import { publicClasses } from '../../lib/mockData'
import { Users, BookOpen, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'

const GRADE_COLOR = ['bg-blue-50 border-blue-200', 'bg-yellow-50 border-amber-200', 'bg-green-50 border-green-200', 'bg-purple-50 border-purple-200']
const SUBJECT_COLORS = ['bg-blue-100 text-blue-700', 'bg-yellow-100 text-yellow-700', 'bg-green-100 text-green-700', 'bg-red-100 text-red-700', 'bg-purple-100 text-purple-700', 'bg-pink-100 text-pink-700']

export default function PublicClasses() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="mb-10 text-center">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">Academics</p>
        <h1 className="font-display text-4xl text-slate-900 mb-4">Our Classes</h1>
        <p className="text-slate-500 max-w-xl mx-auto">
          Four grade levels, each with a dedicated teacher, tailored curriculum, and a supportive classroom environment.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {publicClasses.map((cls, i) => (
          <div key={cls.id} className={`border rounded-2xl p-6 ${GRADE_COLOR[i]}`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-display text-xl text-slate-900 mb-0.5">{cls.grade}</h2>
                <p className="text-sm text-slate-500">Class Teacher: {cls.teacher}</p>
              </div>
              <div className="bg-white rounded-xl px-3 py-2 text-center shadow-sm border border-slate-200">
                <p className="font-display text-2xl text-slate-900">{cls.students}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wide">Students</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">{cls.description}</p>
            <div className="flex flex-wrap gap-1.5">
              {cls.subjects.map((subj, si) => (
                <span key={subj} className={`text-xs px-2.5 py-1 rounded-full font-medium ${SUBJECT_COLORS[si % SUBJECT_COLORS.length]}`}>
                  {subj}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

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
