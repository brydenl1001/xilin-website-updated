import { mockTimetable } from '../../lib/mockData'
import { Card, PageHeader } from '../../components/ui'

const SUBJECT_COLOR = {
  'Mathematics':        'bg-blue-50 text-blue-700 border-blue-200',
  'English Literature': 'bg-purple-50 text-purple-700 border-purple-200',
  'English':            'bg-purple-50 text-purple-700 border-purple-200',
  'Physics':            'bg-amber-50 text-amber-700 border-amber-200',
  'History':            'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Art and Design':     'bg-pink-50 text-pink-700 border-pink-200',
}

const TODAY_IDX = ['Monday','Tuesday','Wednesday','Thursday','Friday'].indexOf(
  new Date().toLocaleDateString('en-US', { weekday: 'long' })
)

export default function AdminTimetable() {
  const { days, periods } = mockTimetable

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Timetable" subtitle="Weekly class schedule — Grade 10-A" />

      {/* Today strip */}
      {TODAY_IDX >= 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
            Today — {days[TODAY_IDX]}
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {periods.map((p, i) => {
              const subj = p.subjects[TODAY_IDX]
              const color = SUBJECT_COLOR[subj] || 'bg-slate-50 text-slate-600 border-slate-200'
              return (
                <div key={i} className={`flex-shrink-0 border rounded-xl p-3 min-w-[130px] ${color}`}>
                  <p className="text-[10px] font-medium opacity-60 mb-1">{p.time}</p>
                  <p className="text-sm font-medium leading-tight">{subj}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full grid */}
      <Card className="!p-0 overflow-x-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-medium text-slate-400 uppercase tracking-wide w-28">Time</th>
              {days.map((day, i) => (
                <th key={day} className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wide ${i === TODAY_IDX ? 'text-yellow-600' : 'text-slate-400'}`}>
                  {day}
                  {i === TODAY_IDX && <span className="ml-1.5 text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full normal-case font-semibold">Today</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period, pi) => (
              <tr key={pi} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-5 py-3 text-xs text-slate-400 font-medium whitespace-nowrap">{period.time}</td>
                {period.subjects.map((subj, si) => {
                  const color = SUBJECT_COLOR[subj] || 'bg-slate-50 text-slate-600 border-slate-200'
                  return (
                    <td key={si} className="px-3 py-2.5">
                      <span className={`inline-block border rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ${color} ${si === TODAY_IDX ? 'ring-1 ring-offset-1 ring-yellow-300' : ''}`}>
                        {subj}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 italic">
          Break: 10:00–10:20 · Lunch: 12:20–13:00
        </div>
      </Card>
    </div>
  )
}
