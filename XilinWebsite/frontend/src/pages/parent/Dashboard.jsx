import { BarChart2, CalendarCheck, Coins, MessageSquare } from 'lucide-react'
import { mockStats, mockGrades, mockChildren, publicAnnouncements } from '../../lib/mockData'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ICON_MAP = { BarChart2, CalendarCheck, Coins, MessageSquare }
const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

export default function ParentDashboard() {
  const { user } = useAuth()
  const stats = mockStats.parent
  const child = mockChildren[0]

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="relative bg-slate-900 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Parent Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">Family Portal</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {child && (
          <div className="bg-white/5 rounded-xl px-4 py-3 text-right border border-white/10">
            <p className="text-white/40 text-xs mb-0.5">Monitoring</p>
            <p className="text-white font-display text-base">{child.name}</p>
            <p className="text-slate-400 text-xs">{child.grade} · {child.teacher}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} Icon={ICON_MAP[s.icon]} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Child grades overview */}
        <Card>
          <SectionHeader title="Recent Grades"
            action={<Link to="/child-grades" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          <div className="space-y-3">
            {mockGrades.slice(0, 4).map(g => (
              <div key={g.subject} className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-medium text-slate-900 truncate">{g.subject}</p>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                    <div className={`h-full rounded-full ${g.score >= 90 ? 'bg-emerald-400' : g.score >= 75 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${g.score}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold text-slate-700">{g.grade}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Announcements */}
        <Card>
          <SectionHeader title="Announcements"
            action={<Link to="/announcements" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          {publicAnnouncements.slice(0, 4).map(ann => (
            <div key={ann.id} className="flex gap-3 py-3 border-b border-slate-100 last:border-0">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CAT_DOT[ann.category]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-slate-900 truncate">{ann.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{ann.published_at}</p>
              </div>
              <Badge variant={ann.category}>{ann.category}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
