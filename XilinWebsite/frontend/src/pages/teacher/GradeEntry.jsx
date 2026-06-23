import { useState, useEffect } from 'react'
import { Save, CheckCircle } from 'lucide-react'
import { listMyClasses, getClassRoster, getClassGrades, bulkUpsertGrades } from '../../lib/supabaseClient'
import { Card, Select, Input, Button, PageHeader, Table, Tr, Td } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const TERMS = ['Term 1', 'Term 2', 'Term 3']

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
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [term, setTerm] = useState('Term 2')
  const [subject, setSubject] = useState('')
  const [roster, setRoster] = useState([])
  const [scores, setScores] = useState({})  // student_id -> score
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyClasses(user.id)
      .then(data => {
        const list = data.map(d => d.classes)
        setClasses(list)
        if (list[0]) {
          setClassId(list[0].id)
          setSubject(list[0].courses?.name || '')
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    Promise.all([
      getClassRoster(classId),
      getClassGrades(classId, term),
    ]).then(([rosterData, gradeData]) => {
      setRoster(rosterData)
      const existing = {}
      gradeData.forEach(g => { if (g.subject === subject) existing[g.student_id] = g.score })
      setScores(existing)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [classId, term, subject])

  const setScore = (studentId, val) => {
    const n = Math.max(0, Math.min(100, Number(val)))
    setScores(prev => ({ ...prev, [studentId]: n }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const records = roster.map(r => ({
        student_id: r.profiles.id,
        class_id: classId,
        subject,
        score: scores[r.profiles.id] ?? 0,
        max_score: 100,
        term,
        recorded_by: user.id,
      }))
      await bulkUpsertGrades(records)
      setSaved(true)
    } catch (err) {
      alert(`Failed to save: ${err.message}. Note: this requires a unique constraint on (student_id, class_id, subject, term) in the grades table.`)
    } finally {
      setSaving(false)
    }
  }

  const scoreList = roster.map(r => scores[r.profiles.id] ?? 0)
  const avg = scoreList.length ? Math.round(scoreList.reduce((a, b) => a + b, 0) / scoreList.length) : 0

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader title="Grade Entry" subtitle="Enter and save student scores" />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select id="ge-cls" value={classId} onChange={e => {
          const cls = classes.find(c => c.id === e.target.value)
          setClassId(e.target.value)
          setSubject(cls?.courses?.name || '')
          setSaved(false)
        }} className="w-40">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Select id="ge-term" value={term} onChange={e => { setTerm(e.target.value); setSaved(false) }} className="w-32">
          {TERMS.map(t => <option key={t}>{t}</option>)}
        </Select>
        <Input id="ge-subject" value={subject} onChange={e => { setSubject(e.target.value); setSaved(false) }} className="w-44" placeholder="Subject name" />
        <div className="ml-auto flex items-center gap-2">
          {saved && <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle size={14} />Saved</span>}
          <Button variant="gold" onClick={handleSave} disabled={saving || roster.length === 0}>
            <Save size={14} />{saving ? 'Saving…' : 'Save Grades'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card><p className="font-display text-2xl text-slate-900">{avg}%</p><p className="text-xs text-slate-400 mt-0.5">Class Average</p></Card>
        <Card><p className="font-display text-2xl text-emerald-600">{scoreList.filter(s => s >= 90).length}</p><p className="text-xs text-slate-400 mt-0.5">A Grade (90%+)</p></Card>
        <Card><p className="font-display text-2xl text-red-500">{scoreList.filter(s => s < 70).length}</p><p className="text-xs text-slate-400 mt-0.5">Below Passing</p></Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="py-12 text-center text-slate-400 text-sm">No students enrolled in this class.</p>
        ) : (
          <Table headers={['Student', 'Score / 100', 'Letter Grade', 'Bar']}>
            {roster.map(r => {
              const score = scores[r.profiles.id] ?? 0
              const letter = letterGrade(score)
              return (
                <Tr key={r.profiles.id}>
                  <Td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
                        {r.profiles.full_name?.split(' ').map(n => n[0]).join('')}
                      </div>
                      <span className="font-medium text-slate-900">{r.profiles.full_name}</span>
                    </div>
                  </Td>
                  <Td>
                    <input
                      type="number" min="0" max="100" value={score}
                      onChange={e => setScore(r.profiles.id, e.target.value)}
                      className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all text-center font-medium"
                    />
                  </Td>
                  <Td>
                    <span className={`text-sm font-bold ${GRADE_COLOR[letter] || 'text-slate-600'}`}>{letter}</span>
                  </Td>
                  <Td>
                    <div className="w-32 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${score >= 90 ? 'bg-emerald-400' : score >= 75 ? 'bg-blue-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}
