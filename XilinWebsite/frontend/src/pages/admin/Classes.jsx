import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  listClasses, listCourses, listSemesters, listProfiles, getClassCounts,
} from '../../lib/supabaseClient'
import { Badge, Button, Card, PageHeader, Table, Tr, Td, ListToolbar } from '../../components/ui'
import ClassFormModal from '../../components/ClassFormModal'
import { useListControls } from '../../hooks/useListControls'
import { fmtTime } from '../../lib/format'

const SORT_OPTIONS = [
  { key: 'name', label: 'Class' },
  { key: 'courses.name', label: 'Course' },
  { key: 'start_time', label: 'Time' },
  { key: 'room', label: 'Room' },
]

const leadOf = (cls) => cls.class_teachers?.find(ct => ct.role === 'lead')?.profiles || null

export default function AdminClasses() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [courses, setCourses] = useState([])
  const [semesters, setSemesters] = useState([])
  const [teachers, setTeachers] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([listClasses(), listCourses(), listSemesters(), listProfiles('teacher'), getClassCounts()])
      .then(([cl, co, se, te, cn]) => { setClasses(cl); setCourses(co); setSemesters(se); setTeachers(te); setCounts(cn) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const { query, setQuery, sortKey, setSortKey, sortDir, toggleDir, result: filtered } =
    useListControls(classes, { searchKeys: ['name', 'courses.name', 'room'], sortOptions: SORT_OPTIONS })

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Class Management" subtitle="Schedule running classes and assign teachers"
        action={<Button variant="gold" size="sm" onClick={() => setCreating(true)}><Plus size={14} /> New Class</Button>} />

      <ListToolbar query={query} onQuery={setQuery} placeholder="Search classes..."
        sortOptions={SORT_OPTIONS} sortKey={sortKey} onSortKey={setSortKey} sortDir={sortDir} onToggleDir={toggleDir} />

      <Card className="!p-0 overflow-hidden">
        {loading ? (
          <p className="py-12 text-center text-slate-400 text-sm">Loading…</p>
        ) : error ? (
          <p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p>
        ) : (
          <Table headers={['Class', 'Course', 'When', 'Enrolled', 'Lead Teacher', '']}>
            {filtered.length === 0 ? (
              <Tr><Td className="py-12 text-center text-slate-400">No classes scheduled yet.</Td></Tr>
            ) : filtered.map(c => {
              const enrolled = counts[c.id] || 0
              const cap = c.max_students
              const full = cap != null && enrolled >= cap
              return (
                <Tr key={c.id} onClick={() => navigate(`/class/${c.id}`)}>
                  <Td><span className="font-medium text-slate-900">{c.name}</span></Td>
                  <Td className="text-slate-600">{c.courses?.name || '—'}</Td>
                  <Td className="text-slate-600 text-xs">
                    {c.day_of_week ? `${c.day_of_week} ${fmtTime(c.start_time)}${c.end_time ? `–${fmtTime(c.end_time)}` : ''}` : '—'}
                  </Td>
                  <Td>
                    <span className="text-slate-600 text-sm">{enrolled}{cap != null ? ` / ${cap}` : ''}</span>
                    {full && <Badge variant="danger">Full</Badge>}
                  </Td>
                  <Td className="text-slate-600">{leadOf(c)?.full_name || <span className="text-slate-300">Unassigned</span>}</Td>
                  <Td><span className="text-xs text-yellow-600">Manage →</span></Td>
                </Tr>
              )
            })}
          </Table>
        )}
      </Card>

      <ClassFormModal
        open={creating}
        editing={null}
        courses={courses}
        semesters={semesters}
        teachers={teachers}
        onClose={() => setCreating(false)}
        onSaved={(saved) => { setCreating(false); navigate(`/class/${saved.id}`) }}
      />
    </div>
  )
}
