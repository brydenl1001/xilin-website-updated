import { useState, useEffect } from 'react'
import { Users, UserCheck, Wallet, GraduationCap } from 'lucide-react'
import { listProfiles, listEnrollmentApplications, listFamilies, listAnnouncements, listClasses } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, Button, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { CAT_DOT } from '../../lib/categories'

const money = (n) => `$${Math.abs(Number(n || 0)).toFixed(2)}`

export default function AdminDashboard() {
  const [studentCount, setStudentCount] = useState(0)
  const [pending, setPending] = useState(0)
  const [classCount, setClassCount] = useState(0)
  const [families, setFamilies] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [students, applications, fams, annData, classes] = await Promise.all([
          listProfiles('student'),
          listEnrollmentApplications('pending'),
          listFamilies(),
          listAnnouncements(),
          listClasses(),
        ])
        setStudentCount(students.length)
        setPending(applications.length)
        setFamilies(fams)
        setAnnouncements(annData.slice(0, 4))
        setClassCount(classes.length)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const owing = families.filter(f => Number(f.balance) < 0).sort((a, b) => Number(a.balance) - Number(b.balance))

  const stats = [
    { label: 'Total Students', value: studentCount.toLocaleString(), delta: 'Member accounts', trend: 'up', Icon: Users },
    { label: 'Pending Applications', value: pending, delta: 'Awaiting review', trend: pending > 0 ? 'warn' : 'up', Icon: UserCheck },
    { label: 'Families Owing', value: owing.length, delta: owing.length > 0 ? 'Need follow-up' : 'All settled', trend: owing.length > 0 ? 'warn' : 'up', Icon: Wallet },
    { label: 'Classes', value: classCount, delta: 'Scheduled', trend: 'up', Icon: GraduationCap },
  ]

  return (
    <div className="max-w-6xl animate-fade-in">
      <div className="relative bg-navy rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Admin Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">School Overview</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/applications"><Button variant="gold" size="sm">Review Applications</Button></Link>
          <Link to="/announcements"><Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">+ Notice</Button></Link>
        </div>
      </div>

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
                <p className="text-[11px] text-slate-400 mt-0.5">{ann.profiles?.full_name || 'School Office'} · {ann.published_at?.slice(0, 10)}</p>
              </div>
              <Badge variant={ann.category}>{ann.category}</Badge>
            </div>
          ))}
        </Card>

        {/* Outstanding balances */}
        <Card>
          <SectionHeader title="Outstanding Balances"
            action={<Link to="/reports" className="text-xs text-yellow-600 hover:text-yellow-700">Full report</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : owing.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No families owe a balance. 🎉</p>
          ) : owing.slice(0, 6).map(f => (
            <Link key={f.id} to={`/families/${f.id}`}
              className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 -mx-2 px-2 rounded-lg hover:bg-slate-50 transition-colors">
              <div>
                <p className="text-[13px] font-medium text-slate-900">{f.family_name}</p>
                <p className="text-[11px] text-slate-400">ID {f.family_code}</p>
              </div>
              <span className="text-sm font-semibold text-red-600">{money(f.balance)}</span>
            </Link>
          ))}
        </Card>
      </div>
    </div>
  )
}
