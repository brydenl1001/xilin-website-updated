import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../../lib/supabaseClient'
import { Badge, Button, Modal, Input, Select, Textarea, PageHeader, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'
import { useAuth } from '../../context/AuthContext'

const CATS = ['all', 'urgent', 'events', 'academics', 'general']
const BORDER = { urgent: 'border-l-red-400', events: 'border-l-amber-400', academics: 'border-l-blue-400', general: 'border-l-slate-300' }
const SORT_OPTIONS = [
  { key: 'published_at', label: 'Date' },
  { key: 'title', label: 'Title' },
  { key: 'category', label: 'Category' },
]
const BLANK = { title: '', body: '', category: 'general', is_public: 'false' }

export default function Announcements() {
  const { user } = useAuth()
  const canCreate = ['admin', 'teacher'].includes(user?.role)
  const canManage = user?.role === 'admin'
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState(BLANK)

  const load = () => {
    setLoading(true)
    listAnnouncements()
      .then(setAnnouncements)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const catFiltered = filter === 'all' ? announcements : announcements.filter(a => a.category === filter)
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(catFiltered, { searchKeys: ['title', 'body'], sortOptions: SORT_OPTIONS, initialDir: 'desc' })

  const openNew = () => { setForm(BLANK); setEditingId(null); setShowModal(true) }
  const openEdit = (ann) => {
    setForm({ title: ann.title, body: ann.body, category: ann.category, is_public: ann.is_public ? 'true' : 'false' })
    setEditingId(ann.id); setShowModal(true)
  }
  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.title || !form.body) return
    setSubmitting(true)
    try {
      const payload = { title: form.title, body: form.body, category: form.category, is_public: form.is_public === 'true' }
      if (editingId) await updateAnnouncement(editingId, payload)
      else await createAnnouncement({ ...payload, author_id: user.id })
      setShowModal(false); setForm(BLANK); setEditingId(null)
      load()
    } catch (err) {
      alert(`Failed to save: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      alert(`Failed to delete: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader
        title="Announcements"
        subtitle="School-wide news and updates"
        action={canCreate && <Button onClick={openNew}><Plus size={14} /> New</Button>}
      />

      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-4 w-fit flex-wrap">
        {CATS.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize cursor-pointer ${filter === c ? 'bg-navy text-white' : 'text-slate-500 hover:text-slate-900'}`}>
            {c}
          </button>
        ))}
      </div>

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search announcements..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <div className="space-y-3">
        {loading && <p className="text-center text-slate-400 py-12 text-sm">Loading…</p>}
        {error && <p className="text-center text-red-500 py-12 text-sm">Failed to load: {error}</p>}
        {!loading && !error && filtered.map(ann => (
          <div key={ann.id} onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
            className={`bg-white border-l-4 border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-all ${BORDER[ann.category]}`}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-display text-[15px] text-slate-900 leading-snug">{ann.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!ann.is_public && <Badge variant="default">Internal</Badge>}
                <Badge variant={ann.category}>{ann.category}</Badge>
                {canManage && (
                  <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(ann)} title="Edit"
                      className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(ann.id)} disabled={deletingId === ann.id} title="Delete"
                      className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1 disabled:opacity-40">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-2">{ann.profiles?.full_name || 'School Office'} · {ann.published_at?.slice(0, 10)}</p>
            {expanded === ann.id && (
              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 mt-2 animate-fade-in">{ann.body}</p>
            )}
            <p className="text-xs text-yellow-600 mt-1">{expanded === ann.id ? 'Show less' : 'Read more'}</p>
          </div>
        ))}
        {!loading && !error && filtered.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">No announcements found.</p>}
      </div>

      <Modal open={showModal} onClose={() => !submitting && setShowModal(false)} title={editingId ? 'Edit Announcement' : 'New Announcement'}>
        <div className="space-y-4">
          <Input label="Title" id="at" placeholder="Announcement title" value={form.title} onChange={setField('title')} />
          <Textarea label="Body" id="ab" placeholder="Write your announcement" value={form.body} onChange={setField('body')} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" id="ac" value={form.category} onChange={setField('category')}>
              {['urgent', 'events', 'academics', 'general'].map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Visibility" id="av" value={form.is_public} onChange={setField('is_public')}>
              <option value="true">Public</option>
              <option value="false">Internal Only</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
            <Button variant="gold" onClick={handleSave} disabled={submitting || !form.title || !form.body}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
