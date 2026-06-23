import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, Save } from 'lucide-react'
import { listMyClasses, getClassRoster, getClassAttendance, bulkMarkAttendance } from '../../lib/supabaseClient'
import { Card, Button, Select, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function TeacherAttendance() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [roster, setRoster] = useState([])
  const [records, setRecords] = useState({})  // student_id -> boolean
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyClasses(user.id)
      .then(data => {
        const list = data.map(d => d.classes)
        setClasses(list)
        if (list[0]) setClassId(list[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  useEffect(() => {
    if (!classId) return
    setLoading(true)
    Promise.all([
      getClassRoster(classId),
      getClassAttendance(classId, date),
    ]).then(([rosterData, attData]) => {
      setRoster(rosterData)
      const existing = {}
      rosterData.forEach(r => { existing[r.profiles.id] = true })  // default present
      attData.forEach(a => { existing[a.student_id] = a.present })
      setRecords(existing)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }, [classId, date])

  const toggle = (studentId) => { setRecords(r => ({ ...r, [studentId]: !r[studentId] })); setSaved(false) }
  const markAll = (val) => {
    const all = {}
    roster.forEach(r => { all[r.profiles.id] = val })
    setRecords(all)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const recordsArray = roster.map(r => ({
        student_id: r.profiles.id,
        class_id: classId,
        date,
        present: records[r.profiles.id] ?? false,
      }))
      await bulkMarkAttendance(recordsArray)
      setSaved(true)
    } catch (err) {
      alert(`Failed to save: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const presentCount = roster.filter(r => records[r.profiles.id]).length
  const total = roster.length

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Attendance" subtitle="Mark daily attendance for your classes" />

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select id="att-cls" value={classId} onChange={e => { setClassId(e.target.value); setSaved(false) }} className="w-40">
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <input type="date" value={date} onChange={e => { setDate(e.target.value); setSaved(false) }}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll(true)}>Mark All Present</Button>
          <Button variant="outline" size="sm" onClick={() => markAll(false)}>Mark All Absent</Button>
          <Button variant="gold" size="sm" onClick={handleSave} disabled={saving || total === 0}>
            <Save size={13} />{saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card><p className="font-display text-2xl text-emerald-600">{presentCount}</p><p className="text-xs text-slate-400 mt-0.5">Present</p></Card>
        <Card><p className="font-display text-2xl text-red-500">{total - presentCount}</p><p className="text-xs text-slate-400 mt-0.5">Absent</p></Card>
        <Card><p className="font-display text-2xl text-slate-900">{total ? Math.round((presentCount / total) * 100) : 0}%</p><p className="text-xs text-slate-400 mt-0.5">Rate</p></Card>
      </div>

      {/* Student list */}
      <Card>
        {loading ? (
          <p className="text-slate-400 text-sm text-center py-6">Loading…</p>
        ) : roster.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No students enrolled in this class.</p>
        ) : (
          <div className="space-y-2">
            {roster.map(r => {
              const present = records[r.profiles.id]
              return (
                <div key={r.profiles.id}
                  onClick={() => toggle(r.profiles.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                    present ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 border-red-200 hover:bg-red-100'
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                      present ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                    }`}>
                      {r.profiles.full_name?.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="text-sm font-medium text-slate-900">{r.profiles.full_name}</span>
                  </div>
                  {present
                    ? <CheckCircle size={18} className="text-emerald-500" />
                    : <XCircle size={18} className="text-red-400" />
                  }
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
