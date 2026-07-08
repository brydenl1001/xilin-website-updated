import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, X, Mail, Phone, Users, BookOpen, Pencil, Trash2, Wallet, Hash, ExternalLink } from 'lucide-react'
import {
  listFamilies, listClasses, getEnrollmentsForMembers, listBalanceTransactions,
  enrollMember, dropMember, recordPayment, createAccount, getClassCounts,
  updateFamilyMember, removeFamilyMemberFully,
  approvePendingEnrollment, rejectPendingEnrollment,
} from '../../lib/supabaseClient'

import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, ListToolbar, TableSkeleton } from '../../components/ui'
import ClassPicker from '../../components/ClassPicker'
import LedgerDetail from '../../components/LedgerDetail'
import { useListControls } from '../../hooks/useListControls'
import { money } from '../../lib/format'
import { ROLE_VARIANT } from '../../lib/categories'
import { timesOverlap } from '../../lib/schedule'
import { useFeedback } from '../../context/FeedbackContext'

const METHOD_LABEL = { enrollment: 'Enrollment', drop_credit: 'Drop credit', cash: 'Cash payment', online: 'Online payment', adjustment: 'Adjustment' }
const SORT_OPTIONS = [
  { key: 'family_name', label: 'Family name' },
  { key: 'balance', label: 'Balance (who owes)' },
  { key: 'family_code', label: 'Family ID' },
  { key: 'created_at', label: 'Created' },
]

export default function AdminFamilies() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [families, setFamilies] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [counts, setCounts] = useState({})
  const load = async () => {
    setLoading(true)
    try {
      const [fams, cls, cnt] = await Promise.all([listFamilies(), listClasses(), getClassCounts()])
      setFamilies(fams)
      setClasses(cls)
      setCounts(cnt)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(families, { searchKeys: ['family_name', 'email', 'family_code'], sortOptions: SORT_OPTIONS })

  const selected = families.find(f => f.id === id)
  if (id) {
    if (loading) return <div className="max-w-5xl"><Card className="!p-0 overflow-hidden"><TableSkeleton rows={6} /></Card></div>
    if (selected) {
      return <FamilyDetail family={selected} classes={classes} counts={counts} onBack={() => navigate('/families')} onChanged={load} />
    }
    return (
      <div className="max-w-5xl">
        <button onClick={() => navigate('/families')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"><ArrowLeft size={15} /> Back to families</button>
        <Card><p className="py-8 text-center text-slate-400 text-sm">Family not found.</p></Card>
      </div>
    )
  }

  const owingCount = families.filter(f => Number(f.balance) < 0).length

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Families" subtitle="Households, members, classes, and balances" />

      {owingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-800">
          {owingCount} famil{owingCount === 1 ? 'y has' : 'ies have'} an outstanding balance. Sort by “Balance (who owes)” to review.
        </div>
      )}

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search name, email, or Family ID..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Family', 'ID', 'Members', 'Balance', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No families yet.</Td></Tr>
            ) : filtered.map(f => {
              const owes = Number(f.balance) < 0
              return (
                <Tr key={f.id} onClick={() => navigate(`/families/${f.id}`)}>
                  <Td>
                    <p className="font-medium text-slate-900">{f.family_name}</p>
                    <p className="text-xs text-slate-400">{f.email}</p>
                  </Td>
                  <Td><span className="font-mono text-xs text-slate-500">{f.family_code || '—'}</span></Td>
                  <Td className="text-slate-600">{f.family_members?.length || 0}</Td>
                  <Td><span className={`font-medium ${owes ? 'text-red-600' : 'text-slate-700'}`}>{money(f.balance)}{owes && ' owed'}</span></Td>
                  <Td><span className="text-xs text-yellow-600">Manage →</span></Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function FamilyDetail({ family, classes, counts = {}, onBack, onChanged }) {
  const { toast, confirm } = useFeedback()
  const members = (family.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship }))
  const [enrollByMember, setEnrollByMember] = useState({})
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ full_name: '', role: 'student' })
  const [addError, setAddError] = useState('')
  const [editMember, setEditMember] = useState(null)
  const [editForm, setEditForm] = useState({ full_name: '', role: 'student' })
  const [editError, setEditError] = useState('')
  const [payOpen, setPayOpen] = useState(false)
  const [pickingFor, setPickingFor] = useState(null)
  const [payForm, setPayForm] = useState({ amount: '', note: '' })
  const [payError, setPayError] = useState('')

  const balance = Number(family.balance || 0)
  const owes = balance < 0

  const reload = async () => {
    setLoading(true)
    try {
      const [enrollMap, txns] = await Promise.all([
        getEnrollmentsForMembers(members.map(m => m.id)),
        listBalanceTransactions(family.id),
      ])
      setEnrollByMember(enrollMap)
      setLedger(txns)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, [family.id, family.family_members?.length])

  // After any balance-affecting op: refresh the families list (header balance) + local data.
  const refreshAll = async () => { await onChanged(); await reload() }

  const addClasses = async (memberId, classIds) => {
    if (!classIds?.length) return
    setBusy(true)
    const localEnrolled = (enrollByMember[memberId] || [])
      .filter(e => e.status === 'enrolled').map(e => e.classes)
    let enrolledCount = 0
    const failures = []
    for (const classId of classIds) {
      const target = classes.find(c => c.id === classId)
      const conflict = localEnrolled.find(ec => timesOverlap(ec, target))
      if (conflict && !(await confirm({
        title: 'Schedule conflict',
        message: `"${target?.name}" overlaps with "${conflict.name}" (${conflict.day_of_week} ${fmtTime(conflict.start_time)}). Enroll anyway?`,
        confirmLabel: 'Enroll anyway',
      }))) continue
      try {
        await enrollMember(memberId, classId)
        enrolledCount++
        if (target) localEnrolled.push(target)
      } catch (err) {
        failures.push(`${target?.name || 'class'}: ${err.message}`)
      }
    }
    await refreshAll()
    setBusy(false)
    setPickingFor(null)
    if (enrolledCount) toast.success(`Enrolled in ${enrolledCount} class${enrolledCount === 1 ? '' : 'es'}.`)
    if (failures.length) toast.error(failures.join(' · '))
  }

  const approveRequest = async (enrollmentId) => {
    setBusy(true)
    try { await approvePendingEnrollment(enrollmentId); await refreshAll(); toast.success('Request approved and enrolled.') }
    catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }
  const rejectRequest = async (enrollmentId) => {
    if (!(await confirm({ title: 'Reject request', message: 'Reject this class request?', confirmLabel: 'Reject', danger: true }))) return
    setBusy(true)
    try { await rejectPendingEnrollment(enrollmentId); await refreshAll(); toast.success('Request rejected.') }
    catch (err) { toast.error(err.message) }
    finally { setBusy(false) }
  }

  const removeClass = async (memberId, enrollmentId, className) => {
    if (!(await confirm({
      title: 'Drop class',
      message: `Drop "${className}"? Any prorated credit will be returned to the family balance.`,
      confirmLabel: 'Drop class', danger: true,
    }))) return
    setBusy(true)
    try {
      const res = await dropMember(enrollmentId)
      await refreshAll()
      toast.success(`Dropped. Credit returned: ${money(res.credit)}.`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitPayment = async () => {
    const amt = Number(payForm.amount)
    if (!amt || amt <= 0) { setPayError('Enter a positive amount.'); return }
    setBusy(true); setPayError('')
    try {
      await recordPayment(family.id, amt, 'cash', payForm.note.trim() || 'Cash payment at front office')
      setPayOpen(false); setPayForm({ amount: '', note: '' })
      await refreshAll()
    } catch (err) {
      setPayError(err.message)
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
      await onChanged()
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
    if (!(await confirm({
      title: 'Remove member',
      message: `Remove ${m.full_name} from this family? Any enrolled classes will be dropped (prorated credit returned) and their record permanently deleted.`,
      confirmLabel: 'Remove member', danger: true,
    }))) return
    setBusy(true)
    try {
      await removeFamilyMemberFully(family.id, m.id)
      await refreshAll()
      toast.success(`${m.full_name} removed.`)
    } catch (err) {
      toast.error(`Could not remove member: ${err.message}`)
    } finally {
      setBusy(false)
    }
  }


  if (pickingFor) {
    const taken = new Set((enrollByMember[pickingFor.id] || []).filter(e => ['enrolled', 'pending'].includes(e.status)).map(e => e.class_id))
    const available = classes.filter(c => !taken.has(c.id))
    return (
      <ClassPicker
        memberName={pickingFor.full_name}
        classes={available}
        counts={counts}
        mode="enroll"
        busy={busy}
        onPick={(classIds) => addClasses(pickingFor.id, classIds)}
        onBack={() => setPickingFor(null)}
      />
    )
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer transition-colors">
        <ArrowLeft size={15} /> Back to families
      </button>

      {/* Family header */}
      <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-display text-2xl mb-2">{family.family_name}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><Hash size={13} className="text-yellow-400" />ID {family.family_code || '—'}</span>
              <span className="flex items-center gap-1.5"><Mail size={13} className="text-yellow-400" />{family.email}</span>
              {family.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-yellow-400" />{family.phone}</span>}
              <span className="flex items-center gap-1.5"><Users size={13} className="text-yellow-400" />{members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-widest text-white/40 mb-0.5">{owes ? 'Outstanding Balance' : 'Account Balance'}</p>
            <p className={`font-display text-3xl ${owes ? 'text-red-300' : 'text-yellow-400'}`}>{money(balance)}</p>
            <Button size="sm" variant="gold" className="mt-2" onClick={() => { setPayOpen(true); setPayError('') }}><Wallet size={13} /> Record Payment</Button>
          </div>
        </div>
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
            const enrolled = (enrollByMember[m.id] || []).filter(e => e.status === 'enrolled')
            const pending = (enrollByMember[m.id] || []).filter(e => e.status === 'pending')
            const taken = new Set([...enrolled, ...pending].map(e => e.class_id))
            const available = classes.filter(c => !taken.has(c.id))
            return (
              <Card key={m.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900">{m.full_name}</p>
                    <Badge variant={ROLE_VARIANT[m.relationship] || 'default'}>{m.relationship}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Link to={`/users/${m.id}`}><Button variant="outline" size="sm" className="!border-yellow-300 !text-yellow-800 hover:!bg-yellow-50"><ExternalLink size={13} className="text-yellow-600" /> View</Button></Link>
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
                            {e.price_charged != null && <span className="text-yellow-600">{money(e.price_charged)}</span>}
                            <button onClick={() => removeClass(m.id, e.id, e.classes?.name || 'class')} disabled={busy}
                              className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-yellow-200 cursor-pointer disabled:opacity-40" title="Drop class">
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : <p className="text-xs text-slate-400 mb-3">Not enrolled in any classes.</p>}

                    {pending.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {pending.map(e => (
                          <span key={e.id} className="inline-flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-full pl-3 pr-1.5 py-1">
                            <span>Request: {e.classes?.name || 'Class'}{e.price_charged != null ? ` · ${money(e.price_charged)}` : ''}</span>
                            <button onClick={() => approveRequest(e.id)} disabled={busy}
                              className="px-1.5 rounded-full bg-green-100 text-green-700 hover:bg-green-200 cursor-pointer disabled:opacity-40" title="Approve">Approve</button>
                            <button onClick={() => rejectRequest(e.id)} disabled={busy}
                              className="px-1.5 rounded-full bg-red-100 text-red-600 hover:bg-red-200 cursor-pointer disabled:opacity-40" title="Reject">Reject</button>
                          </span>
                        ))}
                      </div>
                    )}

                    <Button variant="outline" size="sm" disabled={busy || available.length === 0} onClick={() => setPickingFor(m)}>
                      <Plus size={13} /> {available.length ? 'Enroll in a class' : 'No more classes available'}
                    </Button>
                  </>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Balance ledger */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-slate-900">Balance History</h3>
        <span className="text-xs text-slate-400">Immutable audit trail</span>
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={4} />
        ) : ledger.length === 0 ? (
          <p className="py-8 text-center text-slate-400 text-sm">No transactions yet.</p>
        ) : (
          <Table headers={['Date', 'Type', 'Detail', 'By', 'Amount']}>
            {ledger.map(t => (
              <Tr key={t.id}>
                <Td className="text-slate-400 text-xs whitespace-nowrap">{t.created_at?.slice(0, 10)}</Td>
                <Td className="text-slate-700">{METHOD_LABEL[t.method] || t.method}</Td>
                <Td className="text-slate-500 text-xs"><LedgerDetail t={t} memberTo={(mid) => `/users/${mid}`} /></Td>
                <Td className="text-slate-400 text-xs">{t.created_by_name || 'System'}</Td>
                <Td><span className={`font-semibold ${Number(t.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(t.amount)}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Record payment modal */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Add a cash payment received at the front office. This credits the family balance and is recorded in the ledger.</p>
          <Input label="Amount ($)" id="payamt" type="number" placeholder="e.g. 320" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} required />
          <Input label="Note (optional)" id="paynote" placeholder="e.g. Check #1234" value={payForm.note} onChange={e => setPayForm(f => ({ ...f, note: e.target.value }))} />
          {payError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy} onClick={submitPayment}>{busy ? 'Recording…' : 'Record Payment'}</Button>
            <Button variant="outline" size="sm" onClick={() => setPayOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Family Member">
        <div className="space-y-4">
          <Input label="Full Name" id="mn" value={addForm.full_name} onChange={e => setAddForm(f => ({ ...f, full_name: e.target.value }))} required />
          <Select label="Role" id="mr" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="parent">Parent / Guardian</option>
          </Select>
          <p className="text-xs text-slate-400">Members belong to this family and don't sign in directly — the family logs in with its own account.</p>
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
