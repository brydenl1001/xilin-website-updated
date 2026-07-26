import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, KeyRound, Check, ArrowLeft, Mail, Phone, Hash, BookOpen, GraduationCap, Users as UsersIcon, Home, Pencil, Power } from 'lucide-react'
import { listProfiles, listFamilies, createAccount, listClasses, getOwnEnrollments, adminUpdateProfile, updateFamilyMember, setAccountActive } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, ListToolbar, TableSkeleton } from '../../components/ui'
import ClassScheduleList, { distinctSemesters, SemesterPicker } from '../../components/ClassScheduleList'
import { useListControls } from '../../hooks/useListControls'
import { ROLE_VARIANT } from '../../lib/categories'
import { useFeedback } from '../../context/FeedbackContext'

const SORT_OPTIONS = [{ key: 'full_name', label: 'Name' }, { key: 'role', label: 'Role' }]
const ROLE_OPTIONS = ['admin', 'teacher', 'student']

const KINDS = [
  { val: 'staff',  label: 'Staff login',   hint: 'Admin or teacher who signs in directly' },
  { val: 'family', label: 'Family login',  hint: 'Household account parents sign in with' },
  { val: 'member', label: 'Family member', hint: 'Student or parent under a family (no login)' },
]
const BLANK = { kind: 'staff', full_name: '', family_name: '', email: '', phone: '', role: 'teacher', family_id: '', password: '' }

export default function AdminUsers() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState([])
  const [families, setFamilies] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [result, setResult] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [profileData, familyData, classData] = await Promise.all([listProfiles(), listFamilies(), listClasses()])
      setProfiles(profileData)
      setFamilies(familyData)
      setClasses(classData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const openNew = () => { setForm(BLANK); setResult(null); setSaveError(''); setOpen(true) }

  const submit = async () => {
    setSaving(true); setSaveError(''); setResult(null)
    try {
      const k = form.kind
      const payload =
        k === 'staff'  ? { kind: k, full_name: form.full_name, email: form.email, role: form.role, password: form.password || undefined, phone: form.phone }
      : k === 'family' ? { kind: k, family_name: form.family_name, email: form.email, phone: form.phone, password: form.password || undefined }
      :                  { kind: k, full_name: form.full_name, role: form.role === 'admin' || form.role === 'teacher' ? 'student' : form.role, family_id: form.family_id, phone: form.phone }
      const res = await createAccount(payload)
      setResult(res)
      await load()
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Family info per member profile id, for the "Family" column and links.
  const memberInfo = {}
  families.forEach(f =>
    (f.family_members || []).forEach(m => {
      if (m.profiles?.id) memberInfo[m.profiles.id] = {
        familyId: f.id, familyName: f.family_name, familyCode: f.family_code, familyEmail: f.email,
      }
    })
  )
  const profileIds = new Set(profiles.map(p => p.id))
  // Members are also rows in `profiles`, so start from there and attach family
  // info. Staff carry their login email on profiles.email directly; members have
  // no login, so fall back to their family's email.
  const allUsers = [
    ...profiles.map(p => {
      const mi = memberInfo[p.id]
      return {
        ...p,
        familyId: mi?.familyId, familyName: mi?.familyName, familyCode: mi?.familyCode,
        email: p.email || mi?.familyEmail || '—',
      }
    }),
    // Any family member without a standalone profile row (edge case).
    ...families.flatMap(f => (f.family_members || [])
      .filter(m => m.profiles?.id && !profileIds.has(m.profiles.id))
      .map(m => ({
        id: m.profiles.id, full_name: m.profiles.full_name,
        role: m.profiles.role || m.relationship, phone: m.profiles.phone || null,
        is_active: m.profiles.is_active, date_of_birth: m.profiles.date_of_birth || null,
        gender: m.profiles.gender || null,
        familyId: f.id, familyName: f.family_name, familyCode: f.family_code, email: f.email,
      }))),
  ]

  const statusFiltered = statusFilter === 'all' ? allUsers
    : statusFilter === 'inactive' ? allUsers.filter(u => u.is_active === false)
    : allUsers.filter(u => u.is_active !== false)
  const roleFiltered = roleFilter === 'all' ? statusFiltered : statusFiltered.filter(u => u.role === roleFilter)
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(roleFiltered, { searchKeys: ['full_name', 'email', 'familyName'], sortOptions: SORT_OPTIONS })

  const counts = { admin: 0, teacher: 0, student: 0, parent: 0 }
  allUsers.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++ })

  const memberRoleValue = form.role === 'admin' || form.role === 'teacher' ? 'student' : form.role

  if (id) {
    if (loading) return <div className="max-w-5xl"><Card className="!p-0 overflow-hidden"><TableSkeleton rows={6} /></Card></div>
    const selectedUser = allUsers.find(u => u.id === id)
    if (selectedUser) {
      return <UserDetail user={selectedUser} families={families} classes={classes} onBack={() => navigate('/users')} onChanged={load} />
    }
    return (
      <div className="max-w-5xl">
        <button onClick={() => navigate('/users')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer"><ArrowLeft size={15} /> Back to users</button>
        <Card><p className="py-8 text-center text-slate-400 text-sm">User not found.</p></Card>
      </div>
    )
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="User Management" subtitle="Create and view all portal accounts"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Account</Button>} />

      {/* Role summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[...ROLE_OPTIONS, 'parent'].map(r => (
          <button key={r} onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
            className={`rounded-xl p-4 text-left border transition-all capitalize cursor-pointer ${roleFilter === r ? 'bg-navy border-navy' : 'bg-white border-slate-200 hover:border-yellow-300'}`}>
            <p className={`font-display text-2xl font-semibold ${roleFilter === r ? 'text-yellow-400' : 'text-slate-900'}`}>{counts[r] || 0}</p>
            <p className={`text-xs mt-0.5 ${roleFilter === r ? 'text-white/60' : 'text-slate-400'}`}>{r}s</p>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mb-3">
        {['active', 'inactive', 'all'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full border capitalize transition-colors cursor-pointer ${statusFilter === s ? 'bg-navy text-white border-navy' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {s === 'all' ? 'All' : s}
          </button>
        ))}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search users..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['User', 'Role', 'Email / Family', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No users found.</Td></Tr>
            ) : filtered.map((u, i) => (
              <Tr key={u.id || i} onClick={() => u.id && navigate(`/users/${u.id}`)}>
                <Td>
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    {u.full_name}
                    {u.is_active === false && <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">Inactive</span>}
                  </p>
                </Td>
                <Td><Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge></Td>
                <Td className="text-slate-500 text-xs">{u.familyName || u.email}</Td>
                <Td><span className="text-xs text-yellow-600">View →</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Create account modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Account">
        {result ? (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 space-y-1.5">
              <p className="flex items-center gap-2 font-medium"><Check size={14} /> Account created.</p>
              {result.temp_password && (
                <p className="flex items-center gap-2 text-xs">
                  <KeyRound size={13} /> Temporary password: <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-green-200">{result.temp_password}</span>
                </p>
              )}
              {result.kind === 'family' && (
                <p className="text-xs">Family ID: <span className="font-mono">{result.id}</span></p>
              )}
              {'emailed' in result && (
                <p className="text-xs text-green-700/80">{result.emailed ? 'Credentials emailed to the account holder.' : 'Email not sent (no email provider configured) — share the password above manually.'}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="gold" size="sm" onClick={openNew}>Create Another</Button>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Kind selector */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Account type</label>
              <div className="grid grid-cols-3 gap-2">
                {KINDS.map(k => (
                  <button key={k.val} type="button" onClick={() => setForm(f => ({ ...f, kind: k.val }))}
                    className={`rounded-xl px-3 py-2.5 text-xs font-medium border text-left transition-all cursor-pointer ${form.kind === k.val ? 'border-yellow-500 bg-yellow-50 text-yellow-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {k.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">{KINDS.find(k => k.val === form.kind)?.hint}</p>
            </div>

            {form.kind === 'staff' && (
              <>
                <Input label="Full Name" id="fn" value={form.full_name} onChange={set('full_name')} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Email" id="em" type="email" value={form.email} onChange={set('email')} required />
                  <Select label="Role" id="rl" value={form.role} onChange={set('role')}>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </Select>
                </div>
              </>
            )}

            {form.kind === 'family' && (
              <>
                <Input label="Family Name" id="famn" placeholder="e.g. The Chen Family" value={form.family_name} onChange={set('family_name')} required />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Email" id="em" type="email" value={form.email} onChange={set('email')} required />
                  <Input label="Phone" id="ph" value={form.phone} onChange={set('phone')} />
                </div>
              </>
            )}

            {form.kind === 'member' && (
              <>
                <Input label="Full Name" id="fn" value={form.full_name} onChange={set('full_name')} required />
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Member Role" id="mr" value={memberRoleValue} onChange={set('role')}>
                    <option value="student">Student</option>
                    <option value="parent">Parent / Guardian</option>
                  </Select>
                  <Select label="Family" id="fam" value={form.family_id} onChange={set('family_id')}>
                    <option value="">Select a family…</option>
                    {families.map(f => <option key={f.id} value={f.id}>{f.family_name}</option>)}
                  </Select>
                </div>
              </>
            )}

            {(form.kind === 'staff' || form.kind === 'family') && (
              <Input label="Temporary Password (optional)" id="pw" placeholder="Leave blank to auto-generate" value={form.password} onChange={set('password')} />
            )}

            {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button variant="gold" size="sm" disabled={saving} onClick={submit}>{saving ? 'Creating…' : 'Create Account'}</Button>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
function UserDetail({ user, families, classes, onBack, onChanged }) {
  const { toast, confirm } = useFeedback()
  const isTeacher = user.role === 'teacher'
  const isAdmin = user.role === 'admin'
  const isMember = user.role === 'student' || user.role === 'parent'
  const isStaff = isTeacher || isAdmin
  const active = user.is_active !== false

  const family = isMember ? families.find(f => (f.family_members || []).some(m => m.profiles?.id === user.id)) : null
  const teaching = isTeacher ? classes.filter(c => (c.class_teachers || []).some(ct => ct.profiles?.id === user.id)) : []

  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(isMember)
  const [semId, setSemId] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState({ full_name: '', role: '', phone: '', date_of_birth: '', gender: '' })
  const [editError, setEditError] = useState('')
  const [busy, setBusy] = useState(false)

  const openEdit = () => {
    setEditForm({
      full_name: user.full_name || '',
      role: user.role || (isStaff ? 'teacher' : 'student'),
      phone: user.phone || '',
      date_of_birth: user.date_of_birth || '',
      gender: user.gender || '',
    })
    setEditError(''); setEditOpen(true)
  }
  const saveEdit = async () => {
    if (!editForm.full_name.trim()) { setEditError('Name is required.'); return }
    setBusy(true); setEditError('')
    try {
      const patch = {
        full_name: editForm.full_name.trim(), role: editForm.role,
        phone: editForm.phone.trim() || null, date_of_birth: editForm.date_of_birth || null, gender: editForm.gender || null,
      }
      if (isMember && family) await updateFamilyMember(family.id, user.id, patch)
      else await adminUpdateProfile(user.id, patch)
      setEditOpen(false)
      toast.success('Account updated.')
      await onChanged?.()
      onBack()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setBusy(false)
    }
  }
  const toggleActive = async () => {
    const next = !active
    if (!next && !(await confirm({
      title: 'Deactivate account',
      message: `Deactivate ${user.full_name}? ${isStaff ? 'They will be signed out and unable to log in.' : 'They will be hidden from the active list.'} The record is kept and can be reactivated anytime.`,
      confirmLabel: 'Deactivate', danger: true,
    }))) return
    setBusy(true)
    try {
      await setAccountActive(user.id, next)
      toast.success(next ? 'Account reactivated.' : 'Account deactivated.')
      await onChanged?.()
      onBack()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (!isMember) return
    let live = true
    setLoading(true)
    getOwnEnrollments(user.id)
      .then(e => { if (live) setEnrollments(e) })
      .catch(err => console.error(err))
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [user.id, isMember])

  // A person's classes: teachers see what they teach, members see enrollments.
  const scheduleClasses = isTeacher
    ? teaching
    : enrollments.filter(e => e.status === 'enrolled').map(e => e.classes).filter(Boolean)
  const semesters = distinctSemesters(scheduleClasses)
  useEffect(() => {
    setSemId(prev => (prev && semesters.some(s => s.id === prev)) ? prev : (semesters.find(s => s.is_current) || semesters[0])?.id || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrollments, user.id, teaching.length])
  const shown = scheduleClasses.filter(c => c.semester_id === semId)

  return (
    <div className="max-w-4xl animate-fade-in">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-4 cursor-pointer transition-colors">
        <ArrowLeft size={15} /> Back to users
      </button>

      {/* Header */}
      <div className="bg-navy rounded-2xl p-6 mb-5 text-white">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <p className="font-display text-2xl">{user.full_name}</p>
              <Badge variant={ROLE_VARIANT[user.role]}>{user.role}</Badge>
              {!active && <span className="text-[11px] uppercase tracking-wide text-white/60 border border-white/25 rounded px-1.5 py-0.5">Inactive</span>}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-300">
              {user.email && user.email !== '—' && (
                <span className="flex items-center gap-1.5"><Mail size={13} className="text-yellow-400" />{user.email}</span>
              )}
              {user.phone && <span className="flex items-center gap-1.5"><Phone size={13} className="text-yellow-400" />{user.phone}</span>}
              {family && (
                <span className="flex items-center gap-1.5"><UsersIcon size={13} className="text-yellow-400" />{family.family_name}</span>
              )}
              {family?.family_code && (
                <span className="flex items-center gap-1.5"><Hash size={13} className="text-yellow-400" />ID {family.family_code}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" disabled={busy} className="!border-white/20 !text-white hover:!bg-white/10" onClick={openEdit}><Pencil size={13} /> Edit</Button>
            <Button variant="outline" size="sm" disabled={busy}
              className={active ? '!border-red-400/40 !text-red-300 hover:!bg-red-400/10' : '!border-green-400/40 !text-green-300 hover:!bg-green-400/10'}
              onClick={toggleActive}><Power size={13} /> {active ? 'Deactivate' : 'Reactivate'}</Button>
            {family && (
              <Link to={`/families/${family.id}`}>
                <Button variant="outline" size="sm" className="!border-yellow-400/50 !text-yellow-400 hover:!bg-yellow-400/10"><Home size={13} /> View Family</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Edit account modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Account">
        <div className="space-y-4">
          <Input label="Full Name" id="efn" value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Role" id="erl" value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}>
              {isStaff ? <>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </> : <>
                <option value="student">Student</option>
                <option value="parent">Parent / Guardian</option>
              </>}
            </Select>
            <Input label="Phone" id="eph" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date of Birth" id="edob" type="date" value={editForm.date_of_birth} onChange={e => setEditForm(f => ({ ...f, date_of_birth: e.target.value }))} />
            <Select label="Gender" id="egn" value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </Select>
          </div>
          {user.email && user.email !== '—' && isStaff && (
            <p className="text-xs text-slate-400">Login email ({user.email}) is changed from the account holder's own Settings page.</p>
          )}
          {editError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{editError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={busy || !editForm.full_name.trim()} onClick={saveEdit}>{busy ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Role-specific body */}
      {isAdmin && (
        <Card><p className="text-sm text-slate-500 py-2 text-center">Administrator account with full portal access.</p></Card>
      )}

      {(isTeacher || isMember) && (
        <>
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h3 className="font-display text-lg text-slate-900 flex items-center gap-2">
              {isTeacher
                ? <><GraduationCap size={18} className="text-yellow-600" /> Teaching Schedule</>
                : <><BookOpen size={18} className="text-yellow-600" /> Timetable</>}
            </h3>
            <SemesterPicker semesters={semesters} value={semId} onChange={setSemId} className="w-48" />
          </div>
          <Card className="!p-0 overflow-hidden">
            {loading
              ? <TableSkeleton rows={4} />
              : <ClassScheduleList classes={shown} empty={isTeacher ? 'Not assigned to any classes.' : 'Not enrolled in any classes.'} />}
          </Card>
          {isMember && family && (
            <p className="text-xs text-slate-400 mt-4">
              This member belongs to <span className="font-medium text-slate-600">{family.family_name}</span> and signs in through the family account — manage enrollments and balance from the Families page.
            </p>
          )}
        </>
      )}
    </div>
  )
}
