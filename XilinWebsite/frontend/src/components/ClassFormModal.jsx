import { useState, useEffect } from 'react'
import { createClass, updateClass, assignTeacherToClass, removeTeacherFromClass } from '../lib/supabaseClient'
import { Button, Modal, Input, Select } from './ui'
import { fmtTime } from '../lib/format'

const CLASS_DAY = 'Sunday' // classes are held on Sundays
const leadOf = (cls) => cls?.class_teachers?.find(ct => ct.role === 'lead')?.profiles || null
const BLANK = { course_id: '', semester_id: '', name: '', room: '', start_time: '', end_time: '', max_students: '', lead_teacher_id: '' }

/**
 * Shared create/edit form for a class. `editing` is the class object (edit) or
 * null/{} (create). Calls onSaved(savedClass) after a successful save.
 */
export default function ClassFormModal({ open, editing, courses = [], semesters = [], teachers = [], onClose, onSaved }) {
  const [form, setForm] = useState(BLANK)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing?.id) {
      setForm({
        course_id: editing.course_id || '', semester_id: editing.semester_id || '', name: editing.name || '',
        room: editing.room || '', start_time: fmtTime(editing.start_time), end_time: fmtTime(editing.end_time),
        max_students: editing.max_students ?? '', lead_teacher_id: leadOf(editing)?.id || '',
      })
    } else {
      const activeSem = semesters.find(s => s.is_active)
      setForm({ ...BLANK, semester_id: activeSem?.id || '' })
    }
    setSaveError('')
  }, [open, editing, semesters])

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
      const saved = editing?.id ? await updateClass(editing.id, payload) : await createClass(payload)
      const classId = saved.id
      // Sync lead teacher if it changed.
      const prevLeadId = editing?.id ? (leadOf(editing)?.id || '') : ''
      const nextLeadId = form.lead_teacher_id || ''
      if (nextLeadId !== prevLeadId) {
        if (prevLeadId) await removeTeacherFromClass(classId, prevLeadId)
        if (nextLeadId) await assignTeacherToClass(classId, nextLeadId, 'lead')
      }
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
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  )
}
