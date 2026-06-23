import { useState, useEffect } from 'react'
import { BarChart2, CalendarCheck, Coins, MessageSquare } from 'lucide-react'
import { getOwnGrades, getOwnPayments, listAnnouncements } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, SectionHeader, Select } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

export default function ParentDashboard() {
  const { user } = useAuth()
  const students = (user.familyMembers || []).filter(m => m.relationship === 'student')
  const [childId, setChildId] = useState(students[0]?.id || '')
  const [grades, setGrades] = useState([])
  const [payments, setPayments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const child = students.find(s => s.id === childId)

  useEffect(() => {
    if (!childId) { setLoading(false); return }
    const load = async () => {
      try {
        const [gradeData, paymentData, annData] = await Promise.all([
          getOwnGrades(childId),
          getOwnPayments(childId),
          listAnnouncements(),
        ])
        setGrades(gradeData)
        setPayments(paymentData)
        setAnnouncements(annData.slice(0, 4))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [childId])

  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (Number(g.score) / Number(g.max_score)) * 100, 0) / grades.length)
    : 0
  const pendingFees = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  const stats = [
    { label: "Child's Average", value: `${avgScore}%`, delta: child?.full_name || '—', trend: 'up', Icon: BarChart2 },
    { label: 'Outstanding Fees', value: `$${pendingFees.toLocaleString()}`, delta: pendingFees > 0 ? 'Action needed' : 'All paid', trend: pendingFees > 0 ? 'warn' : 'up', Icon: Coins },
    { label: 'Announcements', value: announcements.length, delta: 'New updates', trend: 'up', Icon: MessageSquare },
  ]

  if (students.length === 0) {
    return (
      <div className="max-w-5xl animate-fade-in">
        <Card><p className="text-slate-400 text-sm py-6 text-center">No students are linked to your family account yet. Contact the school office.</p></Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="relative bg-slate-900 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Parent Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">Family Portal</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {students.length > 1 ? (
          <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <p className="text-white/40 text-xs mb-1.5">Viewing</p>
            <select value={childId} onChange={e => setChildId(e.target.value)}
              className="bg-transparent text-white font-display text-base outline-none cursor-pointer">
              {students.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.full_name}</option>)}
            </select>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl px-4 py-3 text-right border border-white/10">
            <p className="text-white/40 text-xs mb-0.5">Monitoring</p>
            <p className="text-white font-display text-base">{child?.full_name}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Child grades overview */}
        <Card>
          <SectionHeader title="Recent Grades"
            action={<Link to="/child-grades" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : grades.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No grades recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {grades.slice(0, 4).map(g => {
                const pct = Math.round((Number(g.score) / Number(g.max_score)) * 100)
                return (
                  <div key={g.id} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <p className="text-sm font-medium text-slate-900 truncate">{g.subject}</p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-400' : pct >= 75 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-700">{pct}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Announcements */}
        <Card>
          <SectionHeader title="Announcements"
            action={<Link to="/announcements" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No announcements yet.</p>
          ) : announcements.map(ann => (
            <div key={ann.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CAT_DOT[ann.category]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{ann.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ann.published_at?.slice(0, 10)}</p>
              </div>
              <Badge variant={ann.category}>{ann.category}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
