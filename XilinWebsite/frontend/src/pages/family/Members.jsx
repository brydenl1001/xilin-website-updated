import { useState, useEffect } from 'react'
import { Plus, ChevronRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getOwnFamily, getOwnEnrollments, familyAddMember } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Input, Select, TableSkeleton } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useFeedback } from '../../context/FeedbackContext'
import { ROLE_VARIANT } from '../../lib/categories'
import { inCurrentSemester } from '../../lib/schedule'
import { personName } from '../../lib/format'

export default function FamilyMembers() {
  const { user, refreshUser } = useAuth()
  const { toast } = useFeedback()
  const [family, setFamily] = useState(null)
  const [counts, setCounts] = useState({}) // memberId -> enrolled class count (current terms)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', role: 'student', gender: '', date_of_birth: '', phone: '' })
  const [addError, setAddError] = useState('')

  const members = (family?.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship }))

  const load = async () => {
    setLoading(true)
    try {
      const fam = await getOwnFamily(user.id)
      setFamily(fam)
      const ms = (fam.family_members || []).map(m => m.profiles).filter(Boolean)
      const entries = await Promise.all(ms.map(async m =>
        [m.id, (await getOwnEnrollments(m.id)).filter(e => e.status === 'enrolled' && inCurrentSemester(e)).length]))
      setCounts(Object.fromEntries(entries))
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user.id])

  const addMember = async () => {
    if (!addForm.first_name.trim()) return
    setBusy(true); setAddError('')
    try {
      await familyAddMember(addForm.first_name.trim(), addForm.last_name.trim(), addForm.role, {
        gender: addForm.gender, date_of_birth: addForm.date_of_birth, phone: addForm.phone,
      })
      setAddOpen(false); setAddForm({ first_name: '', last_name: '', role: 'student', gender: '', date_of_birth: '', phone: '' })
      await refreshUser(); await load()
      toast.success('Member added.')
    } catch (e) {
      setAddError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader title="Members & Classes" subtitle="Manage who's in your family — tap a member for their classes and details"
        action={<Button variant="gold" size="sm" onClick={() => { setAddOpen(true); setAddError('') }}><Plus size={14} /> Add Member</Button>} />

      {loading ? (
        <Card className="!p-0 overflow-hidden"><TableSkeleton rows={3} /></Card>
      ) : members.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-6 text-center">No members yet. Add a parent or student to get started.</p></Card>
      ) : (
        <div className="space-y-3">
          {members.map(m => (
            <Link key={m.id} to={`/members/${m.id}`}>
              <Card className="flex items-center justify-between gap-3 hover:border-yellow-300 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-navy text-yellow-400 font-display flex items-center justify-center flex-shrink-0">
                    {(personName(m) || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 truncate">{personName(m)}</p>
                      <Badge variant={ROLE_VARIANT[m.relationship] || 'default'}>{m.relationship}</Badge>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <BookOpen size={11} /> {counts[m.id] || 0} class{(counts[m.id] || 0) === 1 ? '' : 'es'} this term
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add member */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Family Member">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" id="m-first" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} required />
            <Input label="Last Name" id="m-last" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role" id="m-role" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
              <option value="student">Student</option>
              <option value="parent">Parent / Guardian</option>
            </Select>
            <Select label="Gender" id="m-gender" value={addForm.gender} onChange={e => setAddForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Not specified</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" id="m-dob" type="date" value={addForm.date_of_birth} onChange={e => setAddForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            <Input label="Phone" id="m-phone" type="tel" placeholder="e.g. 206-555-0100" value={addForm.phone} onChange={e => setAddForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <p className="text-xs text-slate-400">Both parents and students can be enrolled in classes. Members don't sign in separately — you manage everything from this family account.</p>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !addForm.first_name.trim()} onClick={addMember}>{busy ? 'Adding…' : 'Add Member'}</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
