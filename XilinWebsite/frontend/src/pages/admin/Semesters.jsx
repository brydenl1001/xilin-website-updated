import { useState, useEffect } from 'react'
import { Plus, Pencil, Copy, CheckCircle } from 'lucide-react'
import { listSemesters, createSemester, updateSemester, copySemesterClasses } from '../../lib/supabaseClient'
import { Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select } from '../../components/ui'

const BLANK = { name: '', academic_year: '', term: 'Fall', registration_start: '', registration_end: '', class_start: '', class_end: '', is_active: 'false' }

export default function AdminSemesters() {
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Copy-classes modal
  const [copyTarget, setCopyTarget] = useState(null)
  const [copyFrom, setCopyFrom] = useState('')
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState('')

  const load = () => {
    setLoading(true)
    listSemesters().then(setSemesters).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(BLANK); setEditing({}); setSaveError('') }
  const openEdit = (s) => {
    setForm({
      name: s.name || '', academic_year: s.academic_year || '', term: s.term || 'Fall',
      registration_start: s.registration_start || '', registration_end: s.registration_end || '',
      class_start: s.class_start || '', class_end: s.class_end || '', is_active: s.is_active ? 'true' : 'false',
    })
    setEditing(s); setSaveError('')
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true); setSaveError('')
    const payload = {
      name: form.name.trim(), academic_year: form.academic_year.trim() || null, term: form.term,
      registration_start: form.registration_start || null, registration_end: form.registration_end || null,
      class_start: form.class_start || null, class_end: form.class_end || null,
      is_active: form.is_active === 'true',
    }
    try {
      if (editing?.id) await updateSemester(editing.id, payload)
      else await createSemester(payload)
      setEditing(null); load()
    } catch (e) { setSaveError(e.message) } finally { setSaving(false) }
  }

  const runCopy = async () => {
    if (!copyFrom) return
    setCopying(true); setCopyMsg('')
    try {
      const n = await copySemesterClasses(copyFrom, copyTarget.id)
      setCopyMsg(`Copied ${n} class${n !== 1 ? 'es' : ''} into ${copyTarget.name}.`)
    } catch (e) { setCopyMsg(`Failed: ${e.message}`) } finally { setCopying(false) }
  }

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Semesters" subtitle="Terms, registration windows, and class scheduling"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Semester</Button>} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Semester', 'Registration', 'Classes', 'Status', '']}>
            {semesters.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No semesters yet.</Td></Tr>
            ) : semesters.map(s => (
              <Tr key={s.id}>
                <Td>
                  <p className="font-medium text-slate-900">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.academic_year} · {s.term}</p>
                </Td>
                <Td className="text-slate-500 text-xs">{s.registration_start || '—'} → {s.registration_end || '—'}</Td>
                <Td className="text-slate-500 text-xs">{s.class_start || '—'} → {s.class_end || '—'}</Td>
                <Td>{s.is_active
                  ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle size={12} /> Active</span>
                  : <span className="text-xs text-slate-400">Inactive</span>}
                </Td>
                <Td>
                  <div className="flex items-center gap-1 justify-end">
                    <button onClick={() => { setCopyTarget(s); setCopyFrom(''); setCopyMsg('') }} title="Copy classes from another semester"
                      className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1"><Copy size={14} /></button>
                    <button onClick={() => openEdit(s)} title="Edit"
                      className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1"><Pencil size={14} /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Create/edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Semester' : 'New Semester'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Name" id="sn" placeholder="e.g. Fall 2026" value={form.name} onChange={set('name')} required />
            <Input label="Academic Year" id="ay" placeholder="2026-2027" value={form.academic_year} onChange={set('academic_year')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Term" id="term" value={form.term} onChange={set('term')}>
              {['Fall', 'Spring', 'Summer', 'Winter'].map(t => <option key={t}>{t}</option>)}
            </Select>
            <Select label="Active" id="act" value={form.is_active} onChange={set('is_active')}>
              <option value="false">Inactive</option>
              <option value="true">Active (current term)</option>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Registration opens" id="rs" type="date" value={form.registration_start} onChange={set('registration_start')} />
            <Input label="Registration closes" id="re" type="date" value={form.registration_end} onChange={set('registration_end')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Classes start" id="cs" type="date" value={form.class_start} onChange={set('class_start')} />
            <Input label="Classes end" id="ce" type="date" value={form.class_end} onChange={set('class_end')} />
          </div>
          <p className="text-xs text-slate-400">Class dates drive the prorated drop-credit schedule.</p>
          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={saving || !form.name.trim()} onClick={save}>{saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Create Semester'}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      {/* Copy classes modal */}
      <Modal open={!!copyTarget} onClose={() => setCopyTarget(null)} title="Copy Classes">
        {copyTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">Copy every class (course, teacher slot, room, time, capacity) from another semester into <strong>{copyTarget.name}</strong>.</p>
            <Select label="Copy classes from" id="cf" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}>
              <option value="">Select a semester…</option>
              {semesters.filter(s => s.id !== copyTarget.id).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
            {copyMsg && <p className={`text-xs px-3 py-2 rounded-lg ${copyMsg.startsWith('Failed') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{copyMsg}</p>}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button variant="gold" size="sm" disabled={copying || !copyFrom} onClick={runCopy}>{copying ? 'Copying…' : 'Copy Classes'}</Button>
              <Button variant="outline" size="sm" onClick={() => setCopyTarget(null)}>Done</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
