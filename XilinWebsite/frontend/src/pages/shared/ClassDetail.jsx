import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getClass, getClassRoster, listCourses, listSemesters, listProfiles, setClassStatus } from '../../lib/supabaseClient'
import { Card, Badge, Button, TableSkeleton } from '../../components/ui'
import ClassFormModal from '../../components/ClassFormModal'
import { useAuth } from '../../context/AuthContext'
import { useFeedback } from '../../context/FeedbackContext'
import { fmtTime, money } from '../../lib/format'
import { CLASS_STATUS_BADGE as STATUS_BADGE, CLASS_STATUS_LABEL as STATUS_LABEL } from '../../lib/categories'
import { ArrowLeft, Clock, MapPin, Users, Pencil } from 'lucide-react'

const schedule = (c) => c?.day_of_week
  ? `${c.day_of_week} ${fmtTime(c.start_time)}${c.end_time ? `–${fmtTime(c.end_time)}` : ''}`
  : 'Sundays'

export default function ClassDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast, confirm } = useFeedback()

  const isAdmin = user.role === 'admin'
  const [cls, setCls] = useState(null)
  const [roster, setRoster] = useState(null) // null = not loaded / not allowed
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
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

  const changeStatus = async (newStatus) => {
    if (!cls || newStatus === cls.status) return
    const CONFIRM = {
      canceled: { title: 'Cancel class', message: `Mark "${cls.name}" as canceled? Families and the public will still see it but can no longer enroll. Enrolled members stay enrolled — drop them individually if refunds are needed.`, confirmLabel: 'Cancel class' },
      inactive: { title: 'Hide class', message: `Hide "${cls.name}"? It will disappear from families and the public catalog. Admins can still see and re-activate it.`, confirmLabel: 'Hide class' },
    }
    if (CONFIRM[newStatus] && !(await confirm({ ...CONFIRM[newStatus], danger: true }))) return
    setStatusBusy(true)
    try {
      await setClassStatus(id, newStatus)
      await loadClass()
      toast.success(`Class marked ${STATUS_LABEL[newStatus].toLowerCase()}.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setStatusBusy(false)
    }
  }

  const leadProfile = cls?.class_teachers?.find(ct => ct.role === 'lead')?.profiles
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
          <div className="flex items-center gap-2">
            <select value={cls.status} disabled={statusBusy} onChange={e => changeStatus(e.target.value)}
              title="Class status"
              className="text-xs border border-slate-200 rounded-lg px-2 h-8 bg-white outline-none text-slate-700 cursor-pointer disabled:opacity-50">
              <option value="active">Active</option>
              <option value="canceled">Canceled (visible, not enrollable)</option>
              <option value="inactive">Hidden (admins only)</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil size={13} /> Edit</Button>
          </div>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : !cls ? (
        <p className="text-slate-400 text-sm text-center py-12">Class not found.</p>
      ) : (
        <>
          {/* Header */}
          <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
            <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">{cls.courses?.subject_area || 'Class'}</p>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="font-display text-2xl">{cls.name}</h1>
              {cls.status !== 'active' && <Badge variant={STATUS_BADGE[cls.status] || 'default'}>{STATUS_LABEL[cls.status] || cls.status}</Badge>}
            </div>
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
                ['Teacher', leadProfile
                  ? (isAdmin ? <Link to={`/users/${leadProfile.id}`} className="text-slate-900 hover:text-yellow-700 hover:underline">{leadProfile.full_name}</Link> : leadProfile.full_name)
                  : 'To be announced'],
                ['Schedule', schedule(cls)],
                ['Room', cls.room || '—'],
                ['Semester', cls.semesters?.name || '—'],
                ['Grade Range', cls.courses?.grade_level || 'All ages'],
                ['Tuition', cls.price != null ? `${money(cls.price)}/term` : '—'],
                ['Materials Fee', cls.materials_fee != null ? money(cls.materials_fee) : 'None'],
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
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right text-[11px] text-slate-500">
                            {r.email && <p className="truncate max-w-[180px]">{r.email}</p>}
                            {r.phone && <p>{r.phone}</p>}
                          </div>
                          <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${r.paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {r.paid ? 'Paid' : 'Unpaid'}
                          </span>
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
