import { useState } from 'react'
import { Search, Eye, Check, X } from 'lucide-react'
import { mockEnrollments } from '../../lib/mockData'
import { Badge, Button, Card, Modal, Input, Select, PageHeader, Table, Tr, Td } from '../../components/ui'

const STATUS_ORDER = ['pending', 'admitted', 'enrolled', 'rejected']

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState(mockEnrollments)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [showApply, setShowApply] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ student_name: '', email: '', grade: 'Grade 9', notes: '' })

  const filtered = enrollments.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false
    if (search && !e.student_name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const setStatus = (id, status) => setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e))

  const handleApply = () => {
    setEnrollments(prev => [{ id: `enr-${Date.now()}`, ...form, status: 'pending', applied: new Date().toISOString().slice(0, 10) }, ...prev])
    setShowApply(false)
    setForm({ student_name: '', email: '', grade: 'Grade 9', notes: '' })
  }

  const counts = STATUS_ORDER.reduce((acc, s) => { acc[s] = enrollments.filter(e => e.status === s).length; return acc }, {})

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Enrollments" subtitle="Manage student applications and admissions"
        action={<Button onClick={() => setShowApply(true)}>+ New Application</Button>} />

      {/* Status summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`rounded-xl p-4 text-left border transition-all ${filter === s ? 'bg-slate-900 border-slate-900' : 'bg-white border-slate-200 hover:border-yellow-300'}`}>
            <p className={`font-display text-2xl font-semibold ${filter === s ? 'text-yellow-400' : 'text-slate-900'}`}>{counts[s] || 0}</p>
            <p className={`text-xs capitalize mt-0.5 ${filter === s ? 'text-white/60' : 'text-slate-400'}`}>{s}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 mb-4 max-w-xs">
        <Search size={13} className="text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students..."
          className="text-xs outline-none flex-1 placeholder:text-slate-400" />
      </div>

      <Card className="!p-0 overflow-hidden">
        <Table headers={['Student', 'Grade', 'Applied', 'Status', 'Actions']}>
          {filtered.length === 0 ? (
            <Tr><Td className="py-12 text-center text-slate-400" colSpan="5">No enrollments found.</Td></Tr>
          ) : filtered.map(e => (
            <Tr key={e.id}>
              <Td>
                <p className="font-medium text-slate-900">{e.student_name}</p>
                <p className="text-xs text-slate-400">{e.email}</p>
              </Td>
              <Td className="text-slate-600">{e.grade}</Td>
              <Td className="text-slate-400 text-xs">{e.applied}</Td>
              <Td>
                <select value={e.status} onChange={ev => setStatus(e.id, ev.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-yellow-400 bg-white">
                  {STATUS_ORDER.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </Td>
              <Td>
                <button onClick={() => setSelected(e)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <Eye size={15} />
                </button>
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      {/* Apply modal */}
      <Modal open={showApply} onClose={() => setShowApply(false)} title="New Enrollment Application">
        <div className="space-y-4">
          <Input label="Student Full Name" id="enr-name" placeholder="e.g. Marcus Webb"
            value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
          <Input label="Email Address" id="enr-email" type="email" placeholder="student@email.com"
            value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Select label="Grade" id="enr-grade" value={form.grade} onChange={e => setForm(f => ({ ...f, grade: e.target.value }))}>
            {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => <option key={g}>{g}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowApply(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleApply}>Submit</Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Enrollment Details">
        {selected && (
          <div className="space-y-2">
            {[['Student', selected.student_name], ['Email', selected.email], ['Grade', selected.grade], ['Applied', selected.applied]].map(([k, v]) => (
              <div key={k} className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-400">{k}</span>
                <span className="text-sm font-medium text-slate-900">{v}</span>
              </div>
            ))}
            <div className="flex justify-between py-2">
              <span className="text-xs text-slate-400">Status</span>
              <Badge variant={selected.status}>{selected.status}</Badge>
            </div>
            <div className="flex gap-2 pt-4">
              <Button variant="gold" size="sm" onClick={() => { setStatus(selected.id, 'admitted'); setSelected(null) }}><Check size={13} /> Admit</Button>
              <Button variant="danger" size="sm" onClick={() => { setStatus(selected.id, 'rejected'); setSelected(null) }}><X size={13} /> Reject</Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
