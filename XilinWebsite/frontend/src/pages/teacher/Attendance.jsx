import { useState } from 'react'
import { CheckCircle, XCircle, Save } from 'lucide-react'
import { Card, Button, Select, PageHeader } from '../../components/ui'

const STUDENT_LIST = ['Emma Watson', 'James Liu', 'Priya Sharma', 'Carlos Ortega', 'Amara Osei', 'Noah Park', 'Sofia Reyes', 'Liam Chen', 'Maya Thompson', 'Ethan Park']
const CLASSES = ['Grade 9-A', 'Grade 10-B', 'Grade 11-A', 'Grade 12-A']

export default function TeacherAttendance() {
  const [cls, setCls] = useState('Grade 10-B')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [records, setRecords] = useState(
    STUDENT_LIST.reduce((acc, name) => ({ ...acc, [name]: true }), {})
  )
  const [saved, setSaved] = useState(false)

  const toggle = (name) => { setRecords(r => ({ ...r, [name]: !r[name] })); setSaved(false) }
  const markAll = (val) => { setRecords(STUDENT_LIST.reduce((acc, n) => ({ ...acc, [n]: val }), {})); setSaved(false) }

  const presentCount = Object.values(records).filter(Boolean).length

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Attendance" subtitle="Mark daily attendance for your classes" />

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select id="att-cls" value={cls} onChange={e => setCls(e.target.value)} className="w-40">
          {CLASSES.map(c => <option key={c}>{c}</option>)}
        </Select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 transition-all" />
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markAll(true)}>Mark All Present</Button>
          <Button variant="outline" size="sm" onClick={() => markAll(false)}>Mark All Absent</Button>
          <Button variant="gold" size="sm" onClick={() => setSaved(true)}>
            <Save size={13} />{saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <Card>
          <p className="font-display text-2xl text-emerald-600">{presentCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Present</p>
        </Card>
        <Card>
          <p className="font-display text-2xl text-red-500">{STUDENT_LIST.length - presentCount}</p>
          <p className="text-xs text-slate-400 mt-0.5">Absent</p>
        </Card>
        <Card>
          <p className="font-display text-2xl text-slate-900">{Math.round((presentCount / STUDENT_LIST.length) * 100)}%</p>
          <p className="text-xs text-slate-400 mt-0.5">Rate</p>
        </Card>
      </div>

      {/* Student list */}
      <Card>
        <div className="space-y-2">
          {STUDENT_LIST.map((name, i) => {
            const present = records[name]
            return (
              <div key={name}
                onClick={() => toggle(name)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border ${
                  present ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' : 'bg-red-50 border-red-200 hover:bg-red-100'
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                    present ? 'bg-emerald-200 text-emerald-800' : 'bg-red-200 text-red-800'
                  }`}>
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm font-medium text-slate-900">{name}</span>
                </div>
                {present
                  ? <CheckCircle size={18} className="text-emerald-500" />
                  : <XCircle size={18} className="text-red-400" />
                }
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
