import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Wallet, CreditCard, RefreshCw, CheckCircle2, PlusCircle, Check } from 'lucide-react'
import { getOwnFamily, getEnrollmentsForMembers, listBalanceTransactions, startClassCheckout, startCreditCheckout } from '../../lib/supabaseClient'
import { Button, Card, PageHeader, Table, Tr, Td, TableSkeleton, Badge } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { useFeedback } from '../../context/FeedbackContext'
import { money, personName } from '../../lib/format'

const METHOD_LABEL = {
  class_payment: 'Class payment', online: 'Card payment', cash: 'Cash payment',
  drop_credit: 'Drop credit', class_credit: 'Refund to credit', adjustment: 'Adjustment',
  material_purchase: 'Materials',
}

// Mirrors the edge function's surcharge math: the card fee (2.9% + 30¢) applies
// to the CARD portion only. Estimate for display — the server figure is
// authoritative and shown at checkout.
const cardCharge = (netDollars) => netDollars > 0 ? Math.ceil((netDollars * 100 + 30) / 0.971) / 100 : 0

export default function FamilyPayments() {
  const { user } = useAuth()
  const { toast } = useFeedback()
  const [searchParams, setSearchParams] = useSearchParams()
  const [family, setFamily] = useState(null)
  const [enrollMap, setEnrollMap] = useState({})
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [paying, setPaying] = useState(false)
  const [creditAmt, setCreditAmt] = useState('')
  const [addingCredit, setAddingCredit] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const fam = await getOwnFamily(user.id)
      const memberIds = (fam.family_members || []).map(m => m.profiles?.id).filter(Boolean)
      const [enr, txns] = await Promise.all([getEnrollmentsForMembers(memberIds), listBalanceTransactions(user.id)])
      setFamily(fam)
      setEnrollMap(enr)
      setLedger(txns)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user.id])

  // Handle the return from Stripe Checkout (classes are marked paid by a webhook,
  // so re-fetch once now and once more a few seconds later).
  useEffect(() => {
    const outcome = searchParams.get('checkout')
    if (!outcome) return
    setSearchParams({}, { replace: true })
    let timer
    if (outcome === 'success') {
      toast.success('Payment received! It may take a few seconds to appear below.')
      timer = setTimeout(load, 4000)
    } else if (outcome === 'cancel') {
      toast.error('Payment canceled — your card was not charged.')
    }
    return () => clearTimeout(timer)
  }, [])

  const memberName = (id) => (family?.family_members || []).find(m => m.profiles?.id === id)?.personName(profiles) || '—'

  // Flatten enrollments into unpaid (owed) and paid lists. Only active classes
  // count as owed — canceled/hidden classes are refunded automatically.
  const { unpaid, paid } = useMemo(() => {
    const all = Object.values(enrollMap).flat().filter(e => e.status === 'enrolled')
    return {
      unpaid: all.filter(e => !e.paid && e.classes?.status === 'active'),
      paid: all.filter(e => e.paid),
    }
  }, [enrollMap])

  const credit = Math.max(0, Number(family?.credit || 0))
  const owed = unpaid.reduce((s, e) => s + Number(e.price_charged || 0), 0)

  // Payment history shows actual money movements and credit changes — not the
  // internal per-item allocation rows (class_payment / material_purchase), which
  // just record credit being applied. What those covered is listed under "Paid
  // Classes" above and on the Materials page.
  const historyLedger = ledger.filter(t => !['class_payment', 'material_purchase'].includes(t.method))

  // Default: everything selected (the "pay in full" case).
  useEffect(() => { setSelected(new Set(unpaid.map(e => e.id))) }, [enrollMap])

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const selTotal = unpaid.filter(e => selected.has(e.id)).reduce((s, e) => s + Number(e.price_charged || 0), 0)
  const selCreditUsed = Math.min(credit, selTotal)
  const selCardNet = Math.round((selTotal - selCreditUsed) * 100) / 100
  const selCardCharge = cardCharge(selCardNet)

  const paySelected = async () => {
    const ids = unpaid.filter(e => selected.has(e.id)).map(e => e.id)
    if (!ids.length) return
    setPaying(true)
    try {
      const res = await startClassCheckout(ids)
      if (res.settled) {
        toast.success(`Paid ${money(res.total)} with account credit.`)
        await load()
        setPaying(false)
      } else {
        window.location.assign(res.url) // off to Stripe Checkout
      }
    } catch (err) {
      toast.error(`Could not start the payment: ${err.message}`)
      setPaying(false)
    }
  }

  const addCredit = async () => {
    const amt = Number(creditAmt)
    if (!amt || amt <= 0) return
    setAddingCredit(true)
    try {
      const res = await startCreditCheckout(amt)
      window.location.assign(res.url)
    } catch (err) {
      toast.error(`Could not start the payment: ${err.message}`)
      setAddingCredit(false)
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Payments" subtitle="Pay for classes, manage credit, and view your payment history" />

      {loading ? (
        <TableSkeleton rows={6} />
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : (
        <>
          {/* Owed + credit summary */}
          <div className="bg-navy rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div className="flex gap-10 flex-wrap">
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Amount Owed</p>
                  <p className={`font-display text-4xl ${owed > 0 ? 'text-red-300' : 'text-yellow-400'}`}>{money(owed)}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {owed > 0 ? `${unpaid.length} unpaid class${unpaid.length === 1 ? '' : 'es'}` : 'All classes are paid for.'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">Credit Balance</p>
                  <p className="font-display text-4xl text-yellow-400">{money(credit)}</p>
                  <p className="text-xs text-slate-400 mt-1">Applied automatically at checkout.</p>
                </div>
              </div>
              <Wallet size={40} className="text-white/10" />
            </div>

            {/* Add credit */}
            <div className="mt-5 pt-5 border-t border-white/10 flex items-end gap-2 flex-wrap">
              <div>
                <label className="block text-[11px] text-white/50 mb-1">Add credit ($)</label>
                <input type="number" min="0.50" step="0.01" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} placeholder="Any amount"
                  className="w-36 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 outline-none focus:border-yellow-400" />
              </div>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" disabled={addingCredit || !Number(creditAmt)} onClick={addCredit}>
                <PlusCircle size={14} /> {addingCredit ? 'Redirecting…' : 'Add Credit'}
              </Button>
              {Number(creditAmt) > 0 && (
                <p className="text-[11px] text-white/40 pb-2">
                  Adding {money(Number(creditAmt))} will charge {money(cardCharge(Number(creditAmt)))} (card fee included).
                </p>
              )}
            </div>
          </div>

          {/* Unpaid classes */}
          <h3 className="font-display text-lg text-slate-900 mb-3">Classes to Pay For</h3>
          {unpaid.length === 0 ? (
            <Card className="mb-6"><p className="py-6 text-center text-slate-400 text-sm">Nothing owed — every enrolled class is paid for. 🎉</p></Card>
          ) : (
            <Card className="!p-0 overflow-hidden mb-6">
              <div className="divide-y divide-slate-100">
                {unpaid.map(e => {
                  const isSel = selected.has(e.id)
                  return (
                    <button key={e.id} type="button" onClick={() => toggle(e.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border transition-colors ${isSel ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'border-slate-300 text-transparent'}`}>
                          <Check size={13} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium text-slate-900 truncate">
                            <Link to={`/class/${e.class_id}`} onClick={ev => ev.stopPropagation()} className="hover:text-yellow-700 hover:underline">{e.classes?.name || 'Class'}</Link>
                          </span>
                          <span className="block text-xs text-slate-400">
                            <Link to={`/members/${e.student_id}`} onClick={ev => ev.stopPropagation()} className="hover:text-yellow-700 hover:underline">{memberName(e.student_id)}</Link>
                            {e.classes?.semesters?.name ? ` · ${e.classes.semesters.name}` : ''}
                          </span>
                        </span>
                      </span>
                      <span className="flex items-center gap-3 flex-shrink-0">
                        <Badge variant="warning">Unpaid</Badge>
                        <span className="text-sm font-semibold text-slate-900">{money(e.price_charged)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Pay bar */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-xs text-slate-500">
                  {selected.size === 0 ? 'Select classes to pay for.' : (
                    <>
                      <span className="font-medium text-slate-700">{selected.size} class{selected.size === 1 ? '' : 'es'} · {money(selTotal)}</span>
                      {selCreditUsed > 0 && <> — {money(selCreditUsed)} credit applied</>}
                      {selCardNet > 0
                        ? <> — card charge {money(selCardCharge)} <span className="text-slate-400">(incl. processing fee)</span></>
                        : selected.size > 0 && <> — <span className="text-green-600 font-medium">fully covered by credit, no card needed</span></>}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {selected.size < unpaid.length && (
                    <Button variant="outline" size="sm" disabled={paying} onClick={() => setSelected(new Set(unpaid.map(e => e.id)))}>Select all</Button>
                  )}
                  <Button variant="gold" size="sm" disabled={paying || selected.size === 0} onClick={paySelected}>
                    {paying
                      ? <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" />Processing…</span>
                      : <span className="flex items-center gap-2"><CreditCard size={13} />{selected.size === unpaid.length ? `Pay in full (${money(selTotal)})` : `Pay selected (${money(selTotal)})`}</span>}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Paid classes */}
          <h3 className="font-display text-lg text-slate-900 mb-3">Paid Classes</h3>
          {paid.length === 0 ? (
            <Card className="mb-6"><p className="py-6 text-center text-slate-400 text-sm">No classes paid for yet.</p></Card>
          ) : (
            <Card className="!p-0 overflow-hidden mb-6">
              <div className="divide-y divide-slate-100">
                {paid.map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900 truncate">
                        <Link to={`/class/${e.class_id}`} className="hover:text-yellow-700 hover:underline">{e.classes?.name || 'Class'}</Link>
                      </span>
                      <span className="block text-xs text-slate-400">
                        {memberName(e.student_id)}{e.classes?.semesters?.name ? ` · ${e.classes.semesters.name}` : ''}{e.paid_at ? ` · paid ${e.paid_at.slice(0, 10)}` : ''}
                      </span>
                    </span>
                    <span className="flex items-center gap-3 flex-shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><CheckCircle2 size={13} /> Paid</span>
                      <span className="text-sm font-semibold text-slate-700">{money(e.paid_amount ?? e.price_charged)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Payment history */}
          <h3 className="font-display text-lg text-slate-900 mb-3">Payment History</h3>
          {historyLedger.length === 0 ? (
            <Card><p className="py-8 text-center text-slate-400 text-sm">No payments yet.</p></Card>
          ) : (
            <Card className="!p-0 overflow-hidden">
              <Table headers={['Date', 'Type', 'Detail', 'Amount']}>
                {historyLedger.map(t => (
                  <Tr key={t.id}>
                    <Td className="text-slate-400 text-xs whitespace-nowrap">{t.created_at?.slice(0, 10)}</Td>
                    <Td className="text-slate-700 text-xs">{METHOD_LABEL[t.method] || t.method}{t.reason ? ` — ${t.reason}` : ''}</Td>
                    <Td className="text-slate-500 text-xs">
                      {t.class_id && t.classes?.name
                        ? <Link to={`/class/${t.class_id}`} className="hover:text-yellow-700 hover:underline">{t.classes.name}</Link>
                        : (t.note || '—')}
                      {personName(t.member) ? <span className="text-slate-400"> · {personName(t.member)}</span> : null}
                    </Td>
                    <Td><span className={`font-semibold ${Number(t.amount) < 0 ? 'text-slate-600' : 'text-green-600'}`}>{money(t.amount)}</span></Td>
                  </Tr>
                ))}
              </Table>
            </Card>
          )}
          <p className="text-[11px] text-slate-400 mt-3">
            Card payments are processed securely by Stripe. A processing fee (2.9% + 30¢) applies to the card portion only —
            credit is always applied first.
          </p>
        </>
      )}
    </div>
  )
}
