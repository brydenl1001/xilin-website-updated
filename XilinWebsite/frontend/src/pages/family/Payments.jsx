import { useState, useEffect } from 'react'
import { Wallet, CreditCard, RefreshCw } from 'lucide-react'
import { getOwnFamily, listBalanceTransactions, recordPayment } from '../../lib/supabaseClient'
import { Button, Card, PageHeader, Table, Tr, Td } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'
import { money } from '../../lib/format'

const METHOD_LABEL = { enrollment: 'Class purchase', drop_credit: 'Drop credit', cash: 'Cash payment', online: 'Online payment', adjustment: 'Adjustment' }
const PAYMENTS_BUCKET = 'Payments & Adjustments'

export default function FamilyPayments() {
  const { user } = useAuth()
  const [family, setFamily] = useState(null)
  const [ledger, setLedger] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [custom, setCustom] = useState('')
  const [paying, setPaying] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [fam, txns] = await Promise.all([getOwnFamily(user.id), listBalanceTransactions(user.id)])
      setFamily(fam)
      setLedger(txns)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [user.id])

  const balance = Number(family?.balance || 0)
  const owes = balance < 0
  const due = owes ? Math.abs(balance) : 0

  const pay = async (amount) => {
    if (!amount || amount <= 0) return
    setPaying(true)
    try {
      await recordPayment(user.id, amount, 'online', 'Online payment')
      setCustom('')
      await load()
    } catch (err) {
      alert(`Payment failed: ${err.message}`)
    } finally {
      setPaying(false)
    }
  }

  // Group transactions by semester (class purchases/credits) with a separate
  // bucket for account-level payments/adjustments that aren't tied to a class.
  const groups = []
  const byKey = {}
  ledger.forEach(t => {
    const key = t.classes?.semesters?.name || PAYMENTS_BUCKET
    if (!byKey[key]) { byKey[key] = []; groups.push(key) }
    byKey[key].push(t)
  })

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Payments" subtitle="Your family balance, payments, and class purchases" />

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : (
        <>
          {/* Balance + pay */}
          <div className="bg-navy rounded-2xl p-6 mb-6 text-white">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/40 mb-1">{owes ? 'Amount Due' : 'Account Balance'}</p>
                <p className={`font-display text-4xl ${owes ? 'text-red-300' : 'text-yellow-400'}`}>{money(balance)}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {owes ? 'You have an outstanding balance.' : balance > 0 ? 'You have account credit.' : 'Your account is settled.'}
                </p>
              </div>
              <Wallet size={40} className="text-white/10" />
            </div>

            <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-end gap-3">
              {owes && (
                <Button variant="gold" disabled={paying} onClick={() => pay(due)}>
                  {paying ? <span className="flex items-center gap-2"><RefreshCw size={14} className="animate-spin" />Processing…</span>
                          : <span className="flex items-center gap-2"><CreditCard size={14} />Pay full balance ({money(due)})</span>}
                </Button>
              )}
              <div className="flex items-end gap-2">
                <div>
                  <label className="block text-[11px] text-white/50 mb-1">Custom amount</label>
                  <input type="number" value={custom} onChange={e => setCustom(e.target.value)} placeholder="$"
                    className="w-32 px-3 py-2 text-sm rounded-lg bg-white/10 border border-white/15 text-white placeholder:text-white/30 outline-none focus:border-yellow-400" />
                </div>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10" disabled={paying || !Number(custom)} onClick={() => pay(Number(custom))}>
                  Pay
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-white/30 mt-3">🧪 Demo mode — payments are recorded directly. A real card processor will be connected here.</p>
          </div>

          {/* Per-semester detail */}
          <h3 className="font-display text-lg text-slate-900 mb-3">Activity by Semester</h3>
          {ledger.length === 0 ? (
            <Card><p className="py-10 text-center text-slate-400 text-sm">No payments or class purchases yet.</p></Card>
          ) : (
            <div className="space-y-5">
              {groups.map(key => {
                const items = byKey[key]
                const subtotal = items.reduce((s, t) => s + Number(t.amount), 0)
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5 px-1">
                      <h4 className="font-display text-base text-slate-800">{key}</h4>
                      <span className={`text-xs font-medium ${subtotal < 0 ? 'text-red-600' : 'text-green-600'}`}>Net {money(subtotal)}</span>
                    </div>
                    <Card className="!p-0 overflow-hidden">
                      <Table headers={['Date', 'Member', 'Class / Detail', 'Type', 'Amount']}>
                        {items.map(t => (
                          <Tr key={t.id}>
                            <Td className="text-slate-400 text-xs whitespace-nowrap">{t.created_at?.slice(0, 10)}</Td>
                            <Td className="text-slate-600 text-xs">{t.member?.full_name || '—'}</Td>
                            <Td className="text-slate-600 text-xs">{t.classes?.name || t.note || '—'}</Td>
                            <Td className="text-slate-500 text-xs">{METHOD_LABEL[t.method] || t.method}</Td>
                            <Td><span className={`font-semibold ${Number(t.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(t.amount)}</span></Td>
                          </Tr>
                        ))}
                      </Table>
                    </Card>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
