import { useState } from 'react'
import { CreditCard, Download, RefreshCw } from 'lucide-react'
import { mockPayments } from '../../lib/mockData'
import { Badge, Button, Card, Modal, Input, PageHeader, Table, Tr, Td } from '../../components/ui'

const STATUS_VARIANT = { paid: 'success', pending: 'warning', failed: 'danger' }

function SandboxModal({ open, onClose, payment, onConfirm }) {
  const [processing, setProcessing] = useState(false)
  const [card, setCard] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/28')
  const [cvv, setCvv] = useState('123')

  const handlePay = () => {
    setProcessing(true)
    setTimeout(() => { setProcessing(false); onConfirm(payment.id); onClose() }, 1800)
  }
  if (!payment) return null

  return (
    <Modal open={open} onClose={onClose} title="Sandbox Payment">
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-5 text-xs text-amber-700">
        🧪 Sandbox mode — no real charges processed
      </div>
      <div className="bg-slate-900 rounded-xl p-5 mb-5 text-white">
        <p className="text-slate-400 text-xs mb-1">Amount Due</p>
        <p className="font-display text-3xl text-yellow-400">${payment.amount.toLocaleString()}</p>
        <p className="text-slate-400 text-xs mt-1">{payment.description} · {payment.student}</p>
      </div>
      <div className="space-y-3">
        <Input label="Card Number" id="cn" value={card} onChange={e => setCard(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Expiry" id="exp" value={expiry} onChange={e => setExpiry(e.target.value)} />
          <Input label="CVV" id="cvv" value={cvv} onChange={e => setCvv(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-5">
        <Button variant="outline" onClick={onClose} disabled={processing}>Cancel</Button>
        <Button variant="gold" onClick={handlePay} disabled={processing}>
          {processing
            ? <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" />Processing…</span>
            : <span className="flex items-center gap-2"><CreditCard size={13} />Pay ${payment.amount.toLocaleString()}</span>
          }
        </Button>
      </div>
    </Modal>
  )
}

export default function AdminPayments() {
  const [payments, setPayments] = useState(mockPayments)
  const [payTarget, setPayTarget] = useState(null)

  const total   = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0)
  const pending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0)
  const failed  = payments.filter(p => p.status === 'failed').length

  const confirm = (id) => setPayments(prev => prev.map(p =>
    p.id === id ? { ...p, status: 'paid', date: new Date().toISOString().slice(0, 10), ref: `SAND-${Math.random().toString(36).slice(2, 8).toUpperCase()}` } : p
  ))

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Payments" subtitle="Fee management and payment history" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card><p className="text-xs text-slate-400 mb-1">Total Collected</p><p className="font-display text-2xl text-slate-900">${total.toLocaleString()}</p><p className="text-xs text-green-600 mt-1">Paid invoices</p></Card>
        <Card><p className="text-xs text-slate-400 mb-1">Outstanding</p><p className="font-display text-2xl text-amber-600">${pending.toLocaleString()}</p><p className="text-xs text-amber-600 mt-1">Awaiting payment</p></Card>
        <Card><p className="text-xs text-slate-400 mb-1">Failed</p><p className="font-display text-2xl text-red-500">{failed}</p><p className="text-xs text-red-500 mt-1">Need attention</p></Card>
      </div>

      <Card className="!p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-display text-base text-slate-900">Payment History</h3>
        </div>
        <Table headers={['Student', 'Description', 'Amount', 'Status', 'Date', 'Ref', 'Action']}>
          {payments.map(p => (
            <Tr key={p.id}>
              <Td><span className="font-medium text-slate-900">{p.student}</span></Td>
              <Td className="text-slate-500">{p.description}</Td>
              <Td><span className="font-semibold text-slate-900">${p.amount.toLocaleString()}</span></Td>
              <Td><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></Td>
              <Td className="text-slate-400 text-xs">{p.date || '—'}</Td>
              <Td className="font-mono text-xs text-slate-400">{p.ref || '—'}</Td>
              <Td>
                {p.status === 'pending' && <Button size="sm" variant="gold" onClick={() => setPayTarget(p)}>Pay Now</Button>}
                {p.status === 'failed'  && <Button size="sm" variant="outline" onClick={() => setPayTarget(p)}>Retry</Button>}
                {p.status === 'paid'    && <button className="text-slate-300 hover:text-slate-600 transition-colors"><Download size={14} /></button>}
              </Td>
            </Tr>
          ))}
        </Table>
      </Card>

      <SandboxModal open={!!payTarget} payment={payTarget} onClose={() => setPayTarget(null)} onConfirm={confirm} />
    </div>
  )
}
