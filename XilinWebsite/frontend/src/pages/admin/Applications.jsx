import { useState, useEffect } from 'react'
import { Eye, Check, X, ShieldCheck, KeyRound, Users, UserPlus } from 'lucide-react'
import { listEnrollmentApplications, reviewEnrollmentApplication, listPublicCourses } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'

const STATUS_ORDER = ['pending', 'approved', 'rejected']
const STATUS_BADGE = { pending: 'warning', approved: 'enrolled', rejected: 'rejected' }
const SORT_OPTIONS = [
  { key: 'created_at', label: 'Applied' },
  { key: 'full_name', label: 'Name' },
  { key: 'applicant_type', label: 'Type' },
]

export default function AdminApplications() {
  const [apps, setApps] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('pending')
  const [selected, setSelected] = useState(null)
  const [working, setWorking] = useState(false)
  const [result, setResult] = useState(null) // { status, temp_password, enrolled }

  const load = () => {
    setLoading(true)
    listEnrollmentApplications()
      .then(setApps)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    listPublicCourses().then(setCourses).catch(() => {})
  }, [])

  const courseName = (id) => courses.find(c => c.id === id)?.name || 'Unknown class'

  const statusFiltered = filter === 'all' ? apps : apps.filter(a => a.status === filter)
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(statusFiltered, { searchKeys: ['full_name', 'email', 'family_name'], sortOptions: SORT_OPTIONS, initialDir: 'desc' })

  const counts = STATUS_ORDER.reduce((acc, s) => { acc[s] = apps.filter(a => a.status === s).length; return acc }, {})

  const review = async (action) => {
    if (!selected) return
    setWorking(true)
    setResult(null)
    try {
      const res = await reviewEnrollmentApplication(selected.id, action)
      setResult(res)
      // reflect new status locally
      setApps(prev => prev.map(a => a.id === selected.id ? { ...a, status: res.status } : a))
      setSelected(prev => prev ? { ...prev, status: res.status } : prev)
    } catch (err) {
      setResult({ error: err.message })
    } finally {
      setWorking(false)
    }
  }

  const closeModal = () => { setSelected(null); setResult(null) }

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Applications" subtitle="Review enrollment applications from the public site" />

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5 flex items-start gap-3">
        <ShieldCheck size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-yellow-800">
          Approving an application creates the family login (for new families), a member profile, the family link,
          and enrollments into the chosen classes. Nothing is activated until you approve.
        </p>
      </div>

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {STATUS_ORDER.map(s => (
          <button key={s} onClick={() => setFilter(filter === s ? 'all' : s)}
            className={`rounded-xl p-4 text-left border transition-all cursor-pointer ${filter === s ? 'bg-navy border-navy' : 'bg-white border-slate-200 hover:border-yellow-300'}`}>
            <p className={`font-display text-2xl font-semibold ${filter === s ? 'text-yellow-400' : 'text-slate-900'}`}>{counts[s] || 0}</p>
            <p className={`text-xs capitalize mt-0.5 ${filter === s ? 'text-white/60' : 'text-slate-400'}`}>{s}</p>
          </button>
        ))}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search name or email..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Applicant', 'Type', 'Family', 'Applied', 'Status', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No applications found.</Td></Tr>
            ) : filtered.map(a => (
              <Tr key={a.id} onClick={() => { setSelected(a); setResult(null) }}>
                <Td>
                  <p className="font-medium text-slate-900">{a.full_name}</p>
                  <p className="text-xs text-slate-400">{a.email}</p>
                </Td>
                <Td className="capitalize text-slate-600">{a.applicant_type}</Td>
                <Td className="text-slate-600">
                  {a.family_mode === 'existing'
                    ? <span className="inline-flex items-center gap-1 text-xs"><Users size={12} /> {a.families?.family_name || 'Existing'}</span>
                    : <span className="inline-flex items-center gap-1 text-xs"><UserPlus size={12} /> {a.family_name}</span>}
                </Td>
                <Td className="text-slate-400 text-xs">{a.created_at?.slice(0, 10)}</Td>
                <Td><Badge variant={STATUS_BADGE[a.status]}>{a.status}</Badge></Td>
                <Td><Eye size={15} className="text-slate-400" /></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Detail / review modal */}
      <Modal open={!!selected} onClose={closeModal} title="Application Review">
        {selected && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-11 h-11 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-semibold flex-shrink-0">
                {selected.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg text-slate-900 leading-tight truncate">{selected.full_name}</p>
                <p className="text-xs text-slate-400">
                  {selected.applicant_type === 'parent' ? 'Parent / Guardian' : 'Student'} · Applied {selected.created_at?.slice(0, 10)}
                </p>
              </div>
              <Badge variant={STATUS_BADGE[selected.status]}>{selected.status}</Badge>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-50 rounded-xl p-4">
              {[
                ['Email', selected.email],
                ['Phone', selected.phone || '—'],
                ...(selected.applicant_type === 'student' ? [['Date of Birth', selected.dob || '—']] : []),
                ['Family', selected.family_mode === 'existing'
                  ? `Existing — ${selected.families?.family_name || selected.family_id}`
                  : `New — ${selected.family_name}`],
              ].map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-0.5">{k}</p>
                  <p className="text-sm font-medium text-slate-900 break-words">{v}</p>
                </div>
              ))}
            </div>

            {/* Requested classes */}
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-2">Requested Classes</p>
              {selected.desired_course_ids?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.desired_course_ids.map(id => (
                    <span key={id} className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700 font-medium">{courseName(id)}</span>
                  ))}
                </div>
              ) : <p className="text-sm text-slate-400">None selected</p>}
            </div>

            {selected.notes && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{selected.notes}</p>
              </div>
            )}

            {/* Result banner */}
            {result?.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-xs text-red-600">
                {result.error}
              </div>
            )}
            {result?.status === 'approved' && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 space-y-1.5">
                <p className="flex items-center gap-2 font-medium"><Check size={14} /> Approved — {result.enrolled} class{result.enrolled !== 1 ? 'es' : ''} enrolled.</p>
                {result.family_code && (
                  <p className="flex items-center gap-2 text-xs">
                    Family ID (sign-in): <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-green-200">{result.family_code}</span>
                  </p>
                )}
                {result.temp_password && (
                  <p className="flex items-center gap-2 text-xs">
                    <KeyRound size={13} /> Temporary password: <span className="font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-green-200">{result.temp_password}</span>
                  </p>
                )}
                {result.temp_password && (
                  <p className="text-xs text-green-700/80">
                    {result.emailed
                      ? `Login details were emailed to ${selected.email}.`
                      : `Email not sent (no provider configured) — share this with the family so they can sign in with ${selected.email}.`}
                  </p>
                )}
              </div>
            )}
            {result?.status === 'rejected' && (
              <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-600 flex items-center gap-2">
                <X size={14} /> Application rejected.
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-3 border-t border-slate-100">
              {selected.status === 'pending' && !result ? (
                <>
                  <Button variant="gold" size="sm" disabled={working} onClick={() => review('approve')}>
                    <Check size={13} /> {working ? 'Working…' : 'Approve'}
                  </Button>
                  <Button variant="danger" size="sm" disabled={working} onClick={() => review('reject')}>
                    <X size={13} /> Reject
                  </Button>
                  <Button variant="outline" size="sm" onClick={closeModal}>Cancel</Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={closeModal}>Close</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
