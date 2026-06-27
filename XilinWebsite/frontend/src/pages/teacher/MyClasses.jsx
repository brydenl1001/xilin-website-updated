import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { listMyClasses, getClassRoster } from '../../lib/supabaseClient'
import { Card, Badge, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const fmtTime = (t) => t ? t.slice(0, 5) : ''

export default function TeacherMyClasses() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [selected, setSelected] = useState(null)
  const [roster, setRoster] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyClasses(user.id)
      .then(data => setClasses(data.map(d => d.classes)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  const openClass = async (cls) => {
    setSelected(cls)
    setRoster([])
    try {
      setRoster(await getClassRoster(cls.id))
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
          <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
            <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">{selected.courses?.name}</p>
            <h2 className="font-display text-2xl mb-1">{selected.name}</h2>
            <div className="flex gap-6 mt-3 text-sm text-slate-400">
              {selected.day_of_week && <span>{selected.day_of_week} {fmtTime(selected.start_time)}{selected.end_time ? `–${fmtTime(selected.end_time)}` : ''}</span>}
              {selected.room && <span>{selected.room}</span>}
              <span>{roster.length} enrolled</span>
            </div>
          </div>
          <Card>
            <h3 className="font-display text-base text-slate-900 mb-4">Roster &amp; Guardian Contact</h3>
            {roster.length === 0 ? (
              <p className="text-slate-400 text-sm py-4">No one enrolled in this class yet.</p>
            ) : (
              <div className="space-y-1.5">
                {roster.map(r => (
                  <div key={r.member_id} className="flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-semibold text-yellow-700 flex-shrink-0">
                        {r.member_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-slate-800 truncate">{r.member_name}</p>
                        <p className="text-[11px] text-slate-400 capitalize">{r.member_role}{r.family_name ? ` · ${r.family_name}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500 flex-shrink-0">
                      {r.email && <p className="truncate max-w-[180px]">{r.email}</p>}
                      {r.phone && <p>{r.phone}</p>}
                    </div>
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
