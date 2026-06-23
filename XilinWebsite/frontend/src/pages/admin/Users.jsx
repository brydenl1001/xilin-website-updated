import { useState, useEffect } from 'react'
import { Search, AlertTriangle } from 'lucide-react'
import { listProfiles, listFamilies } from '../../lib/supabaseClient'
import { Badge, Card, PageHeader, Table, Tr, Td } from '../../components/ui'

const ROLE_VARIANT = { admin: 'navy', teacher: 'academics', student: 'success', parent: 'gold' }
const ROLE_OPTIONS = ['admin', 'teacher', 'student']

export default function AdminUsers() {
  const [profiles, setProfiles] = useState([])
  const [families, setFamilies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  useEffect(() => {
    const load = async () => {
      try {
        const [profileData, familyData] = await Promise.all([
          listProfiles(),
          listFamilies(),
        ])
        setProfiles(profileData)
        setFamilies(familyData)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // Build a unified user list: admin/teacher/student profiles + family "parent" rows
  const parentRows = families.flatMap(f =>
    (f.family_members || [])
      .filter(m => m.relationship === 'parent')
      .map(m => ({
        id: m.profiles?.id,
        full_name: m.profiles?.full_name,
        role: 'parent',
        familyName: f.family_name,
        email: f.email,
      }))
  )

  const allUsers = [
    ...profiles.map(p => ({ ...p, email: p.email || '—' })),
    ...parentRows,
  ]

  const filtered = allUsers.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    const name = u.full_name || ''
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = { admin: 0, teacher: 0, student: 0, parent: 0 }
  allUsers.forEach(u => { if (counts[u.role] !== undefined) counts[u.role]++ })

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="User Management" subtitle="View all portal accounts and roles" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Creating new accounts (admin/teacher/student/family) requires <code className="text-xs bg-amber-100 px-1 rounded">auth.admin.createUser()</code>,
          which needs the service role key and must run on a backend endpoint — not from this page.
        </p>
      </div>

      {/* Role summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[...ROLE_OPTIONS, 'parent'].map(r => (
          <button key={r} onClick={() => setRoleFilter(roleFilter === r ? 'all' : r)}
            className={`rounded-xl p-4 text-left border transition-all capitalize ${roleFilter === r ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:border-yellow-300'}`}>
            <p className={`font-display text-2xl font-semibold ${roleFilter === r ? 'text-yellow-400' : 'text-slate-900'}`}>{counts[r] || 0}</p>
            <p className={`text-xs mt-0.5 ${roleFilter === r ? 'text-white/60' : 'text-slate-400'}`}>{r}s</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 mb-4 max-w-xs">
        <Search size={13} className="text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..."
          className="text-xs outline-none flex-1 placeholder:text-slate-400" />
      </div>

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['User', 'Role', 'Email / Family']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No users found.</Td></Tr>
            ) : filtered.map(u => (
              <Tr key={u.id}>
                <Td><p className="font-medium text-slate-900">{u.full_name}</p></Td>
                <Td><Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge></Td>
                <Td className="text-slate-500 text-xs">{u.role === 'parent' ? u.familyName : u.email}</Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
