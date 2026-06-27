import { useState, useEffect } from 'react'
import { Download, AlertCircle } from 'lucide-react'
import { listAllTransactions, listFamilies, listClasses, getClassRoster } from '../../lib/supabaseClient'
import { Button, Card, PageHeader, Table, Tr, Td, Select } from '../../components/ui'

const money = (n) => `${Number(n) < 0 ? '-' : ''}$${Math.abs(Number(n || 0)).toFixed(2)}`

function downloadCSV(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = rows.map(r => r.map(esc).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AdminReports() {
  const [txns, setTxns] = useState([])
  const [families, setFamilies] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rosterClassId, setRosterClassId] = useState('')
  const [roster, setRoster] = useState([])
  const [rosterLoading, setRosterLoading] = useState(false)

  useEffect(() => {
    Promise.all([listAllTransactions(), listFamilies(), listClasses()])
      .then(([t, f, c]) => { setTxns(t); setFamilies(f); setClasses(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const sumBy = (m) => txns.filter(t => t.method === m).reduce((s, t) => s + Number(t.amount), 0)
  const received = sumBy('cash') + sumBy('online')
  const charged = Math.abs(sumBy('enrollment'))
  const credited = sumBy('drop_credit')
  const adjustments = sumBy('adjustment')

  const owing = families.filter(f => Number(f.balance) < 0)
    .sort((a, b) => Number(a.balance) - Number(b.balance))
  const totalOwed = owing.reduce((s, f) => s + Math.abs(Number(f.balance)), 0)

  const loadRoster = async (classId) => {
    setRosterClassId(classId); setRoster([])
    if (!classId) return
    setRosterLoading(true)
    try { setRoster(await getClassRoster(classId)) }
    catch (e) { alert(e.message) }
    finally { setRosterLoading(false) }
  }

  const exportOwing = () => downloadCSV('outstanding-balances.csv', [
    ['Family', 'Family ID', 'Email', 'Phone', 'Amount Owed'],
    ...owing.map(f => [f.family_name, f.family_code, f.email, f.phone, Math.abs(Number(f.balance)).toFixed(2)]),
  ])
  const exportRoster = () => {
    const cls = classes.find(c => c.id === rosterClassId)
    downloadCSV(`roster-${cls?.name || 'class'}.csv`, [
      ['Member', 'Role', 'Family', 'Email', 'Phone'],
      ...roster.map(r => [r.member_name, r.member_role, r.family_name, r.email, r.phone]),
    ])
  }

  if (loading) return <div className="max-w-5xl"><p className="py-12 text-center text-slate-400 text-sm">Loading…</p></div>
  if (error) return <div className="max-w-5xl"><p className="py-12 text-center text-red-500 text-sm">Failed to load: {error}</p></div>

  return (
    <div className="max-w-5xl animate-fade-in">
      <PageHeader title="Reports" subtitle="Financial summary, outstanding balances, and class rosters" />

      {/* Financial summary */}
      <h3 className="font-display text-lg text-slate-900 mb-3">Financial Summary</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Card><p className="text-xs text-slate-400 mb-1">Payments Received</p><p className="font-display text-2xl text-green-600">{money(received)}</p></Card>
        <Card><p className="text-xs text-slate-400 mb-1">Enrollment Charges</p><p className="font-display text-2xl text-slate-900">{money(charged)}</p></Card>
        <Card><p className="text-xs text-slate-400 mb-1">Drop Credits</p><p className="font-display text-2xl text-amber-600">{money(credited)}</p></Card>
        <Card><p className="text-xs text-slate-400 mb-1">Adjustments</p><p className="font-display text-2xl text-slate-900">{money(adjustments)}</p></Card>
      </div>

      {/* Outstanding balances */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-slate-900">Outstanding Balances</h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Total owed: <span className="font-semibold text-red-600">{money(totalOwed)}</span></span>
          <Button size="sm" variant="outline" disabled={owing.length === 0} onClick={exportOwing}><Download size={13} /> Export CSV</Button>
        </div>
      </div>
      <Card className="!p-0 overflow-hidden mb-8">
        {owing.length === 0 ? (
          <p className="py-8 text-center text-slate-400 text-sm">No families owe a balance. 🎉</p>
        ) : (
          <Table headers={['Family', 'ID', 'Contact', 'Owed']}>
            {owing.map(f => (
              <Tr key={f.id}>
                <Td><span className="font-medium text-slate-900">{f.family_name}</span></Td>
                <Td className="font-mono text-xs text-slate-500">{f.family_code}</Td>
                <Td className="text-slate-500 text-xs">{f.email}{f.phone ? ` · ${f.phone}` : ''}</Td>
                <Td><span className="font-semibold text-red-600">{money(Math.abs(Number(f.balance)))}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </Card>

      {/* Class rosters */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-slate-900">Class Rosters</h3>
        {roster.length > 0 && <Button size="sm" variant="outline" onClick={exportRoster}><Download size={13} /> Export CSV</Button>}
      </div>
      <Select id="rosterclass" value={rosterClassId} onChange={e => loadRoster(e.target.value)} className="max-w-sm mb-4">
        <option value="">Select a class…</option>
        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </Select>
      {rosterClassId && (
        <Card className="!p-0 overflow-hidden">
          {rosterLoading ? (
            <p className="py-8 text-center text-slate-400 text-sm">Loading…</p>
          ) : roster.length === 0 ? (
            <p className="py-8 text-center text-slate-400 text-sm flex items-center justify-center gap-2"><AlertCircle size={14} /> No one enrolled.</p>
          ) : (
            <Table headers={['Member', 'Role', 'Family', 'Guardian Contact']}>
              {roster.map(r => (
                <Tr key={r.member_id}>
                  <Td className="font-medium text-slate-900">{r.member_name}</Td>
                  <Td className="capitalize text-slate-600">{r.member_role}</Td>
                  <Td className="text-slate-600">{r.family_name || '—'}</Td>
                  <Td className="text-slate-500 text-xs">{[r.email, r.phone].filter(Boolean).join(' · ') || '—'}</Td>
                </Tr>
              ))}
            </Table>
          )}
        </Card>
      )}
    </div>
  )
}
