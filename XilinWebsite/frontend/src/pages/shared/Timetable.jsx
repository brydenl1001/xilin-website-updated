import { useState, useEffect } from 'react'
import { listMyClasses, getOwnEnrollments } from '../../lib/supabaseClient'
import { Card, PageHeader, Badge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { fmtTime } from '../../lib/format'
import { User } from 'lucide-react'

const DAY_ORDER = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }
// Order classes by day, then start time (untimed classes last).
const byTime = (a, b) => {
  const da = DAY_ORDER[a.day_of_week] ?? 9, db = DAY_ORDER[b.day_of_week] ?? 9
  if (da !== db) return da - db
  return (a.start_time || '99').localeCompare(b.start_time || '99')
}

const timeRange = (c) => c.start_time
  ? `${fmtTime(c.start_time)}${c.end_time ? ` – ${fmtTime(c.end_time)}` : ''}`
  : 'TBA'

function ClassRow({ cls }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-slate-900">{cls.name}</p>
          <Badge variant="academics">{cls.courses?.subject_area || 'General'}</Badge>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{cls.courses?.name}{cls.room ? ` · ${cls.room}` : ''}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="font-display text-lg text-slate-900 leading-none whitespace-nowrap">{timeRange(cls)}</p>
        <p className="text-[11px] text-slate-400 mt-1">{cls.day_of_week || '—'}</p>
      </div>
    </div>
  )
}

export default function Timetable({ subtitle = 'Your classes this semester' }) {
  const { user } = useAuth()
  const [teacherClasses, setTeacherClasses] = useState([])
  const [byMember, setByMember] = useState([]) // [{ member, classes: [...] }]
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        if (user.role === 'teacher') {
          const data = await listMyClasses(user.id)
          setTeacherClasses(data.map(d => d.classes).filter(Boolean))
        } else {
          // Family: show each member's enrolled classes.
          const members = user.familyMembers || []
          const rows = await Promise.all(members.map(async (m) => {
            const enr = await getOwnEnrollments(m.id)
            const classes = enr.filter(e => e.status === 'enrolled').map(e => e.classes).filter(Boolean)
            return { member: m, classes }
          }))
          setByMember(rows)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Timetable" subtitle={subtitle} />

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && user.role === 'teacher' && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base text-slate-900">Your Classes</h3>
          </div>
          {teacherClasses.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No classes assigned this semester.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...teacherClasses].sort(byTime).map(cls => <ClassRow key={cls.id} cls={cls} />)}
            </div>
          )}
        </Card>
      )}

      {!loading && !error && user.role !== 'teacher' && (
        byMember.length === 0 ? (
          <Card><p className="text-center text-slate-400 py-12 text-sm">No members linked to your family yet.</p></Card>
        ) : (
          <div className="space-y-5">
            {byMember.map(({ member, classes }) => (
              <Card key={member.id} className="!p-0 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
                  <User size={14} className="text-yellow-600" />
                  <h3 className="font-display text-base text-slate-900">{member.full_name}</h3>
                  <span className="text-xs text-slate-400 capitalize">· {member.relationship}</span>
                </div>
                {classes.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-sm">Not enrolled in any classes.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {[...classes].sort(byTime).map(cls => <ClassRow key={cls.id} cls={cls} />)}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
