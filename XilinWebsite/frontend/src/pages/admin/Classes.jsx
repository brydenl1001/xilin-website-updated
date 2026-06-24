import { useState, useEffect } from 'react'
import { Plus, Pencil } from 'lucide-react'
import {
  listClasses, createClass, updateClass,
  listCourses, listSemesters, listProfiles,
  assignTeacherToClass, removeTeacherFromClass,
} from '../../lib/supabaseClient'
import { Button, Card, Modal, PageHeader, Table, Tr, Td, Input, Select, ListToolbar } from '../../components/ui'
import { useListControls } from '../../hooks/useListControls'

const SORT_OPTIONS = [
  { key: 'name', label: 'Class' },
  { key: 'courses.name', label: 'Course' },
  { key: 'start_time', label: 'Time' },
  { key: 'room', label: 'Room' },
]

// Classes are held on Sundays only.
const CLASS_DAY = 'Sunday'
const BLANK = { course_id: '', semester_id: '', name: '', room: '', start_time: '', end_time: '', max_students: '', lead_teacher_id: '' }

const fmtTime = (t) => t ? t.slice(0, 5) : ''
const leadOf = (cls) => cls.class_teachers?.find(ct => ct.role === 'lead')?.profiles || null

export default function AdminClasses() {
  const [classes, setClasses] = useState([])
  const [courses, setCourses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const load = () => {
    setLoading(true)
    Promise.all([listClasses(), listCourses(), listSemesters(), listProfiles('teacher')])
      .then(([cl, co, se, te]) => { setClasses(cl); setCourses(co); setSemesters(se); setTeachers(te) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openNew = () => {
    const activeSem = semesters.find(s => s.is_active)
    setForm({ ...BLANK, semester_id: activeSem?.id || '' }); setEditing({}); setSaveError('')
  }
  const openEdit = (c) => {
    setForm({
      course_id: c.course_id || '', semester_id: c.semester_id || '', name: c.name || '',
      room: c.room || '',
      start_time: fmtTime(c.start_time), end_time: fmtTime(c.end_time),
      max_students: c.max_students ?? '', lead_teacher_id: leadOf(c)?.id || '',
    })
    setEditing(c); setSaveError('')
  }
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

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
    }
    try {
      const saved = editing?.id
        ? await updateClass(editing.id, payload)
        : await createClass(payload)
      const classId = saved.id

      // Sync lead teacher if it changed
      const prevLeadId = editing?.id ? (leadOf(editing)?.id || '') : ''
      const nextLeadId = form.lead_teacher_id || ''
      if (nextLeadId !== prevLeadId) {
        if (prevLeadId) await removeTeacherFromClass(classId, prevLeadId)
        if (nextLeadId) await assignTeacherToClass(classId, nextLeadId, 'lead')
      }
      setEditing(null)
      load()
    } catch (e) {
      setSaveError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(classes, { searchKeys: ['name', 'courses.name', 'room'], sortOptions: SORT_OPTIONS })

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Class Management" subtitle="Schedule running classes and assign teachers"
        action={<Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> New Class</Button>} />

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search classes..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Class', 'Course', 'When', 'Room', 'Lead Teacher', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No classes scheduled yet.</Td></Tr>
            ) : filtered.map(c => (
              <Tr key={c.id} onClick={() => openEdit(c)}>
                <Td><span className="font-medium text-slate-900">{c.name}</span></Td>
                <Td className="text-slate-600">{c.courses?.name || '—'}</Td>
                <Td className="text-slate-600 text-xs">
                  {c.day_of_week ? `${c.day_of_week} ${fmtTime(c.start_time)}${c.end_time ? `–${fmtTime(c.end_time)}` : ''}` : '—'}
                </Td>
                <Td className="text-slate-600">{c.room || '—'}</Td>
                <Td className="text-slate-600">{leadOf(c)?.full_name || <span className="text-slate-300">Unassigned</span>}</Td>
                <Td><Pencil size={14} className="text-slate-400" /></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Class' : 'New Class'}>
        <div className="space-y-4">
          <Select label="Course" id="course" value={form.course_id} onChange={set('course_id')}>
            <option value="">Select a course…</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Semester" id="semester" value={form.semester_id} onChange={set('semester_id')}>
              <option value="">Select…</option>
              {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_active ? ' (active)' : ''}</option>)}
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
          <Select label="Lead Teacher" id="lead" value={form.lead_teacher_id} onChange={set('lead_teacher_id')}>
            <option value="">Unassigned</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </Select>

          {saveError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}

          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={saving || !form.name.trim() || !form.course_id} onClick={save}>
              {saving ? 'Saving…' : editing?.id ? 'Save Changes' : 'Create Class'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
