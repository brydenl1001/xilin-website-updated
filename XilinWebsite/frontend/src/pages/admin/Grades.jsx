import { mockGrades, mockEnrollments } from '../../lib/mockData'
import { Card, PageHeader, Badge, Table, Tr, Td } from '../../components/ui'

const GRADE_STYLE = {
  'A+': 'bg-emerald-100 text-emerald-700', 'A': 'bg-emerald-100 text-emerald-700', 'A-': 'bg-emerald-100 text-emerald-700',
  'B+': 'bg-blue-100 text-blue-700', 'B': 'bg-blue-100 text-blue-700', 'B-': 'bg-blue-100 text-blue-700',
  'C+': 'bg-amber-100 text-amber-700', 'C': 'bg-amber-100 text-amber-700',
  'D': 'bg-red-100 text-red-700', 'F': 'bg-red-100 text-red-700',
}

export default function AdminGrades() {
  const avg = Math.round(mockGrades.reduce((s, g) => s + (g.score / g.max) * 100, 0) / mockGrades.length)

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Grade Management" subtitle="School-wide academic performance overview" />

      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'School Average', value: `${avg}%`, sub: 'All subjects' },
          { label: 'Top Score', value: `${Math.max(...mockGrades.map(g => g.score))}%`, sub: 'Art & Design' },
          { label: 'Students Graded', value: '1,248', sub: 'This term' },
          { label: 'Pending Entry', value: '23', sub: 'Awaiting teachers' },
        ].map(s => (
          <Card key={s.label}>
            <p className="font-display text-2xl text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            <p className="text-xs text-slate-300 mt-1">{s.sub}</p>
          </Card>
        ))}
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-display text-base text-slate-900">Subject Performance — Grade 10-A, Term 2</h3>
        </div>
        <Table headers={['Subject', 'Teacher', 'Class Average', 'Highest', 'Lowest', 'Grade']}>
          {mockGrades.map(g => (
            <Tr key={g.subject}>
              <Td><span className="font-medium text-slate-900">{g.subject}</span></Td>
              <Td className="text-slate-500">{g.teacher}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${g.score >= 90 ? 'bg-emerald-400' : g.score >= 75 ? 'bg-blue-400' : 'bg-amber-400'}`}
                      style={{ width: `${g.score}%` }} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">{g.score}%</span>
                </div>
              </Td>
              <Td className="text-emerald-600 font-medium">{g.score + 5}%</Td>
              <Td className="text-red-500 font-medium">{g.score - 15}%</Td>
              <Td>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${GRADE_STYLE[g.grade] || 'bg-slate-100 text-slate-600'}`}>
                  {g.grade}
                </span>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>
    </div>
  )
}
