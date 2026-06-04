import { mockGrades } from '../../lib/mockData'
import { Card, PageHeader } from '../../components/ui'

const GRADE_STYLE = {
  'A+': 'bg-emerald-100 text-emerald-700', 'A': 'bg-emerald-100 text-emerald-700', 'A-': 'bg-emerald-100 text-emerald-700',
  'B+': 'bg-blue-100 text-blue-700', 'B': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-100 text-blue-700',
  'C+': 'bg-amber-100 text-amber-700', 'C': 'bg-amber-100 text-amber-700',
  'D': 'bg-red-100 text-red-700', 'F': 'bg-red-100 text-red-700',
}

export default function StudentGrades() {
  const avg = Math.round(mockGrades.reduce((s, g) => s + (g.score / g.max) * 100, 0) / mockGrades.length)

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="My Grades" subtitle="Academic performance — Term 2, 2025–26" />

      {/* GPA banner */}
      <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Term Average</p>
          <p className="font-display text-5xl text-yellow-400">{avg}%</p>
          <p className="text-slate-400 text-sm mt-1">Across {mockGrades.length} subjects</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Highest', value: `${Math.max(...mockGrades.map(g => g.score))}%` },
            { label: 'Lowest', value: `${Math.min(...mockGrades.map(g => g.score))}%` },
            { label: 'GPA', value: '3.7' },
            { label: 'Rank', value: '4th' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
              <p className="font-display text-lg text-white">{value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {mockGrades.map((g, i) => (
          <Card key={g.subject} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-display text-[15px] text-slate-900">{g.subject}</h3>
                <p className="text-xs text-slate-400">{g.teacher} · {g.term}</p>
              </div>
              <span className={`text-sm font-bold px-3 py-1 rounded-lg ${GRADE_STYLE[g.grade] || 'bg-slate-100 text-slate-600'}`}>
                {g.grade}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${g.score >= 90 ? 'bg-emerald-400' : g.score >= 75 ? 'bg-blue-400' : 'bg-amber-400'}`}
                  style={{ width: `${(g.score / g.max) * 100}%` }}
                />
              </div>
              <span className="text-sm font-medium text-slate-600 w-16 text-right">{g.score}/{g.max}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
