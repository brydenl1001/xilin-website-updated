import { useState, useEffect } from 'react'
import { Search, Eye, Check, X, AlertTriangle } from 'lucide-react'
import { listEnrollments, updateEnrollmentStatus } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td } from '../../components/ui'

const STATUS_ORDER = ['pending', 'admitted', 'enrolled', 'rejected']

export default function AdminEnrollments() {
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)

  const load = () => {
    setLoading(true)
    listEnrollments()
      .then(setEnrollments)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = enrollments.filter(e => {
    if (filter !== 'all' && e.status !== filter) return false
    const name = e.profiles?.full_name || ''
    if (search && !name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const setStatus = async (id, status) => {
    setUpdating(true)
    try {
      await updateEnrollmentStatus(id, status)
      setEnrollments(prev => prev.map(e => e.id === id ? { ...e, status } : e))
    } catch (err) {
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const counts = STATUS_ORDER.reduce((acc, s) => { acc[s] = enrollments.filter(e => e.status === s).length; return acc }, {})

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Enrollments" subtitle="Manage student applications and admissions" />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          New applications must be submitted through the public <code className="text-xs bg-amber-100 px-1 rounded">/enroll</code> page
          (creating a student account requires a backend endpoint, not a direct client call). This page manages existing applications only.
        </p>
      </div>

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
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Student', 'Applied', 'Status', 'Actions']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No enrollments found.</Td></Tr>
            ) : filtered.map(e => (
              <Tr key={e.id}>
                <Td>
                  <p className="font-medium text-slate-900">{e.profiles?.full_name || 'Unknown'}</p>
                </Td>
                <Td className="text-slate-400 text-xs">{e.application_date?.slice(0, 10)}</Td>
                <Td>
                  <select value={e.status} disabled={updating} onChange={ev => setStatus(e.id, ev.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-yellow-400 bg-white disabled:opacity-50">
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
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Enrollment Details">
        {selected && (
          <div className="space-y-2">
            {[
              ['Student', selected.profiles?.full_name || 'Unknown'],
              ['Applied', selected.application_date?.slice(0, 10)],
              ['Admission Date', selected.admission_date?.slice(0, 10) || '—'],
              ['Notes', selected.notes || '—'],
            ].map(([k, v]) => (
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
              <Button variant="gold" size="sm" disabled={updating} onClick={() => { setStatus(selected.id, 'admitted'); setSelected(null) }}><Check size={13} /> Admit</Button>
              <Button variant="danger" size="sm" disabled={updating} onClick={() => { setStatus(selected.id, 'rejected'); setSelected(null) }}><X size={13} /> Reject</Button>
              <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
