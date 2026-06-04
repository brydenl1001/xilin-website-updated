import { Card, PageHeader } from '../../components/ui'

const MONTHS = ['Jan','Feb','Mar','Apr','May']
const RECORDS = [
  { month: 'January',  present: 18, absent: 2, total: 20 },
  { month: 'February', present: 19, absent: 0, total: 19 },
  { month: 'March',    present: 20, absent: 1, total: 21 },
  { month: 'April',    present: 17, absent: 3, total: 20 },
  { month: 'May',      present: 15, absent: 1, total: 16 },
]

const WEEK = [
  { day: 'Mon', present: true },
  { day: 'Tue', present: true },
  { day: 'Wed', present: false },
  { day: 'Thu', present: true },
  { day: 'Fri', present: true },
]

export default function StudentAttendance() {
  const totalPresent = RECORDS.reduce((s, r) => s + r.present, 0)
  const totalDays    = RECORDS.reduce((s, r) => s + r.total, 0)
  const overallPct   = Math.round((totalPresent / totalDays) * 100)

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="My Attendance" subtitle="Attendance record — 2025-26 Academic Year" />

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <p className="font-display text-3xl text-slate-900">{overallPct}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Overall Rate</p>
        </Card>
        <Card>
          <p className="font-display text-3xl text-emerald-600">{totalPresent}</p>
          <p className="text-xs text-slate-400 mt-0.5">Days Present</p>
        </Card>
        <Card>
          <p className="font-display text-3xl text-red-500">{totalDays - totalPresent}</p>
          <p className="text-xs text-slate-400 mt-0.5">Days Absent</p>
        </Card>
      </div>

      {/* This week */}
      <Card className="mb-5">
        <h3 className="font-display text-sm text-slate-900 mb-4">This Week</h3>
        <div className="flex gap-3">
          {WEEK.map(({ day, present }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-2">
              <p className="text-[11px] text-slate-400">{day}</p>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                present ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'
              }`}>
                {present ? '✓' : '✗'}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly breakdown */}
      <Card>
        <h3 className="font-display text-sm text-slate-900 mb-4">Monthly Breakdown</h3>
        <div className="space-y-4">
          {RECORDS.map(r => {
            const pct = Math.round((r.present / r.total) * 100)
            return (
              <div key={r.month}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">{r.month}</span>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{r.present}/{r.total} days</span>
                    <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : pct >= 90 ? 'text-blue-600' : pct >= 75 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-400' : pct >= 90 ? 'bg-blue-400' : pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
