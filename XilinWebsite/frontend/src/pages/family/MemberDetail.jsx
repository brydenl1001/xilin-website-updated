import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, X, Pencil, Trash2, Clock, Phone, Cake, Users, User } from 'lucide-react'
import {
  getOwnFamily, listClasses, getClassCounts, getOwnEnrollments,
  enrollMember, dropMember, requestEnrollment, familyUpdateMember, removeFamilyMemberFully,
} from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, Input, Select, TableSkeleton } from '../../components/ui'
import ClassPicker from '../../components/ClassPicker'
import ClassScheduleList, { distinctSemesters, SemesterPicker } from '../../components/ClassScheduleList'
import { useAuth } from '../../context/AuthContext'
import { useFeedback } from '../../context/FeedbackContext'
import { money, fmtTime } from '../../lib/format'
import { ROLE_VARIANT } from '../../lib/categories'
import { timesOverlap, inActiveSemester } from '../../lib/schedule'

const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const GENDER_LABEL = { female: 'Female', male: 'Male', other: 'Other', prefer_not_to_say: 'Prefer not to say' }

export default function FamilyMemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const { toast, confirm } = useFeedback()

  const [family, setFamily] = useState(null)
  const [classes, setClasses] = useState([])
  const [counts, setCounts] = useState({})
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [picking, setPicking] = useState(false)
  const [semId, setSemId] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'student', phone: '', date_of_birth: '', gender: '' })
  const [editError, setEditError] = useState('')

  const member = (family?.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship })).find(m => m.id === id)

  const load = async () => {
    setLoading(true)
    try {
      const [fam, cls, cnt, enr] = await Promise.all([
        getOwnFamily(user.id), listClasses(), getClassCounts(), getOwnEnrollments(id),
      ])
      setFamily(fam); setClasses(cls); setCounts(cnt); setEnrollments(enr)
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user.id, id])

  const refreshAll = async () => { await load(); await refreshUser() }

  const enrolled = enrollments.filter(e => e.status === 'enrolled' && inActiveSemester(e))
  const pending = enrollments.filter(e => e.status === 'pending' && inActiveSemester(e))
  const enrollableClasses = classes.filter(c => c.semesters?.is_active && c.status === 'active')
  const taken = new Set([...enrolled, ...pending].map(e => e.class_id))
  const available = enrollableClasses.filter(c => !taken.has(c.id))

  // Semester dropdown for the member's timetable — default to the current term.
  const memberSemesters = distinctSemesters(enrolled.map(e => e.classes))
  useEffect(() => {
    const sems = distinctSemesters(enrollments.filter(e => e.status === 'enrolled' && inActiveSemester(e)).map(e => e.classes))
    setSemId(prev => (prev && sems.some(s => s.id === prev)) ? prev : (sems.find(s => s.is_current) || sems[0])?.id || '')
  }, [enrollments])
  const enrolledForSem = enrolled.filter(e => e.classes?.semester_id === semId).map(e => ({ ...e.classes, __enr: e.id }))
  const pendingForSem = pending.filter(e => e.classes?.semester_id === semId)

  // Enroll into one or more classes at once. Handles per-class schedule-conflict
  // confirmation and the "registration closed → send request" fallback, then
  // reports a summary.
  const addClasses = async (classIds) => {
    if (!classIds?.length) return
    setBusy(true)
    const localEnrolled = enrolled.map(e => e.classes) // grows as we enroll, for intra-batch conflict checks
    let enrolledCount = 0, requested = 0
    const failures = []
    for (const classId of classIds) {
      const target = enrollableClasses.find(c => c.id === classId)
      const conflict = localEnrolled.find(ec => timesOverlap(ec, target))
      if (conflict && !(await confirm({
        title: 'Schedule conflict',
        message: `"${target?.name}" overlaps with "${conflict.name}" (${conflict.day_of_week} ${fmtTime(conflict.start_time)}). Enroll anyway?`,
        confirmLabel: 'Enroll anyway',
      }))) continue
      try {
        await enrollMember(id, classId)
        enrolledCount++
        if (target) localEnrolled.push(target)
      } catch (err) {
        if (/registration has closed/i.test(err.message) && (await confirm({
          title: 'Registration closed',
          message: `Registration has closed for "${target?.name}". Send it as a request for an admin to approve instead?`,
          confirmLabel: 'Send request',
        }))) {
          try { await requestEnrollment(id, classId); requested++ }
          catch (e2) { failures.push(`${target?.name || 'class'}: ${e2.message}`) }
        } else if (!/registration has closed/i.test(err.message)) {
          failures.push(`${target?.name || 'class'}: ${err.message}`)
        }
      }
    }
    await refreshAll()
    setBusy(false)
    setPicking(false)
    if (enrolledCount) toast.success(`Enrolled in ${enrolledCount} class${enrolledCount === 1 ? '' : 'es'}.`)
    if (requested) toast.success(`${requested} request${requested === 1 ? '' : 's'} sent for admin approval.`)
    if (failures.length) toast.error(failures.join(' · '))
  }

  const removeClass = async (enrollmentId, className) => {
    if (!(await confirm({ title: 'Drop class', message: `Drop "${className}"? Any prorated credit will be returned to your family balance.`, confirmLabel: 'Drop class', danger: true }))) return
    setBusy(true)
    try {
      const res = await dropMember(enrollmentId)
      await refreshAll()
      toast.success(`Dropped. Credit returned: ${money(res.credit)}.`)
    } catch (err) { toast.error(err.message) } finally { setBusy(false) }
  }

  const openEdit = () => {
    setEditForm({
      full_name: member.full_name || '', role: member.relationship === 'parent' ? 'parent' : 'student',
      phone: member.phone || '', date_of_birth: member.date_of_birth || '', gender: member.gender || '',
    })
    setEditError(''); setEditOpen(true)
  }
  const saveMember = async () => {
    if (!editForm.full_name.trim()) return
    setBusy(true); setEditError('')
    try {
      await familyUpdateMember(id, editForm)
      setEditOpen(false)
      await refreshAll()
      toast.success('Member updated.')
    } catch (err) { setEditError(err.message) } finally { setBusy(false) }
  }

  const removeMember = async () => {
    if (!(await confirm({
      title: 'Remove member',
      message: `Remove ${member.full_name}? Any classes they're enrolled in will be dropped (prorated credit returned), and their record will be deleted.`,
      confirmLabel: 'Remove member', danger: true,
    }))) return
    setBusy(true)
    try {
      await removeFamilyMemberFully(user.id, id)
      await refreshUser()
      toast.success(`${member.full_name} removed.`)
      navigate('/members')
    } catch (err) { toast.error(err.message); setBusy(false) }
  }

  if (loading) return <div className="max-w-3xl"><TableSkeleton rows={6} /></div>
  if (!member) return (
    <div className="max-w-3xl">
      <button onClick={() => navigate('/members')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"><ArrowLeft size={15} /> Back to members</button>
      <Card><p className="py-8 text-center text-slate-400 text-sm">Member not found.</p></Card>
    </div>
  )

  if (picking) {
    return (
      <ClassPicker memberName={member.full_name} classes={available} counts={counts} mode="enroll" busy={busy}
        onPick={addClasses} onBack={() => setPicking(false)} />
    )
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/members')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 cursor-pointer transition-colors">
          <ArrowLeft size={15} /> Back to members
        </button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={openEdit}><Pencil size={13} /> Edit</Button>
          <Button variant="outline" size="sm" disabled={busy} className="!text-red-600 hover:!bg-red-50" onClick={removeMember}><Trash2 size={13} /> Remove</Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
        <div className="flex items-center gap-3 mb-2">
          <p className="font-display text-2xl">{member.full_name}</p>
          <Badge variant={ROLE_VARIANT[member.relationship] || 'default'}>{member.relationship}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
          <span className="flex items-center gap-1.5"><Users size={13} className="text-yellow-400" />{family?.family_name}</span>
          {member.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-yellow-400" />{member.phone}</span>}
          {member.date_of_birth && <span className="flex items-center gap-1.5"><Cake size={13} className="text-yellow-400" />{fmtDate(member.date_of_birth)}</span>}
          {member.gender && <span className="flex items-center gap-1.5"><User size={13} className="text-yellow-400" />{GENDER_LABEL[member.gender] || member.gender}</span>}
        </div>
      </div>

      {/* Timetable for the selected semester */}
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <h3 className="font-display text-lg text-slate-900">Timetable</h3>
        <div className="flex items-center gap-2">
          <SemesterPicker semesters={memberSemesters} value={semId} onChange={setSemId} className="w-48" />
          <Button variant="gold" size="sm" disabled={busy || available.length === 0} onClick={() => setPicking(true)}>
            <Plus size={14} /> {available.length ? 'Enroll' : 'No classes available'}
          </Button>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        <ClassScheduleList
          classes={enrolledForSem}
          empty="Not enrolled in any classes this term."
          renderAction={cls => (
            <button onClick={() => removeClass(cls.__enr, cls.name)} disabled={busy}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-40" title="Drop class">
              <X size={15} />
            </button>
          )}
        />
      </Card>

      {pendingForSem.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {pendingForSem.map(e => (
            <span key={e.id} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-3 py-1">
              <Clock size={11} /> {e.classes?.name || 'Class'} · awaiting admin approval
            </span>
          ))}
        </div>
      )}

      {/* Edit modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Member">
        <div className="space-y-4">
          <Input label="Full Name" id="md-name" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role" id="md-role" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="student">Student</option>
              <option value="parent">Parent / Guardian</option>
            </Select>
            <Select label="Gender" id="md-gender" value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" id="md-dob" type="date" value={editForm.date_of_birth} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            <Input label="Phone" id="md-phone" type="tel" placeholder="e.g. 206-555-0100" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !editForm.full_name.trim()} onClick={saveMember}>{busy ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
