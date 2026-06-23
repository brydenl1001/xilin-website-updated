import { useState, useEffect } from 'react'
import { getOwnGrades } from '../../lib/supabaseClient'
import { Card, PageHeader, Select } from '../../components/ui'
import { useSelectedChild } from '../../hooks/useSelectedChild'

export default function ParentChildGrades() {
  const { students, childId, setChildId, child } = useSelectedChild()
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) { setLoading(false); return }
    getOwnGrades(childId)
      .then(setGrades)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [childId])

  if (students.length === 0) {
    return (
      <div className="max-w-3xl animate-fade-in">
        <Card><p className="text-slate-400 text-sm py-6 text-center">No students linked to your family account yet.</p></Card>
      </div>
    )
  }

  const pcts = grades.map(g => Math.round((Number(g.score) / Number(g.max_score)) * 100))
  const avg = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader
        title="Grades"
        subtitle="Academic performance"
        action={students.length > 1 && (
          <Select id="child-select" value={childId} onChange={e => setChildId(e.target.value)} className="w-44">
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
        )}
      />

      <div className="bg-slate-900 rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-xs uppercase tracking-widest mb-1">Overall Average</p>
          <p className="font-display text-5xl text-yellow-400">{avg}%</p>
          <p className="text-slate-400 text-sm mt-1">{child?.full_name}</p>
        </div>
        {pcts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Subjects', value: grades.length },
              { label: 'Highest', value: `${Math.max(...pcts)}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="font-display text-lg text-white">{value}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}
      {!loading && !error && grades.length === 0 && (
        <p className="text-slate-400 text-sm text-center py-12">No grades recorded yet.</p>
      )}

      <div className="space-y-3">
        {grades.map((g, i) => {
          const pct = Math.round((Number(g.score) / Number(g.max_score)) * 100)
          return (
            <Card key={g.id} className="animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-display text-[15px] text-slate-900">{g.subject}</h3>
                  <p className="text-xs text-slate-400">{g.recorder?.full_name || 'Teacher'} · {g.term}</p>
                </div>
                <span className="text-sm font-bold px-3 py-1 rounded-lg bg-slate-100 text-slate-700">{pct}%</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${pct >= 90 ? 'bg-emerald-400' : pct >= 75 ? 'bg-blue-400' : 'bg-amber-400'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium text-slate-600 w-16 text-right">{g.score}/{g.max_score}</span>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
