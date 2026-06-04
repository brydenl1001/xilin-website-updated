import { BookOpen, PenLine, CalendarCheck, Megaphone } from 'lucide-react'
import { mockStats, mockAttendance, publicAnnouncements } from '../../lib/mockData'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const ICON_MAP = { BookOpen, PenLine, CalendarCheck, Megaphone }
const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

const MY_CLASSES = [
  { name: 'Grade 9-A', subject: 'Mathematics', students: 30, next: 'Mon 8:00 AM' },
  { name: 'Grade 10-B', subject: 'Mathematics', students: 28, next: 'Mon 9:00 AM' },
  { name: 'Grade 11-A', subject: 'Mathematics', students: 32, next: 'Tue 8:00 AM' },
  { name: 'Grade 12-A', subject: 'Calculus', students: 25, next: 'Tue 10:20 AM' },
]

export default function TeacherDashboard() {
  const { user } = useAuth()
  const stats = mockStats.teacher

  return (
    <div className="max-w-6xl animate-fade-in">
      <div className="relative bg-slate-900 rounded-2xl p-6 mb-6 overflow-hidden">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Teacher Portal</p>
        <h2 className="font-display text-2xl text-white mb-1">Your Teaching Hub</h2>
        <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} Icon={ICON_MAP[s.icon]} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* My Classes */}
        <Card>
          <SectionHeader title="My Classes"
            action={<Link to="/my-classes" className="text-xs text-yellow-600 hover:text-yellow-700">Manage</Link>} />
          <div className="space-y-2">
            {MY_CLASSES.map(c => (
              <div key={c.name} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.subject} · {c.students} students</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">Next class</p>
                  <p className="text-xs font-medium text-slate-700">{c.next}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Announcements */}
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
