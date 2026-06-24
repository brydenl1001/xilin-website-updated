import { useState, useEffect } from 'react'
import { Plus, KeyRound, Check } from 'lucide-react'
import { listProfiles, listFamilies, createAccount } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'

const ROLE_VARIANT = { admin: 'navy', teacher: 'academics', student: 'success', parent: 'gold' }
const SORT_OPTIONS = [{ key: 'full_name', label: 'Name' }, { key: 'role', label: 'Role' }]
const ROLE_OPTIONS = ['admin', 'teacher', 'student']

const KINDS = [
  { val: 'staff',  label: 'Staff login',   hint: 'Admin or teacher who signs in directly' },
  { val: 'family', label: 'Family login',  hint: 'Household account parents sign in with' },
  { val: 'member', label: 'Family member', hint: 'Student or parent under a family (no login)' },
]
const BLANK = { kind: 'staff', full_name: '', family_name: '', email: '', phone: '', role: 'teacher', family_id: '', password: '' }

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([])
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [result, setResult] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [profileData, familyData] = await Promise.all([listProfiles(), listFamilies()])
      setProfiles(profileData)
      setFamilies(familyData)
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

  // Build unified user list: profiles + family parent/student members
  const memberRows = families.flatMap(f =>
    (f.family_members || []).map(m => ({
      id: m.profiles?.id,
      full_name: m.profiles?.full_name,
      role: m.profiles?.role || m.relationship,
      familyName: f.family_name,
      email: f.email,
    }))
  )
  const profileIds = new Set(profiles.map(p => p.id))
  const allUsers = [
    ...profiles.map(p => ({ ...p, email: p.email || '—' })),
    ...memberRows.filter(m => !profileIds.has(m.id)),
  ]

  const roleFiltered = roleFilter === 'all' ? allUsers : allUsers.filter(u => u.role === roleFilter)
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(roleFiltered, { searchKeys: ['full_name', 'email', 'familyName'], sortOptions: SORT_OPTIONS })

  const counts = { admin: 0, teacher: 0, student: 0, parent: 0 }
  allUsers.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++ })

  const memberRoleValue = form.role === 'admin' || form.role === 'teacher' ? 'student' : form.role

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="User Management" subtitle="Create and view all portal accounts"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Account</Button>} />

      {/* Role summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[...ROLE_OPTIONS, 'parent'].map(r => (
          <button key={r} onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
            className={`rounded-xl p-4 text-left border transition-all capitalize cursor-pointer ${roleFilter === r ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200 hover:border-teal-300'}`}>
            <p className={`font-display text-2xl font-semibold ${roleFilter === r ? 'text-teal-400' : 'text-slate-900'}`}>{counts[r] || 0}</p>
            <p className={`text-xs mt-0.5 ${roleFilter === r ? 'text-white/60' : 'text-slate-400'}`}>{r}s</p>
          </button>
        ))}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search users..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['User', 'Role', 'Email / Family']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No users found.</Td></Tr>
            ) : filtered.map((u, i) => (
              <Tr key={u.id || i}>
                <Td><p className="font-medium text-slate-900">{u.full_name}</p></Td>
                <Td><Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge></Td>
                <Td className="text-slate-500 text-xs">{u.familyName || u.email}</Td>
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
                    className={`rounded-xl px-3 py-2.5 text-xs font-medium border text-left transition-all cursor-pointer ${form.kind === k.val ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
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
