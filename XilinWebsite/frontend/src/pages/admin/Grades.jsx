import { useState, useEffect } from 'react'
import { listClasses, getClassGrades } from '../../lib/supabaseClient'
import { Card, PageHeader, Select, Table, Tr, Td } from '../../components/ui'

export default function AdminGrades() {
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listClasses()
      .then(data => {
        setClasses(data)
        if (data[0]) setClassId(data[0].id)
      })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    getClassGrades(classId)
      .then(setGrades)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [classId])

  // Aggregate per-student rows into per-subject stats
  const bySubject = grades.reduce((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = []
    acc[g.subject].push(Number(g.score))
    return acc
  }, {})
  const subjects = Object.keys(bySubject)
  const subjectStats = subjects.map(subj => {
    const scores = bySubject[subj]
    return {
      subject: subj,
      avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      max: Math.max(...scores),
      min: Math.min(...scores),
      count: scores.length,
    }
  })
  const overallAvg = subjectStats.length
    ? Math.round(subjectStats.reduce((s, x) => s + x.avg, 0) / subjectStats.length)
    : 0

  const selectedClass = classes.find(c => c.id === classId)

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Grade Management" subtitle="Academic performance by class" />

      <div className="mb-5 max-w-xs">
        <Select label="Class" id="cls" value={classId} onChange={e => setClassId(e.target.value)}>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><p className="font-display text-2xl text-slate-900">{overallAvg}%</p><p className="text-xs text-slate-400 mt-0.5">Class Average</p></Card>
        <Card><p className="font-display text-2xl text-slate-900">{subjects.length}</p><p className="text-xs text-slate-400 mt-0.5">Subjects Graded</p></Card>
        <Card><p className="font-display text-2xl text-slate-900">{grades.length}</p><p className="text-xs text-slate-400 mt-0.5">Total Entries</p></Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-display text-base text-slate-900">Subject Performance — {selectedClass?.name}</h3>
        </div>
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : subjectStats.length === 0 ? (
          <p className="py-12 text-center text-slate-400 text-sm">No grades recorded for this class yet.</p>
        ) : (
          <Table headers={['Subject', 'Class Average', 'Highest', 'Lowest', 'Entries']}>
            {subjectStats.map(s => (
              <Tr key={s.subject}>
                <Td><span className="font-medium text-slate-900">{s.subject}</span></Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${s.avg >= 90 ? 'bg-emerald-400' : s.avg >= 75 ? 'bg-blue-400' : 'bg-amber-400'}`}
                        style={{ width: `${s.avg}%` }} />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{s.avg}%</span>
                  </div>
                </Td>
                <Td className="text-emerald-600 font-medium">{s.max}%</Td>
                <Td className="text-red-500 font-medium">{s.min}%</Td>
                <Td className="text-slate-400 text-xs">{s.count}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
