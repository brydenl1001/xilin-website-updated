import { useState, useEffect } from 'react'
import { BookOpen, Megaphone } from 'lucide-react'
import { listMyClasses, listAnnouncements } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [classData, annData] = await Promise.all([
          listMyClasses(user.id),
          listAnnouncements(),
        ])
        setClasses(classData)
        setAnnouncements(annData.slice(0, 4))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  const stats = [
    { label: 'My Classes', value: classes.length, delta: 'Assigned this semester', trend: 'up', Icon: BookOpen },
    { label: 'Announcements', value: announcements.length, delta: 'Visible to you', trend: 'up', Icon: Megaphone },
  ]

  return (
    <div className="max-w-6xl animate-fade-in">
      <div className="relative bg-navy rounded-2xl p-6 mb-6 overflow-hidden">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Teacher Portal</p>
        <h2 className="font-display text-2xl text-white mb-1">Your Teaching Hub</h2>
        <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* My Classes */}
        <Card>
          <SectionHeader title="My Classes"
            action={<Link to="/my-classes" className="text-xs text-yellow-600 hover:text-yellow-700">Manage</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : classes.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No classes assigned yet.</p>
          ) : (
            <div className="space-y-2">
              {classes.map(({ classes: c, role }) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{c.name}</p>
                    <p className="text-xs text-slate-400">{c.courses?.name}</p>
                  </div>
                  <Badge variant="default">{role}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Announcements */}
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
