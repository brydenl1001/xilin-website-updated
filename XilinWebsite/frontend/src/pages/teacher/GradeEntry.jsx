import { useState } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { Card, Select, Button, PageHeader, Table, Tr, Td } from '../../components/ui'

const CLASSES = ['Grade 9-A', 'Grade 10-B', 'Grade 11-A', 'Grade 12-A']
const TERMS   = ['Term 1', 'Term 2', 'Term 3']

const INITIAL_GRADES = [
  { name: 'Emma Watson',   score: 88, saved: false },
  { name: 'James Liu',     score: 94, saved: false },
  { name: 'Priya Sharma',  score: 76, saved: false },
  { name: 'Carlos Ortega', score: 91, saved: false },
  { name: 'Amara Osei',    score: 85, saved: false },
  { name: 'Noah Park',     score: 72, saved: false },
  { name: 'Sofia Reyes',   score: 97, saved: false },
  { name: 'Liam Chen',     score: 63, saved: false },
]

function letterGrade(score) {
  if (score >= 97) return 'A+'
  if (score >= 93) return 'A'
  if (score >= 90) return 'A-'
  if (score >= 87) return 'B+'
  if (score >= 83) return 'B'
  if (score >= 80) return 'B-'
  if (score >= 77) return 'C+'
  if (score >= 73) return 'C'
  if (score >= 70) return 'C-'
  return 'F'
}

const GRADE_COLOR = { 'A+': 'text-emerald-600', 'A': 'text-emerald-600', 'A-': 'text-emerald-600', 'B+': 'text-blue-600', 'B': 'text-blue-600', 'B-': 'text-blue-600', 'C+': 'text-amber-600', 'C': 'text-amber-600', 'C-': 'text-amber-600', 'F': 'text-red-600' }

export default function TeacherGradeEntry() {
  const [cls, setCls]     = useState('Grade 10-B')
  const [term, setTerm]   = useState('Term 2')
  const [grades, setGrades] = useState(INITIAL_GRADES)
  const [saved, setSaved] = useState(false)

  const setScore = (i, val) => {
    const n = Math.max(0, Math.min(100, Number(val)))
    setGrades(prev => prev.map((g, idx) => idx === i ? { ...g, score: n, saved: false } : g))
    setSaved(false)
  }

  const handleSave = () => {
    setGrades(prev => prev.map(g => ({ ...g, saved: true })))
    setSaved(true)
  }

  const avg = Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader title="Grade Entry" subtitle="Enter and save student scores" />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select id="ge-cls" value={cls} onChange={e => { setCls(e.target.value); setSaved(false) }} className="w-40">
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </Select>
        <Select id="ge-term" value={term} onChange={e => { setTerm(e.target.value); setSaved(false) }} className="w-32">
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </Select>
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle size={14} />Saved</span>}
          <Button variant="gold" onClick={handleSave}><Save size={14} />Save Grades</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card><p className="font-display text-2xl text-slate-900">{avg}%</p><p className="text-xs text-slate-400 mt-0.5">Class Average</p></Card>
        <Card><p className="font-display text-2xl text-emerald-600">{grades.filter(g => g.score >= 90).length}</p><p className="text-xs text-slate-400 mt-0.5">A Grade (90%+)</p></Card>
        <Card><p className="font-display text-2xl text-red-500">{grades.filter(g => g.score < 70).length}</p><p className="text-xs text-slate-400 mt-0.5">Below Passing</p></Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <Table headers={['Student', 'Score / 100', 'Letter Grade', 'Bar']}>
          {grades.map((g, i) => {
            const letter = letterGrade(g.score)
            return (
              <Tr key={g.name}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                      {g.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-medium text-slate-900">{g.name}</span>
                  </div>
                </Td>
                <Td>
                  <input
                    type="number" min="0" max="100" value={g.score}
                    onChange={e => setScore(i, e.target.value)}
                    className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all text-center font-medium"
                  />
                </Td>
                <Td>
                  <span className={`text-sm font-bold ${GRADE_COLOR[letter] || 'text-slate-600'}`}>{letter}</span>
                </Td>
                <Td>
                  <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${g.score >= 90 ? 'bg-emerald-400' : g.score >= 75 ? 'bg-blue-400' : g.score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${g.score}%` }}
                    />
                  </div>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>
    </div>
  )
}
