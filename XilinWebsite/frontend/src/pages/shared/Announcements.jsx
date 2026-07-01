import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Upload, X } from 'lucide-react'
import { listAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement, listSemesters, uploadAnnouncementMedia, announcementImages as imagesOf } from '../../lib/supabaseClient'
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
const BLANK = { title: '', body: '', category: 'general', is_public: 'false', semester_id: '', media_urls: [] }

export default function Announcements() {
  const { user } = useAuth()
  const canCreate = ['admin', 'teacher'].includes(user?.role)
  const canManage = user?.role === 'admin'
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [viewing, setViewing] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [semesters, setSemesters] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploading(true); setUploadError('')
    try {
      const urls = []
      for (const file of files) urls.push(await uploadAnnouncementMedia(file))
      setForm(f => ({ ...f, media_urls: [...f.media_urls, ...urls] }))
    } catch (err) {
      setUploadError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }
  const removeImage = (url) => setForm(f => ({ ...f, media_urls: f.media_urls.filter(u => u !== url) }))

  const load = () => {
    setLoading(true)
    listAnnouncements()
      .then(setAnnouncements)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load(); listSemesters().then(setSemesters).catch(() => {}) }, [])
  const semesterName = (id) => semesters.find(s => s.id === id)?.name

  const catFiltered = filter === 'all' ? announcements : announcements.filter(a => a.category === filter)
  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(catFiltered, { searchKeys: ['title', 'body'], sortOptions: SORT_OPTIONS, initialDir: 'desc' })

  const openNew = () => { setForm(BLANK); setEditingId(null); setUploadError(''); setShowModal(true) }
  const openEdit = (ann) => {
    setForm({ title: ann.title, body: ann.body, category: ann.category, is_public: ann.is_public ? 'true' : 'false', semester_id: ann.semester_id || '', media_urls: imagesOf(ann) })
    setEditingId(ann.id); setUploadError(''); setShowModal(true)
  }
  const setField = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async () => {
    if (!form.title || !form.body) return
    setSubmitting(true)
    try {
      const payload = { title: form.title, body: form.body, category: form.category, is_public: form.is_public === 'true', semester_id: form.semester_id || null, media_urls: form.media_urls, media_url: form.media_urls[0] || null }
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
          <div key={ann.id} onClick={() => setViewing(ann)}
            className={`bg-white border-l-4 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-slate-300 transition-all ${BORDER[ann.category]}`}>
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
            <p className="text-xs text-slate-400">{ann.profiles?.full_name || 'School Office'} · {ann.published_at?.slice(0, 10)}</p>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{ann.body}</p>
            {imagesOf(ann).length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin">
                {imagesOf(ann).map((url, i) => (
                  <img key={i} src={url} alt="" className="h-24 w-32 flex-shrink-0 object-cover rounded-lg border border-slate-100" />
                ))}
              </div>
            )}
          </div>
        ))}
        {!loading && !error && filtered.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">No announcements found.</p>}
      </div>

      {/* View popup */}
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={viewing?.title || 'Announcement'} maxWidth="max-w-2xl">
        {viewing && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {!viewing.is_public && <Badge variant="default">Internal</Badge>}
              <Badge variant={viewing.category}>{viewing.category}</Badge>
              <span className="text-xs text-slate-400">{viewing.profiles?.full_name || 'School Office'} · {viewing.published_at?.slice(0, 10)}</span>
            </div>
            {imagesOf(viewing).length > 0 && (
              <div className="space-y-3">
                {imagesOf(viewing).map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-lg w-full max-h-80 object-cover border border-slate-100" />
                ))}
              </div>
            )}
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{viewing.body}</p>
            {semesterName(viewing.semester_id) && <p className="text-xs text-slate-400">Semester: {semesterName(viewing.semester_id)}</p>}
          </div>
        )}
      </Modal>

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
          <Select label="Semester (optional)" id="asem" value={form.semester_id} onChange={setField('semester_id')}>
            <option value="">All / none</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Images (optional)</label>
            {form.media_urls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                {form.media_urls.map(url => (
                  <div key={url} className="relative">
                    <img src={url} alt="" className="rounded-lg h-24 w-full object-cover border border-slate-200" />
                    <button type="button" onClick={() => removeImage(url)}
                      className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 text-slate-500 hover:text-red-500 shadow cursor-pointer" title="Remove image">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className={`flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-lg py-5 transition-colors ${uploading ? 'border-slate-200 opacity-60 cursor-wait' : 'border-slate-200 hover:border-yellow-300 hover:bg-yellow-50/40 cursor-pointer'}`}>
              <Upload size={18} className="text-slate-400" />
              <span className="text-xs text-slate-500">{uploading ? 'Uploading…' : form.media_urls.length ? 'Add more images' : 'Click to upload image(s)'}</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={handleFile} disabled={uploading} />
            </label>
            {uploadError && <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={submitting}>Cancel</Button>
            <Button variant="gold" onClick={handleSave} disabled={submitting || uploading || !form.title || !form.body}>
              {submitting ? 'Saving…' : editingId ? 'Save Changes' : 'Publish'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
