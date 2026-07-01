import { useState, useEffect } from 'react'
import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { listMyClasses } from '../../lib/supabaseClient'
import { Card, Badge, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export default function TeacherMyClasses() {
  const { user } = useAuth()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listMyClasses(user.id)
      .then(data => setClasses(data.map(d => d.classes)))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user.id])

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="My Classes" subtitle="Overview of all classes you teach" />

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="text-slate-400 text-sm text-center py-12">No classes assigned to you yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {classes.map(cls => (
            <Link key={cls.id} to={`/class/${cls.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center">
                    <BookOpen size={18} className="text-yellow-600" />
                  </div>
                  <Badge variant="academics">{cls.courses?.subject_area || 'General'}</Badge>
                </div>
                <h3 className="font-display text-lg text-slate-900 mb-0.5">{cls.name}</h3>
                <p className="text-sm text-slate-400">{cls.courses?.name}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
