import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, X, Mail, Phone, Users, BookOpen, Pencil, Trash2, Wallet, Hash, ExternalLink, Power, Check, CheckCircle2, SlidersHorizontal } from 'lucide-react'
import {
  listFamilies, listClasses, getEnrollmentsForMembers, listBalanceTransactions,
  enrollMember, dropMember, payEnrollments, adjustCredit, ADJUST_REASONS, getFamilyOwedMap,
  createAccount, getClassCounts,
  updateFamilyMember, removeFamilyMemberFully, updateFamily, setAccountActive,
  approvePendingEnrollment, rejectPendingEnrollment,
} from '../../lib/supabaseClient'

import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, ListToolbar, TableSkeleton } from '../../components/ui'
import ClassPicker from '../../components/ClassPicker'
import LedgerDetail from '../../components/LedgerDetail'
import { useListControls } from '../../hooks/useListControls'
import { money, fmtTime, personName } from '../../lib/format'
import { ROLE_VARIANT } from '../../lib/categories'
import { timesOverlap } from '../../lib/schedule'
import { useFeedback } from '../../context/FeedbackContext'

const METHOD_LABEL = {
  class_payment: 'Class payment', online: 'Card payment', cash: 'Cash payment',
  drop_credit: 'Drop credit', class_credit: 'Refund to credit', adjustment: 'Adjustment',
  material_purchase: 'Material purchase',
}
const SORT_OPTIONS = [
  { key: 'family_name', label: 'Family name' },
  { key: 'owed', label: 'Owed (who owes)' },
  { key: 'credit', label: 'Credit' },
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
  const [statusFilter, setStatusFilter] = useState('active')

  const [counts, setCounts] = useState({})
  const [owedMap, setOwedMap] = useState({})
  const load = async () => {
    setLoading(true)
    try {
      const [fams, cls, cnt, owed] = await Promise.all([listFamilies(), listClasses(), getClassCounts(), getFamilyOwedMap()])
      setFamilies(fams)
      setClasses(cls)
      setCounts(cnt)
      setOwedMap(owed)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const withOwed = families.map(f => ({ ...f, owed: owedMap[f.id]?.owed || 0, credit: Number(f.credit || 0) }))
  const statusFamilies = statusFilter === 'all' ? withOwed
    : statusFilter === 'inactive' ? withOwed.filter(f => f.status === 'inactive')
    : withOwed.filter(f => f.status !== 'inactive')
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(statusFamilies, { searchKeys: ['family_name', 'email', 'family_code'], sortOptions: SORT_OPTIONS })

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

  const owingCount = withOwed.filter(f => f.owed > 0).length

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Families" subtitle="Households, members, classes, and balances" />

      {owingCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 text-sm text-amber-800">
          {owingCount} famil{owingCount === 1 ? 'y has' : 'ies have'} unpaid classes. Sort by “Owed (who owes)” to review.
        </div>
      )}

      <div className="flex items-center gap-1.5 mb-3">
        {['active', 'inactive', 'all'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors cursor-pointer ${statusFilter === s ? 'bg-navy text-white border-navy' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search name, email, or Family ID..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Family', 'ID', 'Members', 'Owed', 'Credit', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No families yet.</Td></Tr>
            ) : filtered.map(f => (
              <Tr key={f.id} onClick={() => navigate(`/families/${f.id}`)}>
                <Td>
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    {f.family_name}
                    {f.status === 'inactive' && <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">Inactive</span>}
                  </p>
                  <p className="text-xs text-slate-400">{f.email}</p>
                </Td>
                <Td><span className="font-mono text-xs text-slate-500">{f.family_code || '—'}</span></Td>
                <Td className="text-slate-600">{f.family_members?.length || 0}</Td>
                <Td><span className={`font-medium ${f.owed > 0 ? 'text-red-600' : 'text-slate-400'}`}>{f.owed > 0 ? money(f.owed) : '—'}</span></Td>
                <Td><span className={`font-medium ${f.credit > 0 ? 'text-green-700' : 'text-slate-400'}`}>{f.credit > 0 ? money(f.credit) : '—'}</span></Td>
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
function FamilyDetail({ family, classes, counts = {}, onBack, onChanged }) {
  const { toast, confirm } = useFeedback()
  const members = (family.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship }))
  const [enrollByMember, setEnrollByMember] = useState({})
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ first_name: '', last_name: '', role: 'student' })
  const [addError, setAddError] = useState('')
  const [editMember, setEditMember] = useState(null)
  const [editForm, setEditForm] = useState({ first_name: '', last_name: '', role: 'student' })
  const [editError, setEditError] = useState('')
  const [pickingFor, setPickingFor] = useState(null)

  // Record payment (cash, allocated to selected classes)
  const [payOpen, setPayOpen] = useState(false)
  const [paySel, setPaySel] = useState(() => new Set())
  const [payNote, setPayNote] = useState('')
  const [payDate, setPayDate] = useState('')
  const [payError, setPayError] = useState('')

  // Manual credit adjustment
  const [adjOpen, setAdjOpen] = useState(false)
  const [adjForm, setAdjForm] = useState({ amount: '', reason: ADJUST_REASONS[0], note: '', date: '' })
  const [adjError, setAdjError] = useState('')

  const [famEditOpen, setFamEditOpen] = useState(false)
  const [famForm, setFamForm] = useState({ family_name: '', phone: '', street: '', city: '', state: '', postal_code: '', country: '' })
  const [famError, setFamError] = useState('')

  const today = () => new Date().toISOString().slice(0, 10)
  const toISO = (d) => d ? new Date(d + 'T12:00:00').toISOString() : null

  const credit = Math.max(0, Number(family.credit || 0))
  // Owed = unpaid enrolled classes in active status, across all members.
  const unpaidList = members.flatMap(m =>
    (enrollByMember[m.id] || [])
      .filter(e => e.status === 'enrolled' && !e.paid && e.classes?.status === 'active')
      .map(e => ({ ...e, memberName: personName(m) }))
  )
  const owed = unpaidList.reduce((s, e) => s + Number(e.price_charged || 0), 0)
  const familyActive = family.status !== 'inactive'

  const openPayment = () => {
    setPaySel(new Set(unpaidList.map(e => e.id)))
    setPayNote(''); setPayDate(today()); setPayError(''); setPayOpen(true)
  }
  const openAdjust = () => {
    setAdjForm({ amount: '', reason: ADJUST_REASONS[0], note: '', date: today() })
    setAdjError(''); setAdjOpen(true)
  }
  const togglePaySel = (id) => setPaySel(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

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
      message: `Drop "${className}"? If the class was paid for, a prorated amount is returned to the family's credit balance.`,
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
    const ids = unpaidList.filter(e => paySel.has(e.id)).map(e => e.id)
    if (!ids.length) { setPayError('Select at least one class.'); return }
    setBusy(true); setPayError('')
    try {
      const res = await payEnrollments(family.id, ids, 'cash', payNote.trim() || null, toISO(payDate))
      setPayOpen(false)
      await refreshAll()
      toast.success(`Paid ${money(res.total)} — ${money(res.credit_used)} from credit, ${money(res.cash_received)} cash received.`)
    } catch (err) {
      setPayError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const submitAdjust = async () => {
    const amt = Number(adjForm.amount)
    if (!amt || amt === 0) { setAdjError('Enter a non-zero amount. Use a minus sign (e.g. -50) to subtract credit.'); return }
    if (adjForm.reason === 'Other' && !adjForm.note.trim()) { setAdjError('A note is required when the reason is Other.'); return }
    setBusy(true); setAdjError('')
    try {
      await adjustCredit(family.id, amt, adjForm.reason, adjForm.note.trim() || null, toISO(adjForm.date))
      setAdjOpen(false)
      await refreshAll()
      toast.success('Credit adjusted.')
    } catch (err) {
      setAdjError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const addMember = async () => {
    if (!addForm.first_name.trim()) return
    setBusy(true); setAddError('')
    try {
      await createAccount({
        kind: 'member', first_name: addForm.first_name.trim(), last_name: addForm.last_name.trim(),
        role: addForm.role, family_id: family.id,
      })
      setAddOpen(false); setAddForm({ first_name: '', last_name: '', role: 'student' })
      await onChanged()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openEditMember = (m) => {
    setEditMember(m)
    setEditForm({
      first_name: m.first_name || '', last_name: m.last_name || '',
      role: m.relationship === 'student' ? 'student' : 'parent',
      phone: m.phone || '', date_of_birth: m.date_of_birth || '', gender: m.gender || '',
    })
    setEditError('')
  }
  const saveMember = async () => {
    if (!editForm.first_name.trim()) return
    setBusy(true); setEditError('')
    try {
      await updateFamilyMember(family.id, editMember.id, {
        first_name: editForm.first_name.trim(), last_name: editForm.last_name.trim(), role: editForm.role,
        phone: editForm.phone.trim() || null, date_of_birth: editForm.date_of_birth || null, gender: editForm.gender || null,
      })
      setEditMember(null)
      await onChanged()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const openFamilyEdit = () => {
    setFamForm({
      family_name: family.family_name || '', phone: family.phone || '',
      street: family.street || '', city: family.city || '', state: family.state || '',
      postal_code: family.postal_code || '', country: family.country || '',
    })
    setFamError(''); setFamEditOpen(true)
  }
  const saveFamily = async () => {
    if (!famForm.family_name.trim()) { setFamError('Family name is required.'); return }
    setBusy(true); setFamError('')
    try {
      await updateFamily(family.id, {
        family_name: famForm.family_name.trim(), phone: famForm.phone.trim() || null,
        street: famForm.street.trim() || null, city: famForm.city.trim() || null, state: famForm.state.trim() || null,
        postal_code: famForm.postal_code.trim() || null, country: famForm.country.trim() || null,
      })
      setFamEditOpen(false)
      toast.success('Family updated.')
      await onChanged()
    } catch (err) {
      setFamError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const toggleFamilyActive = async () => {
    const next = !familyActive
    if (!next && !(await confirm({
      title: 'Deactivate family',
      message: `Deactivate ${family.family_name}? They'll be signed out and unable to log in. Members, balance, and history are kept and can be reactivated anytime.`,
      confirmLabel: 'Deactivate', danger: true,
    }))) return
    setBusy(true)
    try {
      await setAccountActive(family.id, next)
      toast.success(next ? 'Family reactivated.' : 'Family deactivated.')
      await onChanged()
      if (!next) onBack()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }
  const removeMember = async (m) => {
    if (!(await confirm({
      title: 'Remove member',
      message: `Remove ${personName(m)} from this family? Any enrolled classes will be dropped (prorated credit returned) and their record permanently deleted.`,
      confirmLabel: 'Remove member', danger: true,
    }))) return
    setBusy(true)
    try {
      await removeFamilyMemberFully(family.id, m.id)
      await refreshAll()
      toast.success(`${personName(m)} removed.`)
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
        memberName={personName(pickingFor)}
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
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <p className="font-display text-2xl">{family.family_name}</p>
              {!familyActive && <span className="text-[11px] uppercase tracking-wide text-white/60 border border-white/25 rounded px-1.5 py-0.5">Inactive</span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
              <span className="flex items-center gap-1.5"><Hash size={13} className="text-yellow-400" />ID {family.family_code || '—'}</span>
              <span className="flex items-center gap-1.5"><Mail size={13} className="text-yellow-400" />{family.email}</span>
              {family.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-yellow-400" />{family.phone}</span>}
              <span className="flex items-center gap-1.5"><Users size={13} className="text-yellow-400" />{members.length} member{members.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex gap-6 justify-end">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-0.5">Owed</p>
                <p className={`font-display text-3xl ${owed > 0 ? 'text-red-300' : 'text-white/50'}`}>{money(owed)}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-0.5">Credit</p>
                <p className="font-display text-3xl text-yellow-400">{money(credit)}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-2 flex-wrap">
              <Button size="sm" variant="gold" disabled={unpaidList.length === 0} onClick={openPayment}><Wallet size={13} /> Record Payment</Button>
              <Button size="sm" variant="outline" disabled={busy} className="!border-white/20 !text-white hover:!bg-white/10" onClick={openAdjust}><SlidersHorizontal size={13} /> Adjust Credit</Button>
              <Button size="sm" variant="outline" disabled={busy} className="!border-white/20 !text-white hover:!bg-white/10" onClick={openFamilyEdit}><Pencil size={13} /> Edit</Button>
              <Button size="sm" variant="outline" disabled={busy}
                className={familyActive ? '!border-red-400/40 !text-red-300 hover:!bg-red-400/10' : '!border-green-400/40 !text-green-300 hover:!bg-green-400/10'}
                onClick={toggleFamilyActive}><Power size={13} /> {familyActive ? 'Deactivate' : 'Reactivate'}</Button>
            </div>
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
                    <p className="font-medium text-slate-900">{personName(m)}</p>
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
                        {enrolled.map(e => {
                          const inactive = e.classes?.status && e.classes.status !== 'active'
                          const chipStyle = e.paid
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : inactive ? 'bg-slate-50 border-slate-200 text-slate-500'
                            : 'bg-amber-50 border-amber-200 text-amber-800'
                          return (
                            <span key={e.id} className={`inline-flex items-center gap-1.5 text-xs border rounded-full pl-3 pr-1.5 py-1 ${chipStyle}`}>
                              {e.paid ? <CheckCircle2 size={11} /> : <BookOpen size={11} />}
                              {e.classes?.name || e.classes?.courses?.name || 'Class'}
                              {e.price_charged != null && <span className="opacity-70">{money(e.price_charged)}</span>}
                              <span className={`font-semibold uppercase text-[9px] tracking-wide ${e.paid ? 'text-green-600' : inactive ? 'text-slate-400' : 'text-amber-600'}`}>
                                {e.paid ? 'Paid' : inactive ? e.classes.status : 'Unpaid'}
                              </span>
                              <button onClick={() => removeClass(m.id, e.id, e.classes?.name || 'class')} disabled={busy}
                                className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full hover:bg-black/10 cursor-pointer disabled:opacity-40" title="Drop class">
                                <X size={11} />
                              </button>
                            </span>
                          )
                        })}
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
                <Td className="text-slate-700">{METHOD_LABEL[t.method] || t.method}{t.reason ? <span className="text-slate-400 text-xs"> — {t.reason}</span> : null}</Td>
                <Td className="text-slate-500 text-xs"><LedgerDetail t={t} memberTo={(mid) => `/users/${mid}`} /></Td>
                <Td className="text-slate-400 text-xs">{t.created_by_name || 'System'}</Td>
                <Td><span className={`font-semibold ${Number(t.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(t.amount)}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Record payment modal — select classes, cash covers what credit doesn't */}
      <Modal open={payOpen} onClose={() => setPayOpen(false)} title="Record Payment">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Select the classes being paid for. Family credit is applied first; the remainder is recorded as cash received at the front office.</p>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {unpaidList.map(e => {
              const isSel = paySel.has(e.id)
              return (
                <button key={e.id} type="button" onClick={() => togglePaySel(e.id)}
                  className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center border transition-colors ${isSel ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'border-slate-300 text-transparent'}`}>
                      <Check size={12} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm text-slate-900 truncate">{e.classes?.name || 'Class'}</span>
                      <span className="block text-[11px] text-slate-400">{e.memberName}</span>
                    </span>
                  </span>
                  <span className="text-sm font-medium text-slate-700 flex-shrink-0">{money(e.price_charged)}</span>
                </button>
              )
            })}
          </div>

          {(() => {
            const total = unpaidList.filter(e => paySel.has(e.id)).reduce((s, e) => s + Number(e.price_charged || 0), 0)
            const fromCredit = Math.min(credit, total)
            const cashDue = Math.round((total - fromCredit) * 100) / 100
            return (
              <div className="bg-slate-50 rounded-lg px-3 py-2 text-xs text-slate-600 space-y-0.5">
                <p>Total: <span className="font-semibold">{money(total)}</span></p>
                {fromCredit > 0 && <p>From credit: <span className="font-semibold text-green-700">{money(fromCredit)}</span></p>}
                <p>Cash to collect: <span className="font-semibold text-slate-900">{money(cashDue)}</span></p>
              </div>
            )
          })()}

          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" id="paydate" type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            <Input label="Note (optional)" id="paynote" placeholder="e.g. Check #1234" value={payNote} onChange={e => setPayNote(e.target.value)} />
          </div>
          {payError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || paySel.size === 0} onClick={submitPayment}>{busy ? 'Saving…' : 'Record Payment'}</Button>
            <Button variant="outline" size="sm" onClick={() => setPayOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Adjust credit modal */}
      <Modal open={adjOpen} onClose={() => setAdjOpen(false)} title="Adjust Credit">
        <div className="space-y-4">
          <p className="text-sm text-slate-500">Manually add or subtract account credit — e.g. refunding credit externally, correcting an error, or granting credit. A positive amount adds credit; a negative amount (e.g. −50) subtracts.</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount ($)" id="adjamt" type="number" placeholder="e.g. -50 or 100" value={adjForm.amount} onChange={e => setAdjForm(f => ({ ...f, amount: e.target.value }))} required />
            <Select label="Reason" id="adjreason" value={adjForm.reason} onChange={e => setAdjForm(f => ({ ...f, reason: e.target.value }))}>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" id="adjdate" type="date" value={adjForm.date} onChange={e => setAdjForm(f => ({ ...f, date: e.target.value }))} />
            <Input label={adjForm.reason === 'Other' ? 'Note (required)' : 'Note (optional)'} id="adjnote" placeholder="Details" value={adjForm.note} onChange={e => setAdjForm(f => ({ ...f, note: e.target.value }))} />
          </div>
          <p className="text-xs text-slate-400">Current credit: {money(credit)}.</p>
          {adjError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{adjError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy} onClick={submitAdjust}>{busy ? 'Saving…' : 'Apply Adjustment'}</Button>
            <Button variant="outline" size="sm" onClick={() => setAdjOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Add member modal */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add Family Member">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" id="mn-first" value={addForm.first_name} onChange={e => setAddForm(f => ({ ...f, first_name: e.target.value }))} required />
            <Input label="Last Name" id="mn-last" value={addForm.last_name} onChange={e => setAddForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <Select label="Role" id="mr" value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="parent">Parent / Guardian</option>
          </Select>
          <p className="text-xs text-slate-400">Members belong to this family and don't sign in directly — the family logs in with its own account.</p>
          {addError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{addError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !addForm.first_name.trim()} onClick={addMember}>{busy ? 'Adding…' : 'Add Member'}</Button>
            <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit member modal */}
      <Modal open={!!editMember} onClose={() => setEditMember(null)} title="Edit Member">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" id="emn-first" value={editForm.first_name} onChange={e => setEditForm(f => ({ ...f, first_name: e.target.value }))} required />
            <Input label="Last Name" id="emn-last" value={editForm.last_name} onChange={e => setEditForm(f => ({ ...f, last_name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role" id="emr" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              <option value="student">Student</option>
              <option value="parent">Parent / Guardian</option>
            </Select>
            <Input label="Phone" id="emph" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" id="emdob" type="date" value={editForm.date_of_birth} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            <Select label="Gender" id="emg" value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !editForm.first_name.trim()} onClick={saveMember}>{busy ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditMember(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Edit family modal */}
      <Modal open={famEditOpen} onClose={() => setFamEditOpen(false)} title="Edit Family">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Family Name" id="ffn" value={famForm.family_name} onChange={e => setFamForm(f => ({ ...f, family_name: e.target.value }))} required />
            <Input label="Phone" id="ffph" value={famForm.phone} onChange={e => setFamForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <Input label="Street" id="ffst" value={famForm.street} onChange={e => setFamForm(f => ({ ...f, street: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" id="ffc" value={famForm.city} onChange={e => setFamForm(f => ({ ...f, city: e.target.value }))} />
            <Input label="State / Province" id="ffs" value={famForm.state} onChange={e => setFamForm(f => ({ ...f, state: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Postal Code" id="ffp" value={famForm.postal_code} onChange={e => setFamForm(f => ({ ...f, postal_code: e.target.value }))} />
            <Input label="Country" id="ffco" value={famForm.country} onChange={e => setFamForm(f => ({ ...f, country: e.target.value }))} />
          </div>
          <p className="text-xs text-slate-400">The login email ({family.email}) and password are changed from the family's own Settings page — the family name doubles as their login username.</p>
          {famError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{famError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !famForm.family_name.trim()} onClick={saveFamily}>{busy ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" size="sm" onClick={() => setFamEditOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
