import { useState, useEffect } from 'react'
import { BookOpen, Coins, Megaphone } from 'lucide-react'
import { getOwnPayments, getOwnEnrollments, listAnnouncements } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

export default function StudentDashboard() {
  const { user } = useAuth()
  const [enrollments, setEnrollments] = useState([])
  const [payments, setPayments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [enrollData, paymentData, annData] = await Promise.all([
          getOwnEnrollments(user.id),
          getOwnPayments(user.id),
          listAnnouncements(),
        ])
        setEnrollments(enrollData)
        setPayments(paymentData)
        setAnnouncements(annData.slice(0, 4))
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  const myClasses = enrollments.filter(e => e.status === 'enrolled')
  const pendingFees = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  const stats = [
    { label: 'Enrolled Classes', value: myClasses.length, delta: 'This semester', trend: 'up', Icon: BookOpen },
    { label: 'Pending Fees', value: `$${pendingFees.toLocaleString()}`, delta: pendingFees > 0 ? 'Action needed' : 'All paid', trend: pendingFees > 0 ? 'warn' : 'up', Icon: Coins },
    { label: 'Announcements', value: announcements.length, delta: 'New updates', trend: 'up', Icon: Megaphone },
  ]

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="relative bg-slate-800 rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-teal-400/5 pointer-events-none" />
        <div>
          <p className="text-teal-400 text-xs uppercase tracking-widest mb-1">Student Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">Your Learning Hub</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* My classes */}
        <Card>
          <SectionHeader title="My Classes"
            action={<Link to="/timetable" className="text-xs text-teal-600 hover:text-teal-700">Timetable</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : myClasses.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">You're not enrolled in any classes yet.</p>
          ) : (
            <div className="space-y-2">
              {myClasses.map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{e.classes?.name || e.classes?.courses?.name}</p>
                    <p className="text-xs text-slate-400">
                      {e.classes?.courses?.subject_area}
                      {e.classes?.day_of_week ? ` · ${e.classes.day_of_week} ${e.classes.start_time?.slice(0,5) || ''}` : ''}
                    </p>
                  </div>
                  <Badge variant="enrolled">Enrolled</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Announcements */}
        <Card>
          <SectionHeader title="Announcements"
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
                <p className="text-[11px] text-slate-400 mt-0.5">{ann.published_at?.slice(0, 10)}</p>
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
