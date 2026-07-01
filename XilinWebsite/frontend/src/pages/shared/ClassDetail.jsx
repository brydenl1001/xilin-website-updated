import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getClass, getClassRoster, listCourses, listSemesters, listProfiles, deleteClass } from '../../lib/supabaseClient'
import { Card, Badge, Button } from '../../components/ui'
import ClassFormModal from '../../components/ClassFormModal'
import { useAuth } from '../../context/AuthContext'
import { fmtTime, money } from '../../lib/format'
import { ArrowLeft, Clock, MapPin, Users, Pencil, Trash2 } from 'lucide-react'

const leadOf = (c) => c?.class_teachers?.find(ct => ct.role === 'lead')?.profiles?.full_name
const schedule = (c) => c?.day_of_week
  ? `${c.day_of_week} ${fmtTime(c.start_time)}${c.end_time ? `–${fmtTime(c.end_time)}` : ''}`
  : 'Sundays'

export default function ClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isAdmin = user.role === 'admin'
  const [cls, setCls] = useState(null)
  const [roster, setRoster] = useState(null) // null = not loaded / not allowed
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [ref, setRef] = useState({ courses: [], semesters: [], teachers: [] }) // for the admin edit form

  const loadRoster = async () => {
    try { setRoster(await getClassRoster(id)) } catch { /* no access */ }
  }

  const loadClass = async () => {
    const c = await getClass(id)
    setCls(c)
    const teaches = (c.class_teachers || []).some(ct => ct.profiles?.id === user.id)
    if (isAdmin || (user.role === 'teacher' && teaches)) await loadRoster()
    return c
  }

  useEffect(() => {
    let live = true
    setLoading(true); setError('')
    loadClass().catch(err => { if (live) setError(err.message) }).finally(() => { if (live) setLoading(false) })
    if (isAdmin) {
      Promise.all([listCourses(), listSemesters(), listProfiles('teacher')])
        .then(([courses, semesters, teachers]) => { if (live) setRef({ courses, semesters, teachers }) })
        .catch(() => {})
    }
    return () => { live = false }
  }, [id, user.id, user.role])

  const doDelete = async () => {
    if (!window.confirm(`Delete "${cls.name}"? This cannot be undone.`)) return
    setDeleting(true)
    try {
      await deleteClass(id)
      navigate('/manage-classes')
    } catch (err) {
      alert(err.message)
      setDeleting(false)
    }
  }

  const cap = cls?.max_students
  const availability = roster
    ? `${roster.length}${cap != null ? ` / ${cap}` : ''} enrolled`
    : cap != null ? `Up to ${cap} students` : 'Open'

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">
          <ArrowLeft size={15} /> Back
        </button>
        {isAdmin && cls && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil size={13} /> Edit</Button>
            <Button variant="outline" size="sm" disabled={deleting} className="!text-red-600 hover:!bg-red-50" onClick={doDelete}><Trash2 size={13} /> {deleting ? 'Deleting…' : 'Delete'}</Button>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : !cls ? (
        <p className="text-slate-400 text-sm text-center py-12">Class not found.</p>
      ) : (
        <>
          {/* Header */}
          <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
            <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">{cls.courses?.subject_area || 'Class'}</p>
            <h1 className="font-display text-2xl mb-1">{cls.name}</h1>
            <p className="text-slate-300 text-sm mb-3">{cls.courses?.name}{cls.courses?.code ? ` · ${cls.courses.code}` : ''}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><Clock size={13} className="text-yellow-400" />{schedule(cls)}</span>
              {cls.room && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-yellow-400" />{cls.room}</span>}
              <span className="flex items-center gap-1.5"><Users size={13} className="text-yellow-400" />{availability}</span>
            </div>
          </div>

          {cls.courses?.description && (
            <Card className="mb-5"><p className="text-sm text-slate-600 leading-relaxed">{cls.courses.description}</p></Card>
          )}

          {/* Details grid */}
          <Card className="mb-5">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              {[
                ['Course', cls.courses?.name || '—'],
                ['Teacher', leadOf(cls) || 'To be announced'],
                ['Schedule', schedule(cls)],
                ['Room', cls.room || '—'],
                ['Semester', cls.semesters?.name || '—'],
                ['Grade Range', cls.courses?.grade_level || 'All ages'],
                ['Tuition', cls.courses?.price != null ? `${money(cls.courses.price)}/term` : '—'],
                ['Materials Fee', cls.courses?.materials_fee != null ? money(cls.courses.materials_fee) : 'None'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-slate-900">{v}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Roster — admins + teachers of this class */}
          {roster && (
            <Card>
              <h3 className="font-display text-base text-slate-900 mb-4">Roster &amp; Guardian Contact ({roster.length})</h3>
              {roster.length === 0 ? (
                <p className="text-slate-400 text-sm py-4">No one is enrolled in this class yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {roster.map(r => {
                    const RowTag = isAdmin ? Link : 'div'
                    return (
                      <RowTag key={r.member_id} {...(isAdmin ? { to: `/users/${r.member_id}` } : {})}
                        className={`flex items-center justify-between gap-3 p-2.5 bg-slate-50 rounded-lg ${isAdmin ? 'hover:bg-slate-100 transition-colors cursor-pointer' : ''}`}>
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
                      </RowTag>
                    )
                  })}
                </div>
              )}
            </Card>
          )}
        </>
      )}

      {isAdmin && (
        <ClassFormModal
          open={editOpen}
          editing={cls}
          courses={ref.courses}
          semesters={ref.semesters}
          teachers={ref.teachers}
          onClose={() => setEditOpen(false)}
          onSaved={async () => { setEditOpen(false); await loadClass() }}
        />
      )}
    </div>
  )
}
