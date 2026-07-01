import { useState, useEffect } from 'react'
import { BookOpen, Wallet, MessageSquare } from 'lucide-react'
import { getOwnFamily, getOwnEnrollments, listAnnouncements } from '../../lib/supabaseClient'
import { StatCard, Card, Badge, SectionHeader } from '../../components/ui'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { money } from '../../lib/format'
import { CAT_DOT } from '../../lib/categories'

export default function FamilyDashboard() {
  const { user } = useAuth()
  const members = (user.familyMembers || [])
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const [enrollments, setEnrollments] = useState([])
  const [family, setFamily] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  const member = members.find(s => s.id === memberId)

  // Family balance + announcements (independent of which member is selected)
  useEffect(() => {
    getOwnFamily(user.id).then(setFamily).catch(() => {})
    listAnnouncements().then(a => setAnnouncements(a.slice(0, 4))).catch(() => {})
  }, [user.id])

  useEffect(() => {
    if (!memberId) { setLoading(false); return }
    getOwnEnrollments(memberId)
      .then(setEnrollments)
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [memberId])

  const myClasses = enrollments.filter(e => e.status === 'enrolled')
  const balance = Number(family?.balance || 0)
  const owes = balance < 0

  const stats = [
    { label: 'Enrolled Classes', value: myClasses.length, delta: member?.full_name || '—', trend: 'up', Icon: BookOpen },
    { label: owes ? 'Amount Due' : 'Balance', value: money(balance), delta: owes ? 'Action needed' : 'Settled', trend: owes ? 'warn' : 'up', Icon: Wallet },
    { label: 'Announcements', value: announcements.length, delta: 'New updates', trend: 'up', Icon: MessageSquare },
  ]

  if (members.length === 0) {
    return (
      <div className="max-w-5xl animate-fade-in">
        <Card><p className="text-slate-400 text-sm py-6 text-center">No members are linked to your family account yet. Contact the school office.</p></Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="relative bg-navy rounded-2xl p-6 mb-6 overflow-hidden flex items-center justify-between">
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-yellow-400/5 pointer-events-none" />
        <div>
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-1">Family Portal</p>
          <h2 className="font-display text-2xl text-white mb-1">Family Portal</h2>
          <p className="text-slate-400 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        {members.length > 1 ? (
          <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
            <p className="text-white/40 text-xs mb-1.5">Viewing</p>
            <select value={memberId} onChange={e => setMemberId(e.target.value)}
              className="bg-transparent text-white font-display text-base outline-none cursor-pointer">
              {members.map(s => <option key={s.id} value={s.id} className="text-slate-900">{s.full_name}</option>)}
            </select>
          </div>
        ) : (
          <div className="bg-white/5 rounded-xl px-4 py-3 text-right border border-white/10">
            <p className="text-white/40 text-xs mb-0.5">Member</p>
            <p className="text-white font-display text-base">{member?.full_name}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Member's enrolled classes */}
        <Card>
          <SectionHeader title="Enrolled Classes"
            action={<Link to="/child-timetable" className="text-xs text-yellow-600 hover:text-yellow-700">Timetable</Link>} />
          {loading ? (
            <p className="text-slate-400 text-sm py-6">Loading…</p>
          ) : myClasses.length === 0 ? (
            <p className="text-slate-400 text-sm py-6">No classes enrolled yet.</p>
          ) : (
            <div className="space-y-2">
              {myClasses.map(e => (
                <Link key={e.id} to={`/class/${e.class_id}`}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{e.classes?.name || e.classes?.courses?.name}</p>
                    <p className="text-xs text-slate-400">
                      {e.classes?.courses?.subject_area}
                      {e.classes?.day_of_week ? ` · ${e.classes.day_of_week} ${e.classes.start_time?.slice(0,5) || ''}` : ''}
                    </p>
                  </div>
                  <Badge variant="enrolled">Enrolled</Badge>
                </Link>
              ))}
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
