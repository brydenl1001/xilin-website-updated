import { Users, UserCheck, Coins, TrendingUp } from 'lucide-react'
import { mockStats, mockAttendance, publicAnnouncements } from '../../lib/mockData'
import { StatCard, Card, Badge, Button, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'

const ICON_MAP = { Users, UserCheck, Coins, TrendingUp }
const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

export default function AdminDashboard() {
  const stats = mockStats.admin

  return (
    <div className="max-w-6xl animate-fade-in">
      {/* Welcome */}
      <div className="relative bg-slate-900 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Admin Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">School Overview</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/enrollments"><Button variant="gold" size="sm">+ Enrollment</Button></Link>
          <Link to="/announcements"><Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">+ Notice</Button></Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} Icon={ICON_MAP[s.icon]} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent Announcements */}
        <Card>
          <SectionHeader title="Recent Announcements"
            action={<Link to="/announcements" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          {publicAnnouncements.slice(0, 4).map(ann => (
            <div key={ann.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CAT_DOT[ann.category]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{ann.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ann.author} · {ann.published_at}</p>
              </div>
              <Badge variant={ann.category}>{ann.category}</Badge>
            </div>
          ))}
        </Card>

        {/* Attendance */}
        <Card>
          <SectionHeader title="Today's Attendance"
            action={<Link to="/attendance" className="text-xs text-yellow-600 hover:text-yellow-700">Full report</Link>} />
          {mockAttendance.map(item => (
            <div key={item.class} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
              <div>
                <p className="text-[13px] font-medium text-slate-900">{item.class}</p>
                <p className="text-[11px] text-slate-400">{item.total} students</p>
              </div>
              {item.pct !== null ? (
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.pct >= 90 ? 'bg-green-400' : item.pct >= 75 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${item.pct}%` }} />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{item.pct}%</span>
                </div>
              ) : <Badge variant="warning">Not marked</Badge>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
