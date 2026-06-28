import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Info } from 'lucide-react'
import { listCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getActiveSemester } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, Textarea, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'
import { semesterEvents, EVENT_CAT } from '../../components/EventCalendar'

const CATEGORY_OPTIONS = [
  { value: 'event', label: 'Event' },
  { value: 'holiday', label: 'Holiday / No class' },
  { value: 'registration', label: 'Registration' },
  { value: 'class', label: 'Class' },
  { value: 'general', label: 'Other' },
]
const BADGE_VARIANT = { registration: 'gold', class: 'navy', 'class-day': 'success', event: 'events', holiday: 'danger', general: 'default' }
const SORT_OPTIONS = [{ key: 'event_date', label: 'Date' }, { key: 'title', label: 'Title' }, { key: 'category', label: 'Category' }]
const BLANK = { title: '', description: '', event_date: '', end_date: '', category: 'event' }
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : ''

export default function AdminCalendar() {
  const [events, setEvents] = useState([])
  const [semester, setSemester] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | {} (new) | event
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listCalendarEvents(), getActiveSemester()])
      .then(([evs, sem]) => { setEvents(evs); setSemester(sem) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const openNew = () => { setForm(BLANK); setEditing({}); setSaveError('') }
  const openEdit = (ev) => {
    setForm({ title: ev.title, description: ev.description || '', event_date: ev.event_date, end_date: ev.end_date || '', category: ev.category })
    setEditing(ev); setSaveError('')
  }

  const save = async () => {
    if (!form.title.trim() || !form.event_date) return
    setSaving(true); setSaveError('')
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      event_date: form.event_date,
      end_date: form.end_date || null,
      category: form.category,
    }
    try {
      if (editing?.id) await updateCalendarEvent(editing.id, payload)
      else await createCalendarEvent(payload)
      setEditing(null); load()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ev) => {
    if (!window.confirm(`Delete "${ev.title}"? This cannot be undone.`)) return
    try { await deleteCalendarEvent(ev.id); setEvents(prev => prev.filter(e => e.id !== ev.id)) }
    catch (e) { alert(`Failed to delete: ${e.message}`) }
  }

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(events, { searchKeys: ['title', 'description', 'category'], sortOptions: SORT_OPTIONS, initialDir: 'asc' })

  // Read-only milestones derived from the active semester (managed on the Semesters page).
  const derived = semesterEvents(semester).filter(e => e.category !== 'class-day')

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Calendar" subtitle="Events shown on the public home-page calendar"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Event</Button>} />

      {derived.length > 0 && (
        <Card className="mb-5 !p-4 bg-slate-50">
          <div className="flex items-start gap-2.5">
            <Info size={15} className="text-slate-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-500">
              <span className="font-medium text-slate-600">Semester milestones</span> below are generated automatically from <span className="font-medium">{semester?.name}</span> (edit them on the Semesters page):
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {derived.map((e, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${(EVENT_CAT[e.category] || EVENT_CAT.general).dot}`} />
                    {e.title} · {fmtDate(e.date)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search events..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Event', 'Date', 'Category', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No events yet. Add one to show it on the home page.</Td></Tr>
            ) : filtered.map(ev => (
              <Tr key={ev.id}>
                <Td>
                  <p className="font-medium text-slate-900">{ev.title}</p>
                  {ev.description && <p className="text-xs text-slate-400 line-clamp-1">{ev.description}</p>}
                </Td>
                <Td className="text-slate-600 text-xs whitespace-nowrap">
                  {fmtDate(ev.event_date)}{ev.end_date ? ` – ${fmtDate(ev.end_date)}` : ''}
                </Td>
                <Td><Badge variant={BADGE_VARIANT[ev.category] || 'default'}>{ev.category}</Badge></Td>
                <Td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(ev)} title="Edit" className="text-slate-400 hover:text-yellow-600 transition-colors cursor-pointer p-1"><Pencil size={14} /></button>
                    <button onClick={() => remove(ev)} title="Delete" className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer p-1"><Trash2 size={14} /></button>
                  </div>
                </Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Event' : 'New Event'}>
        <div className="space-y-4">
          <Input label="Title" id="ce-title" placeholder="e.g. Lunar New Year Showcase" value={form.title} onChange={set('title')} required />
          <Textarea label="Description (optional)" id="ce-desc" rows={2} value={form.description} onChange={set('description')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Date" id="ce-date" type="date" value={form.event_date} onChange={set('event_date')} required />
            <Input label="End Date (optional)" id="ce-end" type="date" value={form.end_date} onChange={set('end_date')} />
          </div>
          <Select label="Category" id="ce-cat" value={form.category} onChange={set('category')}>
            {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={saving || !form.title.trim() || !form.event_date} onClick={save}>
              {saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Add Event'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
