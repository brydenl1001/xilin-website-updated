import { useState, useEffect } from 'react'
import { BarChart2, CalendarCheck, Coins, ClipboardList } from 'lucide-react'
import { getOwnGrades, getOwnPayments, getOwnEnrollments, listAnnouncements } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }
const GRADE_BAR_COLOR = (score) => score >= 90 ? 'bg-emerald-400' : score >= 75 ? 'bg-blue-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [grades, setGrades] = useState([])
  const [payments, setPayments] = useState([])
  const [enrollment, setEnrollment] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [gradeData, paymentData, enrollData, annData] = await Promise.all([
          getOwnGrades(user.id),
          getOwnPayments(user.id),
          getOwnEnrollments(user.id),
          listAnnouncements(),
        ])
        setGrades(gradeData)
        setPayments(paymentData)
        setEnrollment(enrollData.find(e => e.status === 'enrolled'))
        setAnnouncements(annData.slice(0, 4))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  const avgScore = grades.length
    ? Math.round(grades.reduce((s, g) => s + (Number(g.score) / Number(g.max_score)) * 100, 0) / grades.length)
    : 0
  const pendingFees = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  const stats = [
    { label: 'Average Score', value: `${avgScore}%`, delta: 'Across all subjects', trend: 'up', Icon: BarChart2 },
    { label: 'Pending Fees', value: `$${pendingFees.toLocaleString()}`, delta: pendingFees > 0 ? 'Action needed' : 'All paid', trend: pendingFees > 0 ? 'warn' : 'up', Icon: Coins },
    { label: 'Grades Recorded', value: grades.length, delta: 'This term', trend: 'up', Icon: ClipboardList },
  ]

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="relative bg-slate-900 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Student Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">Your Learning Hub</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {enrollment?.classes && (
          <div className="text-right">
            <p className="text-white/40 text-xs mb-1">Class</p>
            <p className="text-white font-display text-lg">{enrollment.classes.name}</p>
            <p className="text-slate-400 text-xs">{enrollment.classes.courses?.name}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent grades */}
        <Card>
          <SectionHeader title="My Grades"
            action={<Link to="/my-grades" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : grades.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No grades recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {grades.slice(0, 4).map(g => {
                const pct = Math.round((Number(g.score) / Number(g.max_score)) * 100)
                return (
                  <div key={g.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-slate-900 truncate">{g.subject}</p>
                        <span className="text-xs text-slate-400 ml-2">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${GRADE_BAR_COLOR(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
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
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
