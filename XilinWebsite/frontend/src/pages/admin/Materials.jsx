import { useState, useEffect } from 'react'
import { Plus, Pencil, Package } from 'lucide-react'
import { listMaterials, createMaterial, updateMaterial } from '../../lib/supabaseClient'
import { Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Textarea, ListToolbar, TableSkeleton } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'
import { useFeedback } from '../../context/FeedbackContext'
import { money } from '../../lib/format'

const BLANK = { name: '', description: '', price: '', is_active: true }
const SORT_OPTIONS = [
  { key: 'name', label: 'Name' },
  { key: 'price', label: 'Price' },
]

export default function AdminMaterials() {
  const { toast } = useFeedback()
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [editing, setEditing] = useState(null) // material being edited, or {} for new
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    listMaterials(false) // fetch all; filter client-side so the toggle is instant
      .then(setMaterials)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => { setForm(BLANK); setEditing({}); setSaveError('') }
  const openEdit = (m) => {
    setForm({ name: m.name || '', description: m.description || '', price: m.price ?? '', is_active: m.is_active })
    setEditing(m); setSaveError('')
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.name.trim()) { setSaveError('Name is required.'); return }
    setSaving(true); setSaveError('')
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price === '' ? 0 : Number(form.price),
      is_active: form.is_active,
    }
    try {
      if (editing?.id) await updateMaterial(editing.id, payload)
      else await createMaterial(payload)
      setEditing(null)
      toast.success(editing?.id ? 'Material updated.' : 'Material added.')
      load()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const visible = showArchived ? materials : materials.filter(m => m.is_active)
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(visible, { searchKeys: ['name', 'description'], sortOptions: SORT_OPTIONS })

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Materials Catalog" subtitle="Textbooks and supplies that classes require — sold in person at the front office"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Material</Button>} />

      <div className="flex items-center gap-1.5 mb-3">
        {[{ v: false, l: 'Active' }, { v: true, l: 'Include archived' }].map(o => (
          <button key={o.l} onClick={() => setShowArchived(o.v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${showArchived === o.v ? 'bg-navy text-white border-navy' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
            {o.l}
          </button>
        ))}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search materials..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <TableSkeleton rows={6} />
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Material', 'Description', 'Price', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No materials yet. Add your first one.</Td></Tr>
            ) : filtered.map(m => (
              <Tr key={m.id} onClick={() => openEdit(m)}>
                <Td>
                  <p className="font-medium text-slate-900 flex items-center gap-2">
                    <Package size={13} className="text-slate-300" />{m.name}
                    {!m.is_active && <span className="text-[10px] uppercase tracking-wide text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">Archived</span>}
                  </p>
                </Td>
                <Td className="text-slate-500 text-xs max-w-sm truncate">{m.description || '—'}</Td>
                <Td className="text-slate-700 font-medium">{money(m.price)}</Td>
                <Td><Pencil size={14} className="text-slate-400" /></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Material' : 'New Material'}>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Input label="Name" id="mname" placeholder="e.g. Level 2 Textbook" value={form.name} onChange={set('name')} required />
            </div>
            <Input label="Price ($)" id="mprice" type="number" placeholder="0" value={form.price} onChange={set('price')} />
          </div>
          <Textarea label="Description" id="mdesc" rows={3} placeholder="What this material is, edition, etc." value={form.description} onChange={set('description')} />
          {editing?.id && (
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: !e.target.checked }))}
                className="rounded border-slate-300 cursor-pointer" />
              Archive this material (hidden from new class links and family lists)
            </label>
          )}
          <p className="text-xs text-slate-400">Materials are purchased in person at the front office — families see what they need, admins record the sale.</p>

          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={saving || !form.name.trim()} onClick={save}>
              {saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Add Material'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
