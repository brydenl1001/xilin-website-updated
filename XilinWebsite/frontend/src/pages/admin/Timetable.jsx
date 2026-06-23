import { useState, useEffect } from 'react'
import { listClasses, listSemesters } from '../../lib/supabaseClient'
import { Card, PageHeader, Badge, Select } from '../../components/ui'
import { AlertTriangle } from 'lucide-react'

// See note in src/pages/shared/Timetable.jsx — no class_schedule table exists
// yet, so this shows all classes for a selected semester instead of a grid.

export default function AdminTimetable() {
  const [semesters, setSemesters] = useState([])
  const [semesterId, setSemesterId] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listSemesters()
      .then(data => {
        setSemesters(data)
        const active = data.find(s => s.is_active) || data[0]
        if (active) setSemesterId(active.id)
      })
      .catch(err => setError(err.message))
  }, [])

  useEffect(() => {
    if (!semesterId) return
    setLoading(true)
    listClasses(semesterId)
      .then(setClasses)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [semesterId])

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Timetable" subtitle="All classes by semester" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Day-by-day period scheduling isn't in the database yet — this lists classes by semester
          instead of a weekly grid. Add a <code className="text-xs bg-amber-100 px-1 rounded">class_schedule</code> table to enable that.
        </p>
      </div>

      <div className="mb-5 max-w-xs">
        <Select label="Semester" id="sem" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
          {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base text-slate-900">Classes — {semesters.find(s => s.id === semesterId)?.name}</h3>
          </div>
          {classes.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No classes found for this semester.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cls.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cls.courses?.name} {cls.room ? `· ${cls.room}` : ''} ·{' '}
                      {cls.class_teachers?.map(ct => ct.profiles?.full_name).join(', ') || 'No teacher assigned'}
                    </p>
                  </div>
                  <Badge variant="academics">{cls.courses?.subject_area || 'General'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
