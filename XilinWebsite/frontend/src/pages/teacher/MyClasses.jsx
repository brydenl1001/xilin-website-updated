import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { listMyClasses, getClassRoster, getAttendanceSummary } from '../../lib/supabaseClient'
import { Card, Badge, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const today = () => new Date().toISOString().slice(0, 10)
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export default function TeacherMyClasses() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)
  const [roster, setRoster] = useState([])
  const [attendanceStats, setAttendanceStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyClasses(user.id)
      .then(data => setClasses(data.map(d => d.classes)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  const openClass = async (cls) => {
    setSelected(cls)
    try {
      const [rosterData, attStats] = await Promise.all([
        getClassRoster(cls.id),
        getAttendanceSummary(cls.id, daysAgo(30), today()),
      ])
      setRoster(rosterData)
      setAttendanceStats(attStats)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="My Classes" subtitle="Overview of all classes you teach" />

      {selected ? (
        <div className="animate-fade-in">
          <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-800 mb-5 flex items-center gap-1 transition-colors">
            ← Back to all classes
          </button>
          <div className="bg-slate-900 rounded-2xl p-6 mb-5 text-white">
            <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">{selected.courses?.name}</p>
            <h2 className="font-display text-2xl mb-1">{selected.name}</h2>
            <div className="flex gap-6 mt-3 text-sm text-slate-400">
              {selected.room && <span>{selected.room}</span>}
              <span>{roster.length} students</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <Card><p className="font-display text-2xl text-slate-900">{attendanceStats?.pct ?? '—'}%</p><p className="text-xs text-slate-400 mt-0.5">Attendance Rate (30d)</p></Card>
            <Card><p className="font-display text-2xl text-slate-900">{roster.length}</p><p className="text-xs text-slate-400 mt-0.5">Students Enrolled</p></Card>
          </div>
          <Card>
            <h3 className="font-display text-base text-slate-900 mb-4">Student Roster</h3>
            {roster.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No students enrolled in this class yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {roster.map(r => (
                  <div key={r.id} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-semibold text-yellow-700 flex-shrink-0">
                      {r.profiles?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <span className="text-sm text-slate-700">{r.profiles?.full_name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-12">No classes assigned to you yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {classes.map(cls => (
            <Card key={cls.id} onClick={() => openClass(cls)} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <BookOpen size={18} className="text-yellow-600" />
                </div>
                <Badge variant="academics">{cls.courses?.subject_area || 'General'}</Badge>
              </div>
              <h3 className="font-display text-lg text-slate-900 mb-0.5">{cls.name}</h3>
              <p className="text-sm text-slate-400">{cls.courses?.name}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
