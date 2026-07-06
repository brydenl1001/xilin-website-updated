import { useState, useEffect } from 'react'
import { Pencil, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listAboutPages, updateAboutPage } from '../../lib/supabaseClient'
import { Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Textarea, TableSkeleton } from '../../components/ui'
import { GROUP_ORDER, pathFor } from '../../lib/aboutNav'

export default function AdminAboutPages() {
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', body: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    listAboutPages().then(setPages).catch(e => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openEdit = (p) => { setEditing(p); setForm({ title: p.title, body: p.body || '' }); setSaveError('') }

  const save = async () => {
    if (!form.title.trim()) return
    setSaving(true); setSaveError('')
    try {
      await updateAboutPage(editing.id, { title: form.title.trim(), body: form.body })
      setEditing(null); load()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const groups = GROUP_ORDER
    .map(g => ({ group: g, items: pages.filter(p => p.nav_group === g).sort((a, b) => a.sort_order - b.sort_order) }))
    .filter(g => g.items.length > 0)

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="About Pages" subtitle="Edit the content of the public About section" />

      {loading ? (
        <Card><TableSkeleton rows={6} /></Card>
      ) : error ? (
        <Card><p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p></Card>
      ) : groups.map(({ group, items }) => (
        <div key={group} className="mb-6">
          <h3 className="font-display text-base text-slate-900 mb-2 px-1">{group}</h3>
          <Card className="!p-0 overflow-hidden">
            <Table headers={['Page', 'Last Updated', '']}>
              {items.map(p => (
                <Tr key={p.id} onClick={() => openEdit(p)}>
                  <Td>
                    <p className="font-medium text-slate-900">{p.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-1">{(p.body || '').replace(/[#*\-\[\]]/g, '').slice(0, 90) || 'No content yet'}</p>
                  </Td>
                  <Td className="text-slate-400 text-xs whitespace-nowrap">{p.updated_at?.slice(0, 10) || '—'}</Td>
                  <Td>
                    <div className="flex items-center gap-1 justify-end" onClick={e => e.stopPropagation()}>
                      <Link to={pathFor(p.slug)} title="View on public site"
                        className="text-slate-400 hover:text-yellow-600 transition-colors p-1"><ExternalLink size={14} /></Link>
                      <button onClick={() => openEdit(p)} title="Edit"
                        className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1"><Pencil size={14} /></button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Table>
          </Card>
        </div>
      ))}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `Edit — ${editing.title}` : 'Edit Page'} maxWidth="max-w-2xl">
        <div className="space-y-4">
          <Input label="Page Title" id="ap-title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
          <div>
            <Textarea label="Content" id="ap-body" rows={16} value={form.body}
              onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Write the page content here…" />
            <p className="text-xs text-slate-400 mt-1.5">
              Formatting: blank line = new paragraph · <code className="bg-slate-100 px-1 rounded">## Heading</code> · <code className="bg-slate-100 px-1 rounded">### Subheading</code> · <code className="bg-slate-100 px-1 rounded">- bullet</code> · <code className="bg-slate-100 px-1 rounded">**bold**</code> · <code className="bg-slate-100 px-1 rounded">[link text](https://…)</code>
            </p>
          </div>
          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={saving || !form.title.trim()} onClick={save}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
