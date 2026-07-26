import { useState, useEffect } from 'react'
import { Package, CheckCircle2, Info } from 'lucide-react'
import { getFamilyMaterials, listSemesters } from '../../lib/supabaseClient'
import { Card, PageHeader, TableSkeleton, Badge } from '../../components/ui'
import { SemesterPicker } from '../../components/ClassScheduleList'
import { useAuth } from '../../context/AuthContext'
import { useFeedback } from '../../context/FeedbackContext'
import { money } from '../../lib/format'

export default function FamilyMaterials() {
  const { user } = useAuth()
  const { toast } = useFeedback()
  const [rows, setRows] = useState([])
  const [semesters, setSemesters] = useState([])
  const [semId, setSemId] = useState('')
  const [loading, setLoading] = useState(true)

  // Semester list (RLS shows families only active terms); default to current.
  useEffect(() => {
    listSemesters()
      .then(s => {
        setSemesters(s)
        setSemId((s.find(x => x.is_current) || s[0])?.id || '')
      })
      .catch(e => toast.error(e.message))
  }, [])

  useEffect(() => {
    if (!semId) return
    setLoading(true)
    getFamilyMaterials(user.id, semId)
      .then(setRows)
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [user.id, semId])

  // Group by student, preserving the RPC's name ordering.
  const byStudent = []
  const seen = {}
  rows.forEach(r => {
    if (!seen[r.student_id]) { seen[r.student_id] = { id: r.student_id, name: r.student_name, items: [] }; byStudent.push(seen[r.student_id]) }
    seen[r.student_id].items.push(r)
  })

  const outstanding = rows.filter(r => !r.purchased && r.is_required)
  const outstandingTotal = outstanding.reduce((s, r) => s + Number(r.price || 0), 0)

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Class Materials" subtitle="Books and supplies needed for your registered classes" />

      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-sm text-slate-500">
          {outstanding.length > 0
            ? <>Still to buy: <span className="font-semibold text-slate-900">{outstanding.length} required item{outstanding.length === 1 ? '' : 's'}</span> · {money(outstandingTotal)}</>
            : rows.length > 0 ? <span className="text-green-700 font-medium">All required materials purchased. 🎉</span> : null}
        </div>
        <SemesterPicker semesters={semesters} value={semId} onChange={setSemId} className="w-52" />
      </div>

      <div className="bg-navy/5 border border-navy/10 rounded-xl px-4 py-2.5 mb-5 text-xs text-slate-600 flex items-start gap-2">
        <Info size={14} className="text-navy/40 flex-shrink-0 mt-0.5" />
        <span>Materials are purchased <span className="font-medium">in person at the front office</span> — they can't be bought online. Bring this list with you; staff will mark items as purchased.</span>
      </div>

      {loading ? (
        <Card className="!p-0 overflow-hidden"><TableSkeleton rows={5} /></Card>
      ) : byStudent.length === 0 ? (
        <Card><p className="py-10 text-center text-slate-400 text-sm">No materials needed for this term's classes.</p></Card>
      ) : (
        <div className="space-y-5">
          {byStudent.map(st => {
            const due = st.items.filter(i => !i.purchased && i.is_required)
            const dueTotal = due.reduce((s, i) => s + Number(i.price || 0), 0)
            return (
              <div key={st.id}>
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <h3 className="font-display text-base text-slate-800">{st.name}</h3>
                  <span className="text-xs text-slate-400">
                    {due.length > 0 ? <>{due.length} to buy · <span className="font-medium text-slate-600">{money(dueTotal)}</span></> : 'All set'}
                  </span>
                </div>
                <Card className="!p-0 overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {st.items.map(i => (
                      <div key={i.material_id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i.purchased ? 'bg-slate-50/60' : ''}`}>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-medium ${i.purchased ? 'text-slate-500' : 'text-slate-900'}`}>{i.material_name}</span>
                            {!i.is_required && <Badge variant="default">Optional</Badge>}
                          </span>
                          {i.description && <span className="block text-xs text-slate-400 mt-0.5 truncate">{i.description}</span>}
                          <span className="block text-[11px] text-slate-400 mt-0.5 flex items-center gap-1"><Package size={10} /> {i.classes}</span>
                        </span>
                        <span className="flex items-center gap-3 flex-shrink-0">
                          {i.purchased
                            ? <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Purchased</span>
                            : <span className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 bg-amber-100 text-amber-700">To buy</span>}
                          <span className={`text-sm font-semibold ${i.purchased ? 'text-slate-400' : 'text-slate-900'}`}>{money(i.price)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
