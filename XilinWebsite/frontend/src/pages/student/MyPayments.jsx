import { useState, useEffect } from 'react'
import { CreditCard, RefreshCw, Download } from 'lucide-react'
import { getOwnPayments, confirmSandboxPayment } from '../../lib/supabaseClient'
import { Badge, Button, Card, Modal, Input, PageHeader } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

const STATUS_VARIANT = { paid: 'success', pending: 'warning', failed: 'danger' }

export default function StudentMyPayments() {
  const { user } = useAuth()
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payTarget, setPayTarget] = useState(null)
  const [processing, setProcessing] = useState(false)

  const load = () => {
    setLoading(true)
    getOwnPayments(user.id)
      .then(setPayments)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [user.id])

  const total   = payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0)
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)

  const confirm = async (id) => {
    setProcessing(true)
    try {
      await confirmSandboxPayment(id)
      load()
      setPayTarget(null)
    } catch (err) {
      alert(`Payment failed: ${err.message}`)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="My Payments" subtitle="Fee history and outstanding balances" />

      {loading ? (
        <p className="text-slate-400 text-sm text-center py-12">Loading…</p>
      ) : error ? (
        <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card>
              <p className="text-xs text-slate-400 mb-1">Total Paid</p>
              <p className="font-display text-2xl text-emerald-600">${total.toLocaleString()}</p>
            </Card>
            <Card>
              <p className="text-xs text-slate-400 mb-1">Outstanding</p>
              <p className="font-display text-2xl text-amber-600">${pending.toLocaleString()}</p>
            </Card>
          </div>

          {pending > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-800">Payment Due</p>
                <p className="text-xs text-amber-600 mt-0.5">You have an outstanding balance of ${pending.toLocaleString()}</p>
              </div>
              <Button variant="gold" size="sm" onClick={() => setPayTarget(payments.find(p => p.status === 'pending'))}>
                Pay Now
              </Button>
            </div>
          )}

          <div className="space-y-3">
            {payments.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-12">No payment history.</p>
            ) : payments.map(p => (
              <Card key={p.id}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{p.fee_structures?.name || 'Fee'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{p.paid_at ? `Paid ${p.paid_at.slice(0, 10)}` : 'Not yet paid'}</p>
                    {p.transaction_ref && <p className="text-xs font-mono text-slate-300 mt-0.5">{p.transaction_ref}</p>}
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <p className="font-display text-lg text-slate-900">${Number(p.amount).toLocaleString()}</p>
                    <Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge>
                    {p.status === 'pending' && <Button size="sm" variant="gold" onClick={() => setPayTarget(p)}>Pay</Button>}
                    {p.status === 'paid' && <button className="text-slate-300 hover:text-slate-600"><Download size={14} /></button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Payment modal */}
      <Modal open={!!payTarget} onClose={() => !processing && setPayTarget(null)} title="Sandbox Payment">
        {payTarget && (
          <>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-700">
              🧪 Sandbox mode — confirms via client-side call only
            </div>
            <div className="bg-slate-800 rounded-xl p-5 mb-5">
              <p className="text-slate-400 text-xs mb-1">Amount Due</p>
              <p className="font-display text-3xl text-teal-400">${Number(payTarget.amount).toLocaleString()}</p>
              <p className="text-slate-400 text-xs mt-1">{payTarget.fee_structures?.name}</p>
            </div>
            <div className="space-y-3">
              <Input label="Card Number" id="sc" defaultValue="4242 4242 4242 4242" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Expiry" id="se" defaultValue="12/28" />
                <Input label="CVV" id="scvv" defaultValue="123" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <Button variant="outline" onClick={() => setPayTarget(null)} disabled={processing}>Cancel</Button>
              <Button variant="gold" onClick={() => confirm(payTarget.id)} disabled={processing}>
                {processing
                  ? <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" />Processing…</span>
                  : <span className="flex items-center gap-2"><CreditCard size={13} />Pay ${Number(payTarget.amount).toLocaleString()}</span>
                }
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
