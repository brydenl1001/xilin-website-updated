import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { publicAnnouncements } from '../../lib/mockData'
import { Badge, Button, Modal, Input, Select, Textarea, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const CATS = ['all', 'urgent', 'events', 'academics', 'general']
const BORDER = { urgent: 'border-l-red-400', events: 'border-l-amber-400', academics: 'border-l-blue-400', general: 'border-l-slate-300' }

export default function Announcements() {
  const { user } = useAuth()
  const canCreate = ['admin', 'teacher'].includes(user?.role)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', category: 'general', is_public: 'false' })

  const filtered = publicAnnouncements.filter(a => {
    if (filter !== 'all' && a.category !== filter) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="max-w-4xl animate-fade-in">
      <PageHeader
        title="Announcements"
        subtitle="School-wide news and updates"
        action={canCreate && <Button onClick={() => setShowModal(true)}><Plus size={14} /> New</Button>}
      />
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {CATS.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === c ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'}`}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 h-9 ml-auto">
          <Search size={13} className="text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="text-xs outline-none w-36 placeholder:text-slate-400" />
        </div>
      </div>
      <div className="space-y-3">
        {filtered.map(ann => (
          <div key={ann.id} onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
            className={`bg-white border-l-4 border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-all ${BORDER[ann.category]}`}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-display text-[15px] text-slate-900 leading-snug">{ann.title}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!ann.is_public && <Badge variant="default">Internal</Badge>}
                <Badge variant={ann.category}>{ann.category}</Badge>
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-2">{ann.author} · {ann.published_at}</p>
            {expanded === ann.id && (
              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 mt-2 animate-fade-in">{ann.body}</p>
            )}
            <p className="text-xs text-yellow-600 mt-1">{expanded === ann.id ? 'Show less' : 'Read more'}</p>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-center text-slate-400 py-12 text-sm">No announcements found.</p>}
      </div>
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Announcement">
        <div className="space-y-4">
          <Input label="Title" id="at" placeholder="Announcement title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <Textarea label="Body" id="ab" placeholder="Write your announcement" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" id="ac" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {['urgent', 'events', 'academics', 'general'].map(c => <option key={c}>{c}</option>)}
            </Select>
            <Select label="Visibility" id="av" value={form.is_public} onChange={e => setForm(f => ({ ...f, is_public: e.target.value }))}>
              <option value="true">Public</option>
              <option value="false">Internal Only</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="gold" onClick={() => setShowModal(false)}>Publish</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
