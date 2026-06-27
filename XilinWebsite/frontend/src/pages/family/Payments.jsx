import { useState, useEffect } from 'react'
import { Wallet, CreditCard, RefreshCw } from 'lucide-react'
import { getOwnFamily, listBalanceTransactions, recordPayment } from '../../lib/supabaseClient'
import { Button, Card, Input, PageHeader, Table, Tr, Td } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const METHOD_LABEL = { enrollment: 'Enrollment', drop_credit: 'Drop credit', cash: 'Cash payment', online: 'Online payment', adjustment: 'Adjustment' }
const money = (n) => `${Number(n) < 0 ? '-' : ''}$${Math.abs(Number(n || 0)).toFixed(2)}`

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
      const [fam, txns] = await Promise.all([
        getOwnFamily(user.id),
        listBalanceTransactions(user.id),
      ])
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

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Payments" subtitle="Your family balance and history" />

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

          {/* Ledger */}
          <h3 className="font-display text-lg text-slate-900 mb-3">Transaction History</h3>
          <Card className="!p-0 overflow-hidden">
            {ledger.length === 0 ? (
              <p className="py-10 text-center text-slate-400 text-sm">No transactions yet.</p>
            ) : (
              <Table headers={['Date', 'Type', 'Detail', 'Amount']}>
                {ledger.map(t => (
                  <Tr key={t.id}>
                    <Td className="text-slate-400 text-xs whitespace-nowrap">{t.created_at?.slice(0, 10)}</Td>
                    <Td className="text-slate-700">{METHOD_LABEL[t.method] || t.method}</Td>
                    <Td className="text-slate-500 text-xs">
                      {[t.member?.full_name, t.classes?.name, t.note].filter(Boolean).join(' · ') || '—'}
                    </Td>
                    <Td><span className={`font-semibold ${Number(t.amount) < 0 ? 'text-red-600' : 'text-green-600'}`}>{money(t.amount)}</span></Td>
                  </Tr>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
