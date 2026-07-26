import { useState, useEffect } from 'react'
import { Check, CheckCircle2, ShoppingCart, RefreshCw, Package, Info } from 'lucide-react'
import { listFamilies, listSemesters, listMaterials, getFamilyMaterials, purchaseMaterials } from '../../lib/supabaseClient'
import { Button, Card, PageHeader, Select, Input, TableSkeleton, Badge } from '../../components/ui'
import { SemesterPicker } from '../../components/ClassScheduleList'
import { useFeedback } from '../../context/FeedbackContext'
import { money } from '../../lib/format'

const keyOf = (studentId, materialId) => `${studentId}:${materialId}`

export default function AdminMaterialsPurchase() {
  const { toast, confirm } = useFeedback()
  const [families, setFamilies] = useState([])
  const [semesters, setSemesters] = useState([])
  const [catalog, setCatalog] = useState([])
  const [familyId, setFamilyId] = useState('')
  const [semId, setSemId] = useState('')

  const [rows, setRows] = useState([])
  const [loadingRows, setLoadingRows] = useState(false)
  const [cart, setCart] = useState(() => new Map())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([listFamilies(), listSemesters(), listMaterials()])
      .then(([f, s, m]) => {
        setFamilies(f.filter(x => x.status !== 'inactive'))
        setSemesters(s)
        setSemId((s.find(x => x.is_current) || s[0])?.id || '')
        setCatalog(m)
      })
      .catch(e => toast.error(e.message))
  }, [])

  // Reload the family's needed materials whenever family or semester changes.
  useEffect(() => {
    if (!familyId || !semId) { setRows([]); return }
    setLoadingRows(true); setCart(new Map())
    getFamilyMaterials(familyId, semId)
      .then(setRows)
      .catch(e => toast.error(e.message))
      .finally(() => setLoadingRows(false))
  }, [familyId, semId])

  const family = families.find(f => f.id === familyId)
  const members = (family?.family_members || []).map(m => ({ ...m.profiles, relationship: m.relationship })).filter(m => m.id)
  const credit = Math.max(0, Number(family?.credit || 0))

  // Group needed materials by student.
  const byStudent = []
  const seen = {}
  rows.forEach(r => {
    if (!seen[r.student_id]) { seen[r.student_id] = { id: r.student_id, name: r.student_name, items: [] }; byStudent.push(seen[r.student_id]) }
    seen[r.student_id].items.push(r)
  })

  // Catalog items that aren't required by any of this family's registered classes.
  const neededIds = new Set(rows.map(r => r.material_id))
  const others = catalog.filter(m => !neededIds.has(m.id))

  const addToCart = (studentId, studentName, material) => setCart(prev => {
    const next = new Map(prev)
    const k = keyOf(studentId, material.id)
    if (next.has(k)) next.delete(k)
    else next.set(k, { student_id: studentId, material_id: material.id, semester_id: semId, name: material.name, price: Number(material.price || 0), studentName })
    return next
  })

  const cartItems = [...cart.values()]
  const total = cartItems.reduce((s, i) => s + i.price, 0)
  const creditUsed = Math.min(credit, total)
  const cashDue = Math.round((total - creditUsed) * 100) / 100

  const checkout = async () => {
    if (cartItems.length === 0) return
    if (!(await confirm({
      title: 'Record purchase',
      message: `Record ${cartItems.length} item${cartItems.length === 1 ? '' : 's'} for ${family?.family_name}? Total ${money(total)}${creditUsed > 0 ? ` — ${money(creditUsed)} from credit` : ''}, ${money(cashDue)} cash to collect.`,
      confirmLabel: 'Record purchase',
    }))) return
    setBusy(true)
    try {
      const items = cartItems.map(i => ({ student_id: i.student_id, material_id: i.material_id, semester_id: i.semester_id }))
      const res = await purchaseMaterials(familyId, items, note.trim() || null, null)
      toast.success(`Recorded ${res.items} item${res.items === 1 ? '' : 's'} — ${money(res.credit_used)} credit, ${money(res.cash_received)} cash.`)
      setCart(new Map()); setNote('')
      // Refresh both the needed list (purchased flags) and the family credit.
      const [fams, fresh] = await Promise.all([listFamilies(), getFamilyMaterials(familyId, semId)])
      setFamilies(fams.filter(x => x.status !== 'inactive'))
      setRows(fresh)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in pb-28">
      <PageHeader title="Materials Purchase" subtitle="Record an in-person materials sale at the front office" />

      {/* Family + semester */}
      <Card className="mb-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <Select label="Family" id="fam" value={familyId} onChange={e => setFamilyId(e.target.value)}>
            <option value="">Select a family…</option>
            {families.map(f => <option key={f.id} value={f.id}>{f.family_name}{f.family_code ? ` (${f.family_code})` : ''}</option>)}
          </Select>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Semester</label>
            <SemesterPicker semesters={semesters} value={semId} onChange={setSemId} className="w-full" />
          </div>
        </div>
        {family && (
          <p className="text-xs text-slate-500 mt-3">
            Account credit: <span className="font-semibold text-green-700">{money(credit)}</span>
            <span className="text-slate-400"> — applied automatically before cash.</span>
          </p>
        )}
      </Card>

      {!familyId ? (
        <Card><p className="py-10 text-center text-slate-400 text-sm">Select a family to see what materials their classes require.</p></Card>
      ) : loadingRows ? (
        <Card className="!p-0 overflow-hidden"><TableSkeleton rows={5} /></Card>
      ) : (
        <>
          {/* Needed for registered classes, grouped by student */}
          <h3 className="font-display text-lg text-slate-900 mb-3">Materials for Registered Classes</h3>
          {byStudent.length === 0 ? (
            <Card className="mb-6"><p className="py-8 text-center text-slate-400 text-sm">No class materials needed this term.</p></Card>
          ) : (
            <div className="space-y-5 mb-6">
              {byStudent.map(st => (
                <div key={st.id}>
                  <h4 className="font-display text-base text-slate-800 mb-1.5 px-1">{st.name}</h4>
                  <Card className="!p-0 overflow-hidden">
                    <div className="divide-y divide-slate-100">
                      {st.items.map(i => {
                        const inCart = cart.has(keyOf(st.id, i.material_id))
                        const material = { id: i.material_id, name: i.material_name, price: i.price }
                        return (
                          <div key={i.material_id} className={`flex items-center justify-between gap-3 px-4 py-2.5 ${i.purchased ? 'bg-slate-50/60' : ''}`}>
                            {i.purchased ? (
                              <>
                                <span className="min-w-0">
                                  <span className="block text-sm text-slate-500 truncate">{i.material_name}</span>
                                  <span className="block text-[11px] text-slate-400">{i.classes}</span>
                                </span>
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 flex-shrink-0"><CheckCircle2 size={13} /> Purchased</span>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => addToCart(st.id, st.name, material)}
                                  className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer flex-1">
                                  <span className={`w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center border transition-colors ${inCart ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'border-slate-300 text-transparent'}`}>
                                    <Check size={12} />
                                  </span>
                                  <span className="min-w-0">
                                    <span className="flex items-center gap-2 flex-wrap">
                                      <span className="text-sm text-slate-900">{i.material_name}</span>
                                      {!i.is_required && <Badge variant="default">Optional</Badge>}
                                    </span>
                                    <span className="block text-[11px] text-slate-400">{i.classes}</span>
                                  </span>
                                </button>
                                <span className="text-sm font-medium text-slate-700 flex-shrink-0">{money(i.price)}</span>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                </div>
              ))}
            </div>
          )}

          {/* Anything else in the catalog */}
          <h3 className="font-display text-lg text-slate-900 mb-1">Other Materials</h3>
          <p className="text-xs text-slate-400 mb-3">Not required by this family's classes — available to buy anyway.</p>
          {others.length === 0 ? (
            <Card><p className="py-6 text-center text-slate-400 text-sm">Nothing else in the catalog.</p></Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {others.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="min-w-0">
                      <span className="block text-sm text-slate-900 truncate flex items-center gap-1.5"><Package size={12} className="text-slate-300" />{m.name}</span>
                      {m.description && <span className="block text-[11px] text-slate-400 truncate">{m.description}</span>}
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-medium text-slate-700">{money(m.price)}</span>
                      <select value="" onChange={e => { const sid = e.target.value; if (!sid) return; const mem = members.find(x => x.id === sid); addToCart(sid, mem?.full_name || '', m); e.target.value = '' }}
                        className="text-[11px] border border-slate-200 rounded-lg px-2 h-7 bg-white outline-none text-slate-600 cursor-pointer">
                        <option value="">Add for…</option>
                        {members.map(mem => <option key={mem.id} value={mem.id}>{mem.full_name}</option>)}
                      </select>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Checkout bar */}
          {cartItems.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg z-40">
              <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-xs text-slate-600 min-w-0">
                  <p className="font-medium text-slate-900 flex items-center gap-1.5">
                    <ShoppingCart size={13} /> {cartItems.length} item{cartItems.length === 1 ? '' : 's'} · {money(total)}
                  </p>
                  <p className="text-slate-500 truncate">
                    {creditUsed > 0 && <>{money(creditUsed)} from credit · </>}
                    <span className="font-semibold text-slate-900">{money(cashDue)} cash to collect</span>
                    <span className="text-slate-400"> — {cartItems.map(i => `${i.name} (${i.studentName})`).slice(0, 2).join(', ')}{cartItems.length > 2 ? '…' : ''}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Input id="pnote" placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} className="!w-40" />
                  <Button variant="outline" size="sm" disabled={busy} onClick={() => setCart(new Map())}>Clear</Button>
                  <Button variant="gold" size="sm" disabled={busy} onClick={checkout}>
                    {busy ? <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" /> Recording…</span> : `Record Purchase (${money(total)})`}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <div className="bg-navy/5 border border-navy/10 rounded-xl px-4 py-2.5 mt-5 text-xs text-slate-600 flex items-start gap-2">
        <Info size={14} className="text-navy/40 flex-shrink-0 mt-0.5" />
        <span>Credit is applied first; the remainder is recorded as cash received at the front office. Both appear in the family's payment history.</span>
      </div>
    </div>
  )
}
