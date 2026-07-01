import { useState, useEffect } from 'react'
import { Plus, X, BookOpen, Pencil, Trash2, Clock, AlertCircle } from 'lucide-react'
import {
  getOwnFamily, listClasses, getActiveSemester, getOwnEnrollments, getClassCounts,
  enrollMember, dropMember, requestEnrollment,
  familyAddMember, familyUpdateMember, removeFamilyMemberFully,
} from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Input, Select } from '../../components/ui'
import ClassPicker from '../../components/ClassPicker'
import { useAuth } from '../../context/AuthContext'
import { money, fmtTime } from '../../lib/format'

const ROLE_VARIANT = { parent: 'gold', student: 'success', guardian: 'navy' }

// Two classes conflict if same day with overlapping time windows.
const timesOverlap = (a, b) =>
  a?.day_of_week && a.day_of_week === b?.day_of_week &&
  a.start_time && a.end_time && b.start_time && b.end_time &&
  a.start_time < b.end_time && b.start_time < a.end_time

const todayStr = () => new Date().toISOString().slice(0, 10)

export default function FamilyMembers() {
  const { user, refreshUser } = useAuth()
  const [family, setFamily] = useState(null)
  const [classes, setClasses] = useState([])
  const [counts, setCounts] = useState({})
  const [semester, setSemester] = useState(null)
  const [enrollByMember, setEnrollByMember] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', role: 'student' })
  const [addError, setAddError] = useState('')
  const [editMember, setEditMember] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'student' })
  const [editError, setEditError] = useState('')
  const [pickingFor, setPickingFor] = useState(null)

  const members = (family?.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship }))
  const regOpen = !semester?.registration_end || semester.registration_end >= todayStr()
  // Classes families can pick from = the active semester's classes.
  const semesterClasses = semester ? classes.filter(c => c.semester_id === semester.id) : classes

  const loadFamily = async () => {
    const fam = await getOwnFamily(user.id)
    setFamily(fam)
    return fam
  }

  const loadEnrollments = async (fam) => {
    const ms = (fam.family_members || []).map(m => m.profiles).filter(Boolean)
    const entries = await Promise.all(ms.map(async m => [m.id, await getOwnEnrollments(m.id)]))
    const e = {}
    entries.forEach(([id, enr]) => { e[id] = enr })
    setEnrollByMember(e)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [fam, cls, cnt, sem] = await Promise.all([
        getOwnFamily(user.id), listClasses(), getClassCounts(), getActiveSemester(),
      ])
      setFamily(fam); setClasses(cls); setCounts(cnt); setSemester(sem)
      await loadEnrollments(fam)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user.id])

  const refreshAll = async () => {
    const fam = await loadFamily()
    const [cnt] = await Promise.all([getClassCounts().catch(() => counts)])
    setCounts(cnt)
    await loadEnrollments(fam)
    await refreshUser()
  }

  const enrolledOf = (id) => (enrollByMember[id] || []).filter(e => e.status === 'enrolled')
  const pendingOf = (id) => (enrollByMember[id] || []).filter(e => e.status === 'pending')
  const takenIds = (id) => new Set((enrollByMember[id] || []).filter(e => ['enrolled', 'pending'].includes(e.status)).map(e => e.class_id))

  const addClass = async (memberId, classId) => {
    if (!classId) return
    const target = semesterClasses.find(c => c.id === classId)

    // Schedule-conflict warning (non-blocking).
    const conflict = enrolledOf(memberId).map(e => e.classes).find(ec => timesOverlap(ec, target))
    if (conflict && !window.confirm(
      `Heads up: this overlaps with "${conflict.name}" (${conflict.day_of_week} ${fmtTime(conflict.start_time)}). Continue anyway?`
    )) return

    setBusy(true)
    try {
      if (regOpen) {
        await enrollMember(memberId, classId)
      } else {
        if (!window.confirm('Registration has closed for this semester. Send this as a request for an admin to approve?')) {
          setBusy(false); return
        }
        await requestEnrollment(memberId, classId)
      }
      await refreshAll()
    } catch (err) {
      // If the server blocked a direct enroll because registration closed, offer the request path.
      if (/registration has closed/i.test(err.message) &&
          window.confirm('Registration has closed. Send this as a request for an admin to approve instead?')) {
        try { await requestEnrollment(memberId, classId); await refreshAll() }
        catch (e2) { alert(e2.message) }
      } else {
        alert(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  const removeClass = async (enrollmentId, className) => {
    if (!window.confirm(`Drop "${className}"? Any prorated credit will be returned to your family balance.`)) return
    setBusy(true)
    try {
      const res = await dropMember(enrollmentId)
      await refreshAll()
      alert(`Dropped. Credit returned: ${money(res.credit)}.`)
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const addMember = async () => {
    if (!addForm.full_name.trim()) return
    setBusy(true); setAddError('')
    try {
      await familyAddMember(addForm.full_name.trim(), addForm.role)
      setAddOpen(false); setAddForm({ full_name: '', role: 'student' })
      await refreshAll()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openEdit = (m) => {
    setEditMember(m)
    setEditForm({ full_name: m.full_name || '', role: m.relationship === 'parent' ? 'parent' : 'student' })
    setEditError('')
  }
  const saveMember = async () => {
    if (!editForm.full_name.trim()) return
    setBusy(true); setEditError('')
    try {
      await familyUpdateMember(editMember.id, { full_name: editForm.full_name.trim(), role: editForm.role })
      setEditMember(null)
      await refreshAll()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const removeMember = async (m) => {
    if (!window.confirm(`Remove ${m.full_name}? Any classes they're enrolled in will be dropped (prorated credit returned), and their record will be deleted.`)) return
    setBusy(true)
    try {
      await removeFamilyMemberFully(user.id, m.id)
      await refreshAll()
    } catch (err) {
      alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (pickingFor) {
    const taken = takenIds(pickingFor.id)
    const available = semesterClasses.filter(c => !taken.has(c.id))
    return (
      <ClassPicker
        memberName={pickingFor.full_name}
        classes={available}
        counts={counts}
        mode={regOpen ? 'enroll' : 'request'}
        busy={busy}
        onPick={(classId) => addClass(pickingFor.id, classId)}
        onBack={() => setPickingFor(null)}
      />
    )
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader title="Members & Classes" subtitle="Manage who's in your family and the classes they take"
        action={<Button variant="gold" size="sm" onClick={() => { setAddOpen(true); setAddError('') }}><Plus size={14} /> Add Member</Button>} />

      {!regOpen && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-800 flex items-start gap-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          Registration has closed for {semester?.name}. New classes can still be requested, but an admin must approve them.
        </div>
      )}

      {loading ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">Loading…</p></Card>
      ) : members.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No members yet. Add a parent or student to get started.</p></Card>
      ) : (
        <div className="space-y-3">
          {members.map(m => {
            const enrolled = enrolledOf(m.id)
            const pending = pendingOf(m.id)
            const taken = takenIds(m.id)
            const available = semesterClasses.filter(c => !taken.has(c.id))
            return (
              <Card key={m.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{m.full_name}</p>
                    <Badge variant={ROLE_VARIANT[m.relationship] || 'default'}>{m.relationship}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(m)} disabled={busy} title="Edit member"
                      className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1 disabled:opacity-40"><Pencil size={14} /></button>
                    <button onClick={() => removeMember(m)} disabled={busy} title="Remove member"
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1 disabled:opacity-40"><Trash2 size={14} /></button>
                  </div>
                </div>

                {enrolled.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {enrolled.map(e => (
                      <span key={e.id} className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full pl-3 pr-1.5 py-1">
                        <BookOpen size={11} />
                        {e.classes?.name || e.classes?.courses?.name || 'Class'}
                        {e.classes?.day_of_week && <span className="text-yellow-600">{e.classes.day_of_week.slice(0,3)} {fmtTime(e.classes.start_time)}</span>}
                        <button onClick={() => removeClass(e.id, e.classes?.name || 'class')} disabled={busy}
                          className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-yellow-200 cursor-pointer disabled:opacity-40" title="Drop class"><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                ) : <p className="text-xs text-slate-400 mb-2">Not enrolled in any classes.</p>}

                {pending.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {pending.map(e => (
                      <span key={e.id} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 border border-slate-200 text-slate-500 rounded-full px-3 py-1">
                        <Clock size={11} />
                        {e.classes?.name || 'Class'} · awaiting admin approval
                      </span>
                    ))}
                  </div>
                )}

                <Button variant="outline" size="sm" disabled={busy || available.length === 0} onClick={() => setPickingFor(m)}>
                  <Plus size={13} /> {available.length ? (regOpen ? 'Enroll in a class' : 'Request a class') : 'No classes available'}
                </Button>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add member */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Family Member">
        <div className="space-y-4">
          <Input label="Full Name" id="m-name" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Select label="Role" id="m-role" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="parent">Parent / Guardian</option>
          </Select>
          <p className="text-xs text-slate-400">Both parents and students can be enrolled in classes. Members don't sign in separately — you manage everything from this family account.</p>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !addForm.full_name.trim()} onClick={addMember}>{busy ? 'Adding…' : 'Add Member'}</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit member */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit Member">
        <div className="space-y-4">
          <Input label="Full Name" id="em-name" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Select label="Role" id="em-role" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="parent">Parent / Guardian</option>
          </Select>
          {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !editForm.full_name.trim()} onClick={saveMember}>{busy ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditMember(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
