import { useState, useEffect } from 'react'
import { listClasses, getAttendanceSummary } from '../../lib/supabaseClient'
import { Card, Badge, PageHeader, Table, Tr, Td } from '../../components/ui'

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export default function AdminAttendance() {
  const [classes, setClasses] = useState([])
  const [summaries, setSummaries] = useState({})  // classId -> { total, present, absent, pct }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const classList = await listClasses()
        setClasses(classList)

        const results = {}
        for (const cls of classList) {
          results[cls.id] = await getAttendanceSummary(cls.id, today(), today())
        }
        setSummaries(results)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const marked = classes.filter(c => summaries[c.id]?.total > 0)
  const schoolAvg = marked.length
    ? Math.round(marked.reduce((s, c) => s + summaries[c.id].pct, 0) / marked.length)
    : 0
  const below80 = marked.filter(c => summaries[c.id].pct < 80).length
  const perfect = marked.filter(c => summaries[c.id].pct === 100).length

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Attendance" subtitle="Today's attendance across all classes" />

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'School Average', value: `${schoolAvg}%`, color: 'text-slate-900' },
              { label: 'Classes Marked', value: `${marked.length}/${classes.length}`, color: 'text-slate-900' },
              { label: 'Below 80%', value: below80, color: 'text-red-500' },
              { label: 'Perfect (100%)', value: perfect, color: 'text-emerald-600' },
            ].map(s => (
              <Card key={s.label}>
                <p className={`font-display text-2xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
              </Card>
            ))}
          </div>

          {/* Class overview */}
          <Card className="mb-5">
            <h3 className="font-display text-sm text-slate-900 mb-4">Today's Class Overview</h3>
            <div className="space-y-3">
              {classes.map(cls => {
                const s = summaries[cls.id]
                return (
                  <div key={cls.id} className="flex items-center gap-4">
                    <div className="w-32 flex-shrink-0">
                      <p className="text-sm font-medium text-slate-900">{cls.name}</p>
                      <p className="text-xs text-slate-400">{cls.courses?.name}</p>
                    </div>
                    {s?.total > 0 ? (
                      <>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              s.pct >= 90 ? 'bg-emerald-400' : s.pct >= 75 ? 'bg-amber-400' : 'bg-red-400'
                            }`}
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-slate-700 w-10 text-right">{s.pct}%</span>
                      </>
                    ) : (
                      <Badge variant="warning">Not marked</Badge>
                    )}
                  </div>
                )
              })}
              {classes.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No classes found.</p>}
            </div>
          </Card>

          {/* Weekly table */}
          <Card className="!p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h3 className="font-display text-base text-slate-900">Past 7 Days — by Class</h3>
            </div>
            <Table headers={['Class', 'Present', 'Total', 'Rate']}>
              {classes.map(cls => (
                <WeeklyRow key={cls.id} cls={cls} />
              ))}
            </Table>
          </Card>
        </>
      )}
    </div>
  )
}

function WeeklyRow({ cls }) {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    getAttendanceSummary(cls.id, daysAgo(7), today())
      .then(setStats)
      .catch(() => setStats({ total: 0, present: 0, pct: 0 }))
  }, [cls.id])

  if (!stats) return (
    <Tr><Td colSpan="4" className="text-slate-300 text-xs">Loading…</Td></Tr>
  )

  return (
    <Tr>
      <Td><span className="font-medium text-slate-900">{cls.name}</span></Td>
      <Td className="text-slate-600">{stats.present}</Td>
      <Td className="text-slate-400">{stats.total}</Td>
      <Td>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          stats.pct >= 90 ? 'bg-emerald-100 text-emerald-700' : stats.pct >= 75 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
        }`}>
          {stats.pct}%
        </span>
      </Td>
    </Tr>
  )
}
