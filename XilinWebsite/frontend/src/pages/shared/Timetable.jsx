import { useState, useEffect } from 'react'
import { listMyClasses, getOwnEnrollments } from '../../lib/supabaseClient'
import { Card, PageHeader, TableSkeleton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import ClassScheduleList, { distinctSemesters, SemesterPicker } from '../../components/ClassScheduleList'
import { User } from 'lucide-react'

export default function Timetable({ subtitle = 'Your classes this semester' }) {
  const { user } = useAuth()
  const isTeacher = user.role === 'teacher'
  const [teacherClasses, setTeacherClasses] = useState([])
  const [byMember, setByMember] = useState([]) // [{ member, classes: [...] }]
  const [semId, setSemId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        let loaded = []
        if (isTeacher) {
          const data = await listMyClasses(user.id)
          const classes = data.map(d => d.classes).filter(Boolean)
          setTeacherClasses(classes)
          loaded = classes
        } else {
          const members = user.familyMembers || []
          const rows = await Promise.all(members.map(async (m) => {
            const enr = await getOwnEnrollments(m.id)
            return { member: m, classes: enr.filter(e => e.status === 'enrolled').map(e => e.classes).filter(Boolean) }
          }))
          setByMember(rows)
          loaded = rows.flatMap(r => r.classes)
        }
        const sems = distinctSemesters(loaded)
        setSemId(prev => prev || (sems.find(s => s.is_current) || sems[0])?.id || '')
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, isTeacher])

  const allLoaded = isTeacher ? teacherClasses : byMember.flatMap(r => r.classes)
  const semesters = distinctSemesters(allLoaded)
  const inSem = (c) => c.semester_id === semId

  return (
    <div className="max-w-5xl animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <PageHeader title="Timetable" subtitle={subtitle} />
        {!loading && !error && <SemesterPicker semesters={semesters} value={semId} onChange={setSemId} />}
      </div>

      {loading && <TableSkeleton rows={6} />}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && isTeacher && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base text-slate-900">Your Classes</h3>
          </div>
          <ClassScheduleList classes={teacherClasses.filter(inSem)} empty="No classes assigned this semester." />
        </Card>
      )}

      {!loading && !error && !isTeacher && (
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
                <ClassScheduleList classes={classes.filter(inSem)} empty="Not enrolled in any classes this term." />
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
