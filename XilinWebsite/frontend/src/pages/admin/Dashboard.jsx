import { useState, useEffect } from 'react'
import { Users, UserCheck, Coins, TrendingUp } from 'lucide-react'
import { listProfiles, listEnrollmentApplications, listPayments, listAnnouncements, listClasses, getAttendanceSummary } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, Button, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'

const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }
const today = () => new Date().toISOString().slice(0, 10)

export default function AdminDashboard() {
  const [studentCount, setStudentCount] = useState(0)
  const [pendingEnrollments, setPendingEnrollments] = useState(0)
  const [feesCollected, setFeesCollected] = useState(0)
  const [announcements, setAnnouncements] = useState([])
  const [classAttendance, setClassAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [students, applications, payments, annData, classes] = await Promise.all([
          listProfiles('student'),
          listEnrollmentApplications('pending'),
          listPayments('paid'),
          listAnnouncements(),
          listClasses(),
        ])

        setStudentCount(students.length)
        setPendingEnrollments(applications.length)
        setFeesCollected(payments.reduce((s, p) => s + Number(p.amount), 0))
        setAnnouncements(annData.slice(0, 4))

        const attendanceResults = await Promise.all(
          classes.slice(0, 6).map(async cls => ({
            ...cls,
            summary: await getAttendanceSummary(cls.id, today(), today()),
          }))
        )
        setClassAttendance(attendanceResults)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const avgAttendance = classAttendance.filter(c => c.summary.total > 0).length
    ? Math.round(
        classAttendance.filter(c => c.summary.total > 0).reduce((s, c) => s + c.summary.pct, 0) /
        classAttendance.filter(c => c.summary.total > 0).length
      )
    : 0

  const stats = [
    { label: 'Total Students', value: studentCount.toLocaleString(), delta: 'Active accounts', trend: 'up', Icon: Users },
    { label: 'Pending Applications', value: pendingEnrollments, delta: 'Awaiting review', trend: pendingEnrollments > 0 ? 'warn' : 'up', Icon: UserCheck },
    { label: 'Fees Collected', value: `$${feesCollected.toLocaleString()}`, delta: 'All-time paid', trend: 'up', Icon: Coins },
    { label: 'Avg. Attendance', value: `${avgAttendance}%`, delta: 'Today, sample of classes', trend: 'up', Icon: TrendingUp },
  ]

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Welcome */}
      <div className="relative bg-slate-800 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-teal-400/5 pointer-events-none" />
        <div>
          <p className="text-teal-400 text-xs uppercase tracking-widest mb-1">Admin Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">School Overview</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/applications"><Button variant="gold" size="sm">Review Applications</Button></Link>
          <Link to="/announcements"><Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">+ Notice</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Card key={i}><p className="text-slate-300 text-sm">Loading…</p></Card>)
          : stats.map(s => <StatCard key={s.label} {...s} />)
        }
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Announcements */}
        <Card>
          <SectionHeader title="Recent Announcements"
            action={<Link to="/announcements" className="text-xs text-teal-600 hover:text-teal-700">View all</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : announcements.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No announcements yet.</p>
          ) : announcements.map(ann => (
            <div key={ann.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CAT_DOT[ann.category]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{ann.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ann.profiles?.full_name || 'School Office'} · {ann.published_at?.slice(0, 10)}</p>
              </div>
              <Badge variant={ann.category}>{ann.category}</Badge>
            </div>
          ))}
        </Card>

        {/* Attendance */}
        <Card>
          <SectionHeader title="Today's Attendance"
            action={<Link to="/attendance" className="text-xs text-teal-600 hover:text-teal-700">Full report</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : classAttendance.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No classes found.</p>
          ) : classAttendance.map(cls => (
            <div key={cls.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-[13px] font-medium text-slate-900">{cls.name}</p>
                <p className="text-[11px] text-slate-400">{cls.courses?.name}</p>
              </div>
              {cls.summary.total > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${cls.summary.pct >= 90 ? 'bg-green-400' : cls.summary.pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${cls.summary.pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{cls.summary.pct}%</span>
                </div>
              ) : <Badge variant="warning">Not marked</Badge>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
