import { useState, useEffect } from 'react'
import { Plus, Trash2, Wand2, RefreshCw } from 'lucide-react'
import {
  listSemesters, listCalendarSessions, createCalendarSession,
  updateCalendarSession, deleteCalendarSession, generateWeeklySessions,
} from '../lib/supabaseClient'
import { Button, Card, Select, TableSkeleton } from './ui'
import { useFeedback } from '../context/FeedbackContext'
import { withWeekNumbers, fmtCalDate } from './SchoolYearCalendar'

/**
 * Admin editor for the week-by-week school-year calendar. Rows save as you edit
 * them; week numbers are derived (running count of class days), so adding a
 * holiday renumbers the rest automatically.
 */
export default function SessionScheduleEditor() {
  const { toast, confirm } = useFeedback()
  const [semesters, setSemesters] = useState([])
  const [semId, setSemId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [newDate, setNewDate] = useState('')

  const semester = semesters.find(s => s.id === semId) || null

  useEffect(() => {
    listSemesters()
      .then(s => {
        setSemesters(s)
        setSemId((s.find(x => x.is_current) || s[0])?.id || '')
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  const loadRows = async (id = semId) => {
    if (!id) { setRows([]); return }
    setLoading(true)
    try { setRows(await listCalendarSessions(id)) }
    catch (e) { toast.error(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { loadRows() }, [semId])

  const generate = async () => {
    if (!semester) return
    setBusy(true)
    try {
      const added = await generateWeeklySessions(semester)
      await loadRows()
      toast.success(added > 0 ? `Added ${added} weekly date${added === 1 ? '' : 's'}.` : 'All weekly dates already exist.')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const addRow = async () => {
    if (!newDate || !semId) return
    setBusy(true)
    try {
      await createCalendarSession({ semester_id: semId, session_date: newDate, has_class: true })
      setNewDate('')
      await loadRows()
    } catch (e) {
      toast.error(/duplicate|unique/i.test(e.message) ? 'That date is already in the schedule.' : e.message)
    } finally { setBusy(false) }
  }

  // Optimistic local update so typing stays responsive; persist in the background.
  const patchRow = async (row, updates) => {
    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, ...updates } : r)))
    try { await updateCalendarSession(row.id, updates) }
    catch (e) { toast.error(e.message); loadRows() }
  }

  const removeRow = async (row) => {
    if (!(await confirm({
      title: 'Remove date',
      message: `Remove ${fmtCalDate(row.session_date)} from the schedule?`,
      confirmLabel: 'Remove', danger: true,
    }))) return
    setBusy(true)
    try { await deleteCalendarSession(row.id); await loadRows() }
    catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const numbered = withWeekNumbers(rows)
  const classDays = numbered.filter(r => r.has_class).length

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-display text-base text-slate-900">Week-by-Week Schedule</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            The dated class calendar shown on the home page. {classDays} class day{classDays === 1 ? '' : 's'} in this term.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select id="sched-sem" value={semId} onChange={e => setSemId(e.target.value)} className="w-48">
            {semesters.map(s => <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (current)' : ''}</option>)}
          </Select>
          <Button variant="outline" size="sm" disabled={busy || !semester} onClick={generate}>
            {busy ? <RefreshCw size={13} className="animate-spin" /> : <Wand2 size={13} />} Generate weekly dates
          </Button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium w-16">Week #</th>
                  <th className="px-4 py-2 font-medium w-40">Date</th>
                  <th className="px-4 py-2 font-medium w-28">Class</th>
                  <th className="px-4 py-2 font-medium">Description</th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {numbered.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400 text-sm">
                    No dates yet — use “Generate weekly dates” to fill the term, then edit exceptions.
                  </td></tr>
                ) : numbered.map(r => (
                  <tr key={r.id} className={`border-b border-slate-50 ${r.has_class ? '' : 'bg-slate-50/60'}`}>
                    <td className="px-4 py-1.5 text-slate-500">{r.weekNo ?? <span className="text-slate-300">—</span>}</td>
                    <td className="px-4 py-1.5">
                      <input type="date" value={r.session_date}
                        onChange={e => e.target.value && patchRow(r, { session_date: e.target.value })}
                        className="text-xs border border-slate-200 rounded-lg px-2 h-8 bg-white outline-none focus:border-yellow-400 cursor-pointer" />
                    </td>
                    <td className="px-4 py-1.5">
                      <select value={r.has_class ? 'yes' : 'no'}
                        onChange={e => patchRow(r, { has_class: e.target.value === 'yes' })}
                        className="text-xs border border-slate-200 rounded-lg px-2 h-8 bg-white outline-none text-slate-700 cursor-pointer">
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </td>
                    <td className="px-4 py-1.5">
                      <input value={r.description || ''}
                        placeholder={r.has_class ? 'e.g. Class 上课 (First day)' : 'e.g. (Chinese New Year 春节)'}
                        onChange={e => setRows(prev => prev.map(x => (x.id === r.id ? { ...x, description: e.target.value } : x)))}
                        onBlur={e => patchRow(r, { description: e.target.value.trim() || null })}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 h-8 bg-white outline-none focus:border-yellow-400" />
                    </td>
                    <td className="px-4 py-1.5">
                      <button onClick={() => removeRow(r)} disabled={busy} title="Remove date"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 cursor-pointer disabled:opacity-40">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2 h-8 bg-white outline-none focus:border-yellow-400 cursor-pointer" />
            <Button variant="outline" size="sm" disabled={busy || !newDate || !semId} onClick={addRow}>
              <Plus size={13} /> Add date
            </Button>
            <span className="text-[11px] text-slate-400">Week numbers are assigned automatically to class days.</span>
          </div>
        </>
      )}
    </Card>
  )
}
