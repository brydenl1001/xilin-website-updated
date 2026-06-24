import { useState, useEffect } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { listCourses, createCourse, updateCourse } from '../../lib/supabaseClient'
import { Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Textarea, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'

const BLANK = { code: '', name: '', subject_area: '', grade_level: '', price: '', description: '' }
const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
  { key: 'subject_area', label: 'Subject' },
  { key: 'price', label: 'Price' },
]

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // course being edited, or {} for new
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    listCourses().then(setCourses).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(BLANK); setEditing({}); setSaveError('') }
  const openEdit = (c) => {
    setForm({
      code: c.code || '', name: c.name || '', subject_area: c.subject_area || '',
      grade_level: c.grade_level || '', price: c.price ?? '', description: c.description || '',
    })
    setEditing(c); setSaveError('')
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true); setSaveError('')
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      subject_area: form.subject_area.trim() || null,
      grade_level: form.grade_level.trim() || null,
      price: form.price === '' ? null : Number(form.price),
      description: form.description.trim() || null,
    }
    try {
      if (editing?.id) await updateCourse(editing.id, payload)
      else await createCourse(payload)
      setEditing(null)
      load()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(courses, { searchKeys: ['code', 'name', 'subject_area'], sortOptions: SORT_OPTIONS })

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Course Catalog" subtitle="Create and edit the classes families can enroll in"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Course</Button>} />

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search courses..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Code', 'Name', 'Subject', 'Grade Range', 'Price', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No courses yet. Add your first one.</Td></Tr>
            ) : filtered.map(c => (
              <Tr key={c.id} onClick={() => openEdit(c)}>
                <Td><span className="font-mono text-xs text-slate-500">{c.code}</span></Td>
                <Td><span className="font-medium text-slate-900">{c.name}</span></Td>
                <Td className="text-slate-600">{c.subject_area || '—'}</Td>
                <Td className="text-slate-600">{c.grade_level || '—'}</Td>
                <Td className="text-slate-600">{c.price != null ? `$${Number(c.price).toLocaleString()}` : '—'}</Td>
                <Td><Pencil size={14} className="text-slate-400" /></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Course' : 'New Course'}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Course Code" id="code" placeholder="e.g. MAND101" value={form.code} onChange={set('code')} required />
            <Input label="Price (per term)" id="price" type="number" placeholder="e.g. 320" value={form.price} onChange={set('price')} />
          </div>
          <Input label="Name" id="name" placeholder="e.g. Beginner Mandarin" value={form.name} onChange={set('name')} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Subject Area" id="subject" placeholder="e.g. Languages" value={form.subject_area} onChange={set('subject_area')} />
            <Input label="Grade Range" id="grade" placeholder="e.g. All ages, Grades 3-5" value={form.grade_level} onChange={set('grade_level')} />
          </div>
          <Textarea label="Description" id="desc" placeholder="What this class covers..." value={form.description} onChange={set('description')} rows={3} />

          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={saving || !form.code.trim() || !form.name.trim()} onClick={save}>
              {saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Create Course'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
