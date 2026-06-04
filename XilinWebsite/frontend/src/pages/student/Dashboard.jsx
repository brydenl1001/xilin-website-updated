import { BarChart2, CalendarCheck, Coins, ClipboardList } from 'lucide-react'
import { mockStats, mockGrades, publicAnnouncements } from '../../lib/mockData'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ICON_MAP = { BarChart2, CalendarCheck, Coins, ClipboardList }
const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

const GRADE_BAR_COLOR = (score) => score >= 90 ? 'bg-emerald-400' : score >= 75 ? 'bg-blue-400' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'

export default function StudentDashboard() {
  const { user } = useAuth()
  const stats = mockStats.student

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="relative bg-slate-900 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Student Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">Your Learning Hub</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className="text-white/40 text-xs mb-1">Class</p>
          <p className="text-white font-display text-lg">Grade 10-A</p>
          <p className="text-slate-400 text-xs">Ms. Rivera</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} Icon={ICON_MAP[s.icon]} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Recent grades */}
        <Card>
          <SectionHeader title="My Grades"
            action={<Link to="/my-grades" className="text-xs text-yellow-600 hover:text-yellow-700">View all</Link>} />
          <div className="space-y-3">
            {mockGrades.slice(0, 4).map(g => (
              <div key={g.subject} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900 truncate">{g.subject}</p>
                    <span className="text-sm font-bold text-slate-700 ml-2">{g.grade}</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${GRADE_BAR_COLOR(g.score)}`} style={{ width: `${g.score}%` }} />
                  </div>
                </div>
                <span className="text-xs text-slate-400 flex-shrink-0">{g.score}%</span>
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
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
