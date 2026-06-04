import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { Badge, Button, Card, Modal, Input, Select, PageHeader, Table, Tr, Td } from '../../components/ui'

const MOCK_USERS = [
  { id: 'u1', name: 'Jane Doe',      email: 'jane@academia.edu',    role: 'admin',   joined: '2022-08-01', status: 'active' },
  { id: 'u2', name: 'Mr. Okonkwo',   email: 'okonkwo@academia.edu', role: 'teacher', joined: '2021-01-15', status: 'active' },
  { id: 'u3', name: 'Ms. Rivera',    email: 'rivera@academia.edu',  role: 'teacher', joined: '2020-09-01', status: 'active' },
  { id: 'u4', name: 'Ethan Park',    email: 'ethan@student.edu',    role: 'student', joined: '2024-09-01', status: 'active' },
  { id: 'u5', name: 'Sofia Reyes',   email: 'sofia@student.edu',    role: 'student', joined: '2025-01-10', status: 'active' },
  { id: 'u6', name: 'Maria Reyes',   email: 'maria@parent.edu',     role: 'parent',  joined: '2025-01-10', status: 'active' },
  { id: 'u7', name: 'Liam Chen',     email: 'liam@student.edu',     role: 'student', joined: '2025-05-22', status: 'pending' },
]

const ROLE_VARIANT = { admin: 'navy', teacher: 'academics', student: 'success', parent: 'gold' }
const ROLE_OPTIONS = ['admin', 'teacher', 'student', 'parent']

export default function AdminUsers() {
  const [users, setUsers] = useState(MOCK_USERS)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', role: 'student' })

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = () => {
    setUsers(prev => [{ id: `u${Date.now()}`, ...form, joined: new Date().toISOString().slice(0, 10), status: 'active' }, ...prev])
    setShowModal(false)
    setForm({ name: '', email: '', role: 'student' })
  }

  const counts = ROLE_OPTIONS.reduce((acc, r) => { acc[r] = users.filter(u => u.role === r).length; return acc }, {})

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="User Management" subtitle="Manage all portal accounts and roles"
        action={<Button onClick={() => setShowModal(true)}><UserPlus size={14} /> Add User</Button>} />

      {/* Role summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {ROLE_OPTIONS.map(r => (
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
        <Table headers={['User', 'Role', 'Joined', 'Status', 'Actions']}>
          {filtered.map(u => (
            <Tr key={u.id}>
              <Td>
                <p className="font-medium text-slate-900">{u.name}</p>
                <p className="text-xs text-slate-400">{u.email}</p>
              </Td>
              <Td><Badge variant={ROLE_VARIANT[u.role]}>{u.role}</Badge></Td>
              <Td className="text-slate-400 text-xs">{u.joined}</Td>
              <Td>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {u.status}
                </span>
              </Td>
              <Td>
                <button
                  onClick={() => setUsers(prev => prev.map(p => p.id === u.id ? { ...p, status: p.status === 'active' ? 'suspended' : 'active' } : p))}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                  {u.status === 'active' ? 'Suspend' : 'Activate'}
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add New User">
        <div className="space-y-4">
          <Input label="Full Name" id="un" placeholder="e.g. John Smith" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email" id="ue" type="email" placeholder="user@academia.edu" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Role" id="ur" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            {ROLE_OPTIONS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleAdd} disabled={!form.name || !form.email}>Add User</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
