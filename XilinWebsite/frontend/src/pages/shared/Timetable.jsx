import { useState, useEffect } from 'react'
import { listMyClasses, listClasses } from '../../lib/supabaseClient'
import { Card, PageHeader, Badge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { AlertTriangle } from 'lucide-react'

/**
 * NOTE: The current schema has no `schedule` / `timetable` table — `classes`
 * stores course + semester + teacher, but not which day/period it meets.
 * Until that table exists, this page lists the student/teacher's classes
 * for the active semester instead of a day-by-day grid.
 *
 * To support a real day/period grid, add a table along these lines:
 *
 *   create table class_schedule (
 *     id          uuid primary key default uuid_generate_v4(),
 *     class_id    uuid references classes(id) on delete cascade,
 *     day_of_week int not null,        -- 0=Sunday .. 6=Saturday
 *     start_time  time not null,
 *     end_time    time not null,
 *     room        text
 *   );
 *
 * Then this page would fetch class_schedule joined to classes(courses(*))
 * and render a real grid instead of the list below.
 */

export default function Timetable({ subtitle = 'Your classes this semester' }) {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        if (user.role === 'teacher') {
          const data = await listMyClasses(user.id)
          setClasses(data.map(d => d.classes))
        } else {
          // Student/parent: list all classes (RLS scopes appropriately;
          // for a true "my enrolled classes" view, join through enrollments)
          const data = await listClasses()
          setClasses(data)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Timetable" subtitle={subtitle} />

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          Day-by-day period scheduling isn't in the database yet — this shows your assigned classes
          for the active semester instead. Add a <code className="text-xs bg-amber-100 px-1 rounded">class_schedule</code> table
          to enable a full weekly grid.
        </p>
      </div>

      {loading && <p className="text-slate-400 text-sm text-center py-12">Loading…</p>}
      {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}

      {!loading && !error && (
        <Card className="!p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-display text-base text-slate-900">Your Classes</h3>
          </div>
          {classes.length === 0 ? (
            <p className="text-center text-slate-400 py-12 text-sm">No classes found for the active semester.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{cls.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {cls.courses?.name} · {cls.semesters?.name} {cls.room ? `· ${cls.room}` : ''}
                    </p>
                  </div>
                  <Badge variant="academics">{cls.courses?.subject_area || 'General'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
