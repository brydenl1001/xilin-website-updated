import { useState } from 'react'
import { mockAttendance } from '../../lib/mockData'
import { Card, Badge, Button, PageHeader, Table, Tr, Td } from '../../components/ui'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const MOCK_WEEK = [true, true, false, true, true]

export default function AdminAttendance() {
  const [attendance, setAttendance] = useState(mockAttendance)

  const schoolAvg = Math.round(
    attendance.filter(a => a.pct !== null).reduce((s, a) => s + a.pct, 0) /
    attendance.filter(a => a.pct !== null).length
  )

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Attendance" subtitle="Daily and weekly attendance tracking across all classes" />

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'School Average', value: `${schoolAvg}%`, color: 'text-slate-900' },
          { label: 'Classes Marked', value: `${attendance.filter(a => a.pct !== null).length}/${attendance.length}`, color: 'text-slate-900' },
          { label: 'Below 80%', value: attendance.filter(a => a.pct !== null && a.pct < 80).length, color: 'text-red-500' },
          { label: 'Perfect (100%)', value: 0, color: 'text-emerald-600' },
        ].map(s => (
          <Card key={s.label}>
            <p className={`font-display text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        {/* Weekly calendar sample */}
        <Card>
          <h3 className="font-display text-sm text-slate-900 mb-4">Sample — Grade 10-A This Week</h3>
          <div className="flex gap-2">
            {DAYS.map((day, i) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <p className="text-[10px] text-slate-400">{day}</p>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  MOCK_WEEK[i] ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'
                }`}>
                  {MOCK_WEEK[i] ? '✓' : '✗'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-400" />Present</span>
            <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-400" />Absent</span>
          </div>
        </Card>

        {/* Class overview */}
        <Card className="lg:col-span-2">
          <h3 className="font-display text-sm text-slate-900 mb-4">Today's Class Overview</h3>
          <div className="space-y-3">
            {attendance.map(item => (
              <div key={item.class} className="flex items-center gap-4">
                <div className="w-28 flex-shrink-0">
                  <p className="text-sm font-medium text-slate-900">{item.class}</p>
                  <p className="text-xs text-slate-400">{item.total} students</p>
                </div>
                {item.pct !== null ? (
                  <>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          item.pct >= 90 ? 'bg-emerald-400' : item.pct >= 75 ? 'bg-amber-400' : 'bg-red-400'
                        }`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-10 text-right">{item.pct}%</span>
                  </>
                ) : (
                  <Badge variant="warning">Not marked</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly table */}
      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-display text-base text-slate-900">Monthly Summary — May 2026</h3>
        </div>
        <Table headers={['Class', 'Week 1', 'Week 2', 'Week 3', 'Week 4', 'Monthly Avg']}>
          {attendance.map(item => {
            const weeks = [94, 91, 88, item.pct ?? 90]
            const avg = Math.round(weeks.reduce((a, b) => a + b, 0) / weeks.length)
            return (
              <Tr key={item.class}>
                <Td><span className="font-medium text-slate-900">{item.class}</span></Td>
                {weeks.map((w, i) => (
                  <Td key={i}>
                    <span className={`text-sm font-medium ${w >= 90 ? 'text-emerald-600' : w >= 75 ? 'text-amber-600' : 'text-red-500'}`}>
                      {w}%
                    </span>
                  </Td>
                ))}
                <Td>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{avg}%</span>
                </Td>
              </Tr>
            )
          })}
        </Table>
      </Card>
    </div>
  )
}
