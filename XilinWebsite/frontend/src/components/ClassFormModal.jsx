import { useState, useEffect } from 'react'
import { Plus, X, Search } from 'lucide-react'
import { createClass, updateClass, assignTeacherToClass, removeTeacherFromClass, listMaterials, listClassMaterials, setClassMaterials } from '../lib/supabaseClient'
import { Button, Modal, Input, Select } from './ui'
import { fmtTime, money } from '../lib/format'

const CLASS_DAY = 'Sunday' // classes are held on Sundays
const leadOf = (cls) => cls?.class_teachers?.find(ct => ct.role === 'lead')?.profiles || null
const BLANK = { course_id: '', semester_id: '', name: '', room: '', start_time: '', end_time: '', max_students: '', price: '', lead_teacher_id: '' }

/**
 * Shared create/edit form for a class. `editing` is the class object (edit) or
 * null/{} (create). Calls onSaved(savedClass) after a successful save.
 */
export default function ClassFormModal({ open, editing, courses = [], semesters = [], teachers = [], onClose, onSaved }) {
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  // Catalog materials this class requires: Map of material_id → is_required.
  const [catalog, setCatalog] = useState([])
  const [picked, setPicked] = useState(() => new Map())
  const [matQuery, setMatQuery] = useState('')
  // Until the class's existing links load, we can't tell which catalog items are
  // already assigned — rendering the "add" list early would offer duplicates and
  // any click would be overwritten when the fetch resolves.
  const [matLoading, setMatLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    if (editing?.id) {
      setForm({
        course_id: editing.course_id || '', semester_id: editing.semester_id || '', name: editing.name || '',
        room: editing.room || '', start_time: fmtTime(editing.start_time), end_time: fmtTime(editing.end_time),
        max_students: editing.max_students ?? '', price: editing.price ?? '',
        lead_teacher_id: leadOf(editing)?.id || '',
      })
    } else {
      const defaultSem = semesters.find(s => s.is_current) || semesters.find(s => s.is_active)
      setForm({ ...BLANK, semester_id: defaultSem?.id || '' })
    }
    setSaveError('')
    setMatQuery('')

    // Load the catalog and this class's existing links together, so the picker
    // only renders once we know what's already assigned.
    let live = true
    setMatLoading(true)
    setPicked(new Map())
    Promise.all([
      listMaterials().catch(() => []),
      editing?.id ? listClassMaterials(editing.id).catch(() => []) : Promise.resolve([]),
    ]).then(([cat, links]) => {
      if (!live) return
      setCatalog(cat)
      setPicked(new Map(links.map(r => [r.material_id, r.is_required])))
    }).finally(() => { if (live) setMatLoading(false) })
    return () => { live = false }
  }, [open, editing, semesters])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const addMaterial = (id) => setPicked(prev => new Map(prev).set(id, true)) // defaults to required
  const removeMaterial = (id) => setPicked(prev => { const next = new Map(prev); next.delete(id); return next })
  const setRequired = (id, required) => setPicked(prev => new Map(prev).set(id, required))

  const save = async () => {
    setSaving(true); setSaveError('')
    const payload = {
      course_id: form.course_id || null,
      semester_id: form.semester_id || null,
      name: form.name.trim(),
      room: form.room.trim() || null,
      day_of_week: CLASS_DAY,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      max_students: form.max_students === '' ? null : Number(form.max_students),
      price: form.price === '' ? null : Number(form.price),
    }
    try {
      const saved = editing?.id ? await updateClass(editing.id, payload) : await createClass(payload)
      const classId = saved.id
      // Sync lead teacher if it changed.
      const prevLeadId = editing?.id ? (leadOf(editing)?.id || '') : ''
      const nextLeadId = form.lead_teacher_id || ''
      if (nextLeadId !== prevLeadId) {
        if (prevLeadId) await removeTeacherFromClass(classId, prevLeadId)
        if (nextLeadId) await assignTeacherToClass(classId, nextLeadId, 'lead')
      }
      // Replace the class's material links (works for both create and edit).
      await setClassMaterials(classId, [...picked].map(([material_id, is_required]) => ({ material_id, is_required })))
      onSaved?.(saved)
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing?.id ? 'Edit Class' : 'New Class'}>
      <div className="space-y-4">
        <Select label="Course" id="course" value={form.course_id} onChange={set('course_id')}>
          <option value="">Select a course…</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </Select>
        <div className="grid grid-cols-2 gap-3">
          <Select label="Semester" id="semester" value={form.semester_id} onChange={set('semester_id')}>
            <option value="">Select…</option>
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>)}
          </Select>
          <Input label="Class Name" id="name" placeholder="e.g. Beginner Mandarin — Sec A" value={form.name} onChange={set('name')} required />
        </div>
        <div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" id="start" type="time" value={form.start_time} onChange={set('start_time')} />
            <Input label="End Time" id="end" type="time" value={form.end_time} onChange={set('end_time')} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">All classes are held on <span className="font-medium text-slate-600">Sundays</span>.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Room" id="room" placeholder="e.g. Room 3" value={form.room} onChange={set('room')} />
          <Input label="Max Students" id="max" type="number" placeholder="e.g. 30" value={form.max_students} onChange={set('max_students')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Tuition ($)" id="price" type="number" placeholder="e.g. 320" value={form.price} onChange={set('price')} />
          <Select label="Lead Teacher" id="lead" value={form.lead_teacher_id} onChange={set('lead_teacher_id')}>
            <option value="">Unassigned</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>
        </div>

        {/* Materials this class needs (bought in person; not part of tuition).
            Selected items stay pinned at the top so they're never lost behind a
            search when the catalog is large. */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Materials{picked.size > 0 && <span className="text-slate-400 font-normal"> · {picked.size} selected</span>}
          </label>

          {matLoading ? (
            <p className="text-xs text-slate-400">Loading materials…</p>
          ) : catalog.length === 0 ? (
            <p className="text-xs text-slate-400">No materials in the catalog yet — add them under Materials.</p>
          ) : (
            <>
              {/* Selected */}
              {picked.size > 0 && (
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 mb-2">
                  {[...picked.keys()].map(id => {
                    const m = catalog.find(x => x.id === id)
                    if (!m) return null
                    return (
                      <div key={id} className="flex items-center justify-between gap-2 px-3 py-2 bg-yellow-50/40">
                        <span className="min-w-0">
                          <span className="block text-sm text-slate-900 truncate">{m.name}</span>
                          <span className="block text-[11px] text-slate-400">{money(m.price)}</span>
                        </span>
                        <span className="flex items-center gap-1.5 flex-shrink-0">
                          <select value={picked.get(id) ? 'required' : 'optional'}
                            onChange={e => setRequired(id, e.target.value === 'required')}
                            className="text-[11px] border border-slate-200 rounded-lg px-2 h-7 bg-white outline-none text-slate-600 cursor-pointer">
                            <option value="required">Required</option>
                            <option value="optional">Optional</option>
                          </select>
                          <button type="button" onClick={() => removeMaterial(id)} title="Remove"
                            className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer">
                            <X size={13} />
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Search + add from the rest of the catalog */}
              {(() => {
                const available = catalog.filter(m => !picked.has(m.id))
                const q = matQuery.trim().toLowerCase()
                const shown = q
                  ? available.filter(m => m.name?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q))
                  : available
                if (available.length === 0) {
                  return <p className="text-xs text-slate-400">All catalog materials are added to this class.</p>
                }
                return (
                  <>
                    <div className="relative">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                      <input value={matQuery} onChange={e => setMatQuery(e.target.value)}
                        placeholder={`Search ${available.length} material${available.length === 1 ? '' : 's'}…`}
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-slate-200 outline-none focus:border-yellow-400" />
                    </div>
                    <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-40 overflow-y-auto mt-2">
                      {shown.length === 0 ? (
                        <p className="text-xs text-slate-400 text-center py-4">No materials match “{matQuery}”.</p>
                      ) : shown.slice(0, 50).map(m => (
                        <button key={m.id} type="button" onClick={() => addMaterial(m.id)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                          <span className="min-w-0">
                            <span className="block text-sm text-slate-900 truncate">{m.name}</span>
                            {m.description && <span className="block text-[11px] text-slate-400 truncate">{m.description}</span>}
                          </span>
                          <span className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-slate-500">{money(m.price)}</span>
                            <span className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 text-slate-500"><Plus size={12} /></span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )
              })()}
            </>
          )}
          <p className="text-xs text-slate-400 mt-1.5">Families buy these in person at the front office — they aren't included in tuition.</p>
        </div>

        {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <Button variant="gold" size="sm" disabled={saving || !form.name.trim() || !form.course_id} onClick={save}>
            {saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Create Class'}
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
