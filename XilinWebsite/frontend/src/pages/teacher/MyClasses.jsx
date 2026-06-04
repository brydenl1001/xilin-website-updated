import { useState } from 'react'
import { Users, BookOpen } from 'lucide-react'
import { Card, Badge, Button, PageHeader } from '../../components/ui'

const MY_CLASSES = [
  { id: 'cls-9a', name: 'Grade 9-A', subject: 'Mathematics', students: 30, room: 'Room 101', schedule: 'Mon, Wed, Fri — 8:00 AM', avgGrade: 'B+', attendance: 94 },
  { id: 'cls-10b', name: 'Grade 10-B', subject: 'Mathematics', students: 28, room: 'Room 101', schedule: 'Mon, Tue — 9:00 AM', avgGrade: 'A-', attendance: 89 },
  { id: 'cls-11a', name: 'Grade 11-A', subject: 'Mathematics', students: 32, room: 'Room 103', schedule: 'Tue, Thu — 8:00 AM', avgGrade: 'B', attendance: 87 },
  { id: 'cls-12a', name: 'Grade 12-A', subject: 'Calculus', students: 25, room: 'Room 105', schedule: 'Tue, Thu — 10:20 AM', avgGrade: 'A', attendance: 96 },
]

const STUDENT_NAMES = ['Emma Watson', 'James Liu', 'Priya Sharma', 'Carlos Ortega', 'Amara Osei', 'Noah Park', 'Sofia Reyes', 'Liam Chen']

export default function TeacherMyClasses() {
  const [selected, setSelected] = useState(null)

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="My Classes" subtitle="Overview of all classes you teach" />

      {selected ? (
        <div className="animate-fade-in">
          <button onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-800 mb-5 flex items-center gap-1 transition-colors">
            ← Back to all classes
          </button>
          <div className="bg-slate-900 rounded-2xl p-6 mb-5 text-white">
            <p className="text-yellow-400 text-xs uppercase tracking-widest mb-2">{selected.subject}</p>
            <h2 className="font-display text-2xl mb-1">{selected.name}</h2>
            <div className="flex gap-6 mt-3 text-sm text-slate-400">
              <span>{selected.room}</span>
              <span>{selected.schedule}</span>
              <span>{selected.students} students</span>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-5">
            <Card><p className="font-display text-2xl text-slate-900">{selected.avgGrade}</p><p className="text-xs text-slate-400 mt-0.5">Class Average</p></Card>
            <Card><p className="font-display text-2xl text-slate-900">{selected.attendance}%</p><p className="text-xs text-slate-400 mt-0.5">Attendance Rate</p></Card>
            <Card><p className="font-display text-2xl text-slate-900">{selected.students}</p><p className="text-xs text-slate-400 mt-0.5">Students</p></Card>
          </div>
          <Card>
            <h3 className="font-display text-base text-slate-900 mb-4">Student Roster</h3>
            <div className="grid grid-cols-2 gap-2">
              {STUDENT_NAMES.slice(0, selected.students > 8 ? 8 : selected.students).map((name, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-lg">
                  <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center text-xs font-semibold text-yellow-700 flex-shrink-0">
                    {name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <span className="text-sm text-slate-700">{name}</span>
                </div>
              ))}
              {selected.students > 8 && (
                <div className="flex items-center gap-2.5 p-2.5 bg-slate-100 rounded-lg text-sm text-slate-400">
                  +{selected.students - 8} more students
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {MY_CLASSES.map(cls => (
            <Card key={cls.id} onClick={() => setSelected(cls)} className="hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                  <BookOpen size={18} className="text-yellow-600" />
                </div>
                <Badge variant="academics">{cls.subject}</Badge>
              </div>
              <h3 className="font-display text-lg text-slate-900 mb-0.5">{cls.name}</h3>
              <p className="text-sm text-slate-400 mb-4">{cls.schedule}</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { label: 'Students', value: cls.students },
                  { label: 'Avg Grade', value: cls.avgGrade },
                  { label: 'Attendance', value: `${cls.attendance}%` },
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 rounded-lg py-2">
                    <p className="text-sm font-semibold text-slate-900">{s.value}</p>
                    <p className="text-[10px] text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
