import { useState, useEffect } from 'react'
import { Mail, Users, Home, GraduationCap, Shield, BookOpen, UserPlus, Send, X, Check, RefreshCw, AlertTriangle } from 'lucide-react'
import { listFamilies, listProfiles, listClasses, previewAdminEmail, sendAdminEmail } from '../../lib/supabaseClient'
import { Button, Card, PageHeader, Input, Select, Textarea } from '../../components/ui'
import { useFeedback } from '../../context/FeedbackContext'
import { personName } from '../../lib/format'

const GROUP_TARGETS = [
  { val: 'everyone', label: 'Everyone', hint: 'All families & staff', Icon: Users },
  { val: 'families', label: 'All Families', hint: 'Every household', Icon: Home },
  { val: 'teachers', label: 'All Teachers', hint: 'Teaching staff', Icon: GraduationCap },
  { val: 'admins', label: 'All Admins', hint: 'Administrators', Icon: Shield },
  { val: 'class', label: 'A Class', hint: 'Families in one class', Icon: BookOpen },
  { val: 'people', label: 'Specific People', hint: 'Pick individuals', Icon: UserPlus },
]

export default function AdminSendEmail() {
  const { toast, confirm } = useFeedback()
  const [target, setTarget] = useState('everyone')
  const [classId, setClassId] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [peopleQuery, setPeopleQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')

  const [families, setFamilies] = useState([])
  const [staff, setStaff] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  const [preview, setPreview] = useState(null) // { count, sample }
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    Promise.all([listFamilies(), listProfiles('teacher'), listProfiles('admin'), listClasses()])
      .then(([fams, teachers, admins, cls]) => {
        setFamilies(fams)
        setStaff([...admins, ...teachers])
        setClasses(cls)
      })
      .catch(e => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Combined pickable list for "Specific people": families + staff profiles.
  const people = [
    ...families.map(f => ({ id: f.id, label: f.family_name, sub: `Family · ID ${f.family_code || '—'}` })),
    ...staff.map(p => ({ id: p.id, label: personName(p), sub: p.role === 'admin' ? 'Admin' : 'Teacher' })),
  ]
  const peopleFiltered = peopleQuery.trim()
    ? people.filter(p => p.label?.toLowerCase().includes(peopleQuery.trim().toLowerCase()))
    : people

  // Whether the current selection is complete enough to resolve/send.
  const ready = target === 'class' ? !!classId : target === 'people' ? selected.size > 0 : true

  // Resolve the recipient count whenever the selection changes.
  useEffect(() => {
    if (!ready) { setPreview(null); return }
    let live = true
    setPreviewing(true)
    previewAdminEmail({ target, classId, recipientIds: [...selected] })
      .then(r => { if (live) setPreview(r) })
      .catch(() => { if (live) setPreview(null) })
      .finally(() => { if (live) setPreviewing(false) })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, classId, selected])

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const pickTarget = (val) => { setTarget(val); setPreview(null) }

  const count = preview?.count ?? 0

  const send = async () => {
    if (!subject.trim()) return toast.error('Enter a subject.')
    if (!body.trim()) return toast.error('Enter a message.')
    if (!ready) return toast.error('Choose who to send to.')
    if (count === 0) return toast.error('That selection has no valid email addresses.')

    const targetLabel = GROUP_TARGETS.find(t => t.val === target)?.label
    if (!(await confirm({
      title: 'Send email',
      message: `Send "${subject.trim()}" to ${count} recipient${count === 1 ? '' : 's'} (${targetLabel})? This cannot be undone.`,
      confirmLabel: `Send to ${count}`,
    }))) return

    setSending(true)
    try {
      const res = await sendAdminEmail({ target, classId, recipientIds: [...selected], subject: subject.trim(), body })
      if (res.failed > 0) {
        toast.error(`Sent ${res.sent} of ${res.total}. ${res.failed} failed${res.errors?.length ? `: ${res.errors[0]}` : ''}.`)
      } else {
        toast.success(`Email sent to ${res.sent} recipient${res.sent === 1 ? '' : 's'}.`)
        setSubject(''); setBody('')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl animate-fade-in">
      <PageHeader title="Send Email" subtitle="Compose and send an email to families, staff, or a specific class" />

      {/* Recipients */}
      <Card className="mb-5">
        <h3 className="font-display text-base text-slate-900 mb-3 flex items-center gap-2"><Users size={16} className="text-slate-400" /> Recipients</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-1">
          {GROUP_TARGETS.map(({ val, label, hint, Icon }) => (
            <button key={val} type="button" onClick={() => pickTarget(val)}
              className={`rounded-xl px-3 py-2.5 text-left border transition-all cursor-pointer ${target === val ? 'border-yellow-500 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <span className={`flex items-center gap-1.5 text-xs font-medium ${target === val ? 'text-yellow-800' : 'text-slate-700'}`}><Icon size={13} /> {label}</span>
              <span className={`block mt-0.5 text-[11px] ${target === val ? 'text-yellow-700/70' : 'text-slate-400'}`}>{hint}</span>
            </button>
          ))}
        </div>

        {/* Class picker */}
        {target === 'class' && (
          <div className="mt-3">
            <Select label="Class" id="cls" value={classId} onChange={e => setClassId(e.target.value)}>
              <option value="">Select a class…</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.semesters?.name ? ` — ${c.semesters.name}` : ''}</option>)}
            </Select>
            <p className="text-xs text-slate-400 mt-1.5">Emails the families of students enrolled in this class.</p>
          </div>
        )}

        {/* People picker */}
        {target === 'people' && (
          <div className="mt-3">
            {selected.size > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[...selected].map(id => {
                  const p = people.find(x => x.id === id)
                  return (
                    <span key={id} className="inline-flex items-center gap-1 text-xs bg-navy text-white rounded-full pl-2.5 pr-1 py-0.5">
                      {p?.label || 'Unknown'}
                      <button onClick={() => toggle(id)} className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/20 cursor-pointer"><X size={11} /></button>
                    </span>
                  )
                })}
              </div>
            )}
            <Input id="psearch" placeholder="Search families or staff…" value={peopleQuery} onChange={e => setPeopleQuery(e.target.value)} />
            <div className="mt-2 border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
              {peopleFiltered.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No matches.</p>
              ) : peopleFiltered.slice(0, 50).map(p => {
                const isSel = selected.has(p.id)
                return (
                  <button key={p.id} type="button" onClick={() => toggle(p.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-slate-50 transition-colors cursor-pointer">
                    <span className="min-w-0">
                      <span className="block text-sm text-slate-900 truncate">{p.label}</span>
                      <span className="block text-[11px] text-slate-400">{p.sub}</span>
                    </span>
                    <span className={`w-4.5 h-4.5 w-[18px] h-[18px] rounded flex-shrink-0 flex items-center justify-center border ${isSel ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'border-slate-300 text-transparent'}`}><Check size={12} /></span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Recipient count */}
        <div className="mt-3 text-xs">
          {!ready ? (
            <span className="text-slate-400">{target === 'class' ? 'Select a class to see recipients.' : 'Select at least one person.'}</span>
          ) : previewing ? (
            <span className="text-slate-400 inline-flex items-center gap-1.5"><RefreshCw size={12} className="animate-spin" /> Counting recipients…</span>
          ) : count === 0 ? (
            <span className="text-amber-600 inline-flex items-center gap-1.5"><AlertTriangle size={12} /> No valid email addresses for this selection.</span>
          ) : (
            <span className="text-slate-600">
              Will send to <span className="font-semibold text-slate-900">{count}</span> recipient{count === 1 ? '' : 's'}
              {preview?.sample?.length ? <span className="text-slate-400"> — e.g. {preview.sample.slice(0, 3).join(', ')}{count > 3 ? '…' : ''}</span> : null}
            </span>
          )}
        </div>
      </Card>

      {/* Message */}
      <Card>
        <h3 className="font-display text-base text-slate-900 mb-3 flex items-center gap-2"><Mail size={16} className="text-slate-400" /> Message</h3>
        <div className="space-y-3">
          <Input label="Subject" id="subj" placeholder="e.g. Class schedule update" value={subject} onChange={e => setSubject(e.target.value)} />
          <Textarea label="Message" id="msg" rows={8} placeholder="Write your message… Line breaks are preserved." value={body} onChange={e => setBody(e.target.value)} />
          <p className="text-[11px] text-slate-400">
            Sent from the school's address with the Xilin letterhead. Recipients are emailed individually — no one sees the other addresses.
          </p>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <Button variant="gold" size="sm" disabled={sending || loading || !ready || count === 0 || !subject.trim() || !body.trim()} onClick={send}>
              {sending ? <span className="flex items-center gap-2"><RefreshCw size={13} className="animate-spin" /> Sending…</span> : <span className="flex items-center gap-2"><Send size={13} /> Send Email{count ? ` (${count})` : ''}</span>}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
