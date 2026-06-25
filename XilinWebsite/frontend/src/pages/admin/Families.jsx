import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, X, Mail, Phone, Users, BookOpen, Pencil, Trash2 } from 'lucide-react'
import {
  listFamilies, listClasses, getOwnEnrollments, getOwnPayments,
  createEnrollment, deleteEnrollment, createAccount,
  updateFamilyMember, removeFamilyMemberFully,
} from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'

const ROLE_VARIANT = { parent: 'gold', student: 'success', guardian: 'navy' }
const SORT_OPTIONS = [
  { key: 'family_name', label: 'Family name' },
  { key: 'created_at', label: 'Created' },
]
const fmtTime = (t) => t ? t.slice(0, 5) : ''
const money = (n) => `$${Number(n || 0).toLocaleString()}`

export default function AdminFamilies() {
  const [families, setFamilies] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [fams, cls] = await Promise.all([listFamilies(), listClasses()])
      setFamilies(fams)
      setClasses(cls)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(families, { searchKeys: ['family_name', 'email'], sortOptions: SORT_OPTIONS })

  const selected = families.find(f => f.id === selectedId)

  if (selected) {
    return <FamilyDetail family={selected} classes={classes} onBack={() => setSelectedId(null)} onChanged={load} />
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Families" subtitle="View households, members, classes, and payments" />

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search families..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Family', 'Members', 'Email', 'Phone', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No families yet.</Td></Tr>
            ) : filtered.map(f => (
              <Tr key={f.id} onClick={() => setSelectedId(f.id)}>
                <Td><span className="font-medium text-slate-900">{f.family_name}</span></Td>
                <Td className="text-slate-600">{f.family_members?.length || 0}</Td>
                <Td className="text-slate-500 text-xs">{f.email}</Td>
                <Td className="text-slate-500 text-xs">{f.phone || '—'}</Td>
                <Td><span className="text-xs text-yellow-600">Manage →</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function FamilyDetail({ family, classes, onBack, onChanged }) {
  const members = (family.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship }))
  const [enrollByMember, setEnrollByMember] = useState({})
  const [payByMember, setPayByMember] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', role: 'student' })
  const [addError, setAddError] = useState('')
  const [editMember, setEditMember] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'student' })
  const [editError, setEditError] = useState('')

  const loadMemberData = async () => {
    setLoading(true)
    try {
      const entries = await Promise.all(members.map(async (m) => {
        const [enr, pay] = await Promise.all([getOwnEnrollments(m.id), getOwnPayments(m.id)])
        return [m.id, enr, pay]
      }))
      const e = {}, p = {}
      entries.forEach(([id, enr, pay]) => { e[id] = enr; p[id] = pay })
      setEnrollByMember(e)
      setPayByMember(p)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadMemberData() }, [family.id, family.family_members?.length])

  const addClass = async (memberId, classId) => {
    if (!classId) return
    setBusy(true)
    try {
      await createEnrollment(memberId, classId)
      const enr = await getOwnEnrollments(memberId)
      setEnrollByMember(prev => ({ ...prev, [memberId]: enr }))
    } catch (err) {
      alert(`Could not add class: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const removeClass = async (memberId, enrollmentId) => {
    setBusy(true)
    try {
      await deleteEnrollment(enrollmentId)
      setEnrollByMember(prev => ({ ...prev, [memberId]: (prev[memberId] || []).filter(e => e.id !== enrollmentId) }))
    } catch (err) {
      alert(`Could not remove class: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const addMember = async () => {
    if (!addForm.full_name.trim()) return
    setBusy(true); setAddError('')
    try {
      await createAccount({ kind: 'member', full_name: addForm.full_name.trim(), role: addForm.role, family_id: family.id })
      setAddOpen(false); setAddForm({ full_name: '', role: 'student' })
      await onChanged() // reload families so the new member shows
    } catch (err) {
      setAddError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openEditMember = (m) => {
    setEditMember(m)
    setEditForm({ full_name: m.full_name || '', role: m.relationship === 'student' ? 'student' : 'parent' })
    setEditError('')
  }
  const saveMember = async () => {
    if (!editForm.full_name.trim()) return
    setBusy(true); setEditError('')
    try {
      await updateFamilyMember(family.id, editMember.id, { full_name: editForm.full_name.trim(), role: editForm.role })
      setEditMember(null)
      await onChanged()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const removeMember = async (m) => {
    if (!window.confirm(`Remove ${m.full_name} from this family? Their classes and member record will be permanently deleted.`)) return
    setBusy(true)
    try {
      await removeFamilyMemberFully(family.id, m.id)
      await onChanged()
    } catch (err) {
      alert(`Could not remove member: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }

  const allPayments = Object.values(payByMember).flat()
  const owed = allPayments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)
  const paid = allPayments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const enrolledClassIds = (memberId) => new Set((enrollByMember[memberId] || []).map(e => e.class_id))

  return (
    <div className="max-w-4xl animate-fade-in">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer transition-colors">
        <ArrowLeft size={15} /> Back to families
      </button>

      {/* Family header */}
      <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
        <p className="font-display text-2xl mb-2">{family.family_name}</p>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
          <span className="flex items-center gap-1.5"><Mail size={13} className="text-yellow-400" />{family.email}</span>
          {family.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-yellow-400" />{family.phone}</span>}
          <span className="flex items-center gap-1.5"><Users size={13} className="text-yellow-400" />{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </div>
        <p className="text-[11px] text-white/40 mt-3">Family ID: <span className="font-mono">{family.id}</span></p>
      </div>

      {/* Members + their classes */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-slate-900">Members & Classes</h3>
        <Button size="sm" variant="gold" onClick={() => { setAddOpen(true); setAddError('') }}><Plus size={14} /> Add Member</Button>
      </div>

      {members.length === 0 ? (
        <Card><p className="text-sm text-slate-400 py-4 text-center">No members yet. Add one to get started.</p></Card>
      ) : (
        <div className="space-y-3 mb-6">
          {members.map(m => {
            const enrolled = enrollByMember[m.id] || []
            const taken = enrolledClassIds(m.id)
            const available = classes.filter(c => !taken.has(c.id))
            return (
              <Card key={m.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{m.full_name}</p>
                    <Badge variant={ROLE_VARIANT[m.relationship] || 'default'}>{m.relationship}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditMember(m)} disabled={busy} title="Edit member"
                      className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1 disabled:opacity-40">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => removeMember(m)} disabled={busy} title="Remove member"
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1 disabled:opacity-40">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <p className="text-xs text-slate-400">Loading classes…</p>
                ) : (
                  <>
                    {enrolled.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {enrolled.map(e => (
                          <span key={e.id} className="inline-flex items-center gap-1.5 text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-full pl-3 pr-1.5 py-1">
                            <BookOpen size={11} />
                            {e.classes?.name || e.classes?.courses?.name || 'Class'}
                            {e.classes?.start_time && <span className="text-yellow-500">Sun {fmtTime(e.classes.start_time)}</span>}
                            <button onClick={() => removeClass(m.id, e.id)} disabled={busy}
                              className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-yellow-200 cursor-pointer disabled:opacity-40" title="Remove">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400 mb-3">Not enrolled in any classes.</p>}

                    <div className="flex items-center gap-2">
                      <select disabled={busy || available.length === 0} defaultValue=""
                        onChange={e => { addClass(m.id, e.target.value); e.target.value = '' }}
                        className="text-xs border border-slate-200 rounded-lg px-2 h-8 bg-white outline-none text-slate-600 cursor-pointer disabled:opacity-50 max-w-[260px]">
                        <option value="" disabled>{available.length ? '+ Add a class…' : 'No more classes available'}</option>
                        {available.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.start_time ? ` — Sun ${fmtTime(c.start_time)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Payments */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-slate-900">Payments</h3>
        <div className="flex gap-4 text-sm">
          <span className="text-slate-500">Paid: <span className="font-semibold text-green-600">{money(paid)}</span></span>
          <span className="text-slate-500">Owed: <span className={`font-semibold ${owed > 0 ? 'text-amber-600' : 'text-slate-700'}`}>{money(owed)}</span></span>
        </div>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-8 text-center text-slate-400 text-sm">Loading…</p>
        ) : allPayments.length === 0 ? (
          <p className="py-8 text-center text-slate-400 text-sm">No payment records for this family.</p>
        ) : (
          <Table headers={['Member', 'Description', 'Amount', 'Status', 'Date']}>
            {members.flatMap(m => (payByMember[m.id] || []).map(p => (
              <Tr key={p.id}>
                <Td className="text-slate-700">{m.full_name}</Td>
                <Td className="text-slate-500">{p.fee_structures?.name || '—'}</Td>
                <Td><span className="font-semibold text-slate-900">{money(p.amount)}</span></Td>
                <Td><Badge variant={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'danger'}>{p.status}</Badge></Td>
                <Td className="text-slate-400 text-xs">{p.paid_at?.slice(0, 10) || '—'}</Td>
              </Tr>
            )))}
          </Table>
        )}
      </Card>

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Family Member">
        <div className="space-y-4">
          <Input label="Full Name" id="mn" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Select label="Role" id="mr" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="parent">Parent / Guardian</option>
          </Select>
          <p className="text-xs text-slate-400">Members belong to this family and don't sign in directly — the family logs in with {family.email}.</p>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !addForm.full_name.trim()} onClick={addMember}>{busy ? 'Adding…' : 'Add Member'}</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit member modal */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit Member">
        <div className="space-y-4">
          <Input label="Full Name" id="emn" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Select label="Role" id="emr" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
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
