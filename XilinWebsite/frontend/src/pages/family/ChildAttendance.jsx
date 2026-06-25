import { useState, useEffect } from 'react'
import { getOwnAttendance } from '../../lib/supabaseClient'
import { Card, PageHeader, Select } from '../../components/ui'
import { useSelectedMember } from '../../hooks/useSelectedMember'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function FamilyChildAttendance() {
  const { members: students, memberId: childId, setMemberId: setChildId, member: child } = useSelectedMember()
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!childId) { setLoading(false); return }
    getOwnAttendance(childId)
      .then(setRecords)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [childId])

  if (students.length === 0) {
    return (
      <div className="max-w-3xl animate-fade-in">
        <Card><p className="text-slate-400 text-sm py-6 text-center">No members linked to your family account yet.</p></Card>
      </div>
    )
  }

  const totalPresent = records.filter(r => r.present).length
  const totalDays = records.length
  const overallPct = totalDays ? Math.round((totalPresent / totalDays) * 100) : 0

  const today = new Date()
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (6 - i))
    const iso = d.toISOString().slice(0, 10)
    const rec = records.find(r => r.date === iso)
    return { day: DAY_NAMES[d.getDay()], present: rec ? rec.present : null }
  })

  const byMonth = records.reduce((acc, r) => {
    const monthKey = r.date?.slice(0, 7)
    if (!acc[monthKey]) acc[monthKey] = []
    acc[monthKey].push(r)
    return acc
  }, {})
  const monthKeys = Object.keys(byMonth).sort()

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader
        title="Attendance"
        subtitle={child?.full_name || 'Attendance record'}
        action={students.length > 1 && (
          <Select id="child-select" value={childId} onChange={e => setChildId(e.target.value)} className="w-44">
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </Select>
        )}
      />

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card><p className="font-display text-3xl text-slate-900">{overallPct}%</p><p className="text-xs text-slate-400 mt-0.5">Overall Rate</p></Card>
            <Card><p className="font-display text-3xl text-emerald-600">{totalPresent}</p><p className="text-xs text-slate-400 mt-0.5">Days Present</p></Card>
            <Card><p className="font-display text-3xl text-red-500">{totalDays - totalPresent}</p><p className="text-xs text-slate-400 mt-0.5">Days Absent</p></Card>
          </div>

          <Card className="mb-5">
            <h3 className="font-display text-sm text-slate-900 mb-4">Last 7 Days</h3>
            <div className="flex gap-3">
              {last7.map(({ day, present }, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <p className="text-[11px] text-slate-400">{day}</p>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                    present === null ? 'bg-slate-100 text-slate-400' : present ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'
                  }`}>
                    {present === null ? '–' : present ? '✓' : '✗'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-sm text-slate-900 mb-4">Monthly Breakdown</h3>
            {monthKeys.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No attendance recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {monthKeys.map(key => {
                  const recs = byMonth[key]
                  const present = recs.filter(r => r.present).length
                  const pct = Math.round((present / recs.length) * 100)
                  const monthLabel = MONTH_NAMES[Number(key.slice(5, 7)) - 1]
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700">{monthLabel}</span>
                        <div className="flex items-center gap-3 text-xs text-slate-400">
                          <span>{present}/{recs.length} days</span>
                          <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : pct >= 90 ? 'text-blue-600' : pct >= 75 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                        </div>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-400' : pct >= 90 ? 'bg-blue-400' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
