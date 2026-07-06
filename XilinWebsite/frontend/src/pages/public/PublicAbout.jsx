import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { schoolInfo, boardMembers } from '../../lib/basicInfo'
import { listAboutPages, listSemesters } from '../../lib/supabaseClient'
import { Button, TableSkeleton } from '../../components/ui'
import { GROUP_ORDER, pathFor } from '../../lib/aboutNav'
import { ArrowRight, Mail, Globe, Phone } from 'lucide-react'

const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// ─── Minimal text renderer ────────────────────────────────────────────────────
// Supports: blank line = paragraph · "## " / "### " headings · "- " bullets ·
// **bold** · [link text](url). Keeps admins out of raw HTML.
function renderInline(text) {
  const nodes = []
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g
  let last = 0, m, i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1]) nodes.push(
      <a key={i++} href={m[2]} target="_blank" rel="noreferrer"
        className="text-yellow-700 font-medium underline underline-offset-2 hover:text-yellow-800">{m[1]}</a>
    )
    else nodes.push(<strong key={i++} className="font-semibold text-slate-800">{m[3]}</strong>)
    last = re.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

function renderBody(body) {
  const blocks = []
  let para = [], list = null, key = 0
  const flushPara = () => {
    if (para.length) blocks.push(<p key={key++} className="text-[15px] text-slate-600 leading-relaxed mb-4">{renderInline(para.join(' '))}</p>)
    para = []
  }
  const flushList = () => {
    if (list?.length) blocks.push(
      <ul key={key++} className="list-disc pl-5 space-y-1.5 text-[15px] text-slate-600 leading-relaxed mb-4">
        {list.map((item, i) => <li key={i}>{renderInline(item)}</li>)}
      </ul>
    )
    list = null
  }
  for (const raw of (body || '').split(/\r?\n/)) {
    const line = raw.trim()
    if (line.startsWith('## ')) {
      flushPara(); flushList()
      blocks.push(<h2 key={key++} className="font-display text-xl text-slate-900 mt-7 mb-2.5 first:mt-0">{renderInline(line.slice(3))}</h2>)
    } else if (line.startsWith('### ')) {
      flushPara(); flushList()
      blocks.push(<h3 key={key++} className="font-display text-base font-semibold text-slate-900 mt-5 mb-2 first:mt-0">{renderInline(line.slice(4))}</h3>)
    } else if (line.startsWith('- ')) {
      flushPara()
      if (!list) list = []
      list.push(line.slice(2))
    } else if (line === '') {
      flushPara(); flushList()
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara(); flushList()
  return blocks
}

// ─── Per-page extras (rendered below the editable body) ──────────────────────
function SemesterDates() {
  const [semesters, setSemesters] = useState([])
  useEffect(() => { listSemesters().then(setSemesters).catch(() => {}) }, [])
  const sem = semesters.find(s => s.is_current) || semesters.find(s => s.is_active) || semesters[0]
  if (!sem) return null
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 mt-8">
      <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-1">Calendar</p>
      <p className="font-display text-lg text-slate-900 mb-4">{sem.name}{sem.academic_year ? ` · ${sem.academic_year}` : ''}</p>
      <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
        {[
          ['Registration opens', sem.registration_start],
          ['Registration closes', sem.registration_end],
          ['Classes begin', sem.class_start],
          ['Classes end', sem.class_end],
        ].map(([label, d]) => (
          <div key={label} className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-sm font-medium text-slate-900">{fmtDate(d)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BoardCards() {
  return (
    <div className="grid sm:grid-cols-2 gap-5 mt-8">
      {boardMembers.map((m, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 flex items-start gap-4">
          {m.photo
            ? <img src={m.photo} alt={m.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border border-slate-200" />
            : <div className="w-20 h-20 rounded-2xl bg-navy text-yellow-400 font-display text-2xl flex items-center justify-center flex-shrink-0">{initials(m.name)}</div>}
          <div className="min-w-0">
            <p className="font-display text-lg text-slate-900">{m.name}</p>
            <p className="text-xs text-yellow-600 uppercase tracking-wide mb-2">{m.role}</p>
            <div className="flex flex-col gap-1 text-xs text-slate-600">
              {m.email && <a href={`mailto:${m.email}`} className="flex items-center gap-1.5 hover:text-yellow-700"><Mail size={12} className="text-yellow-600" />{m.email}</a>}
              {m.phone && <span className="flex items-center gap-1.5"><Phone size={12} className="text-yellow-600" />{m.phone}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ContactCard() {
  return (
    <div className="bg-navy rounded-2xl p-6 mt-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="flex flex-col gap-2 text-sm text-slate-300">
        <a href={`mailto:${schoolInfo.email}`} className="flex items-center gap-2 hover:text-white"><Mail size={14} className="text-yellow-400" />{schoolInfo.email}</a>
        <a href={`https://${schoolInfo.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><Globe size={14} className="text-yellow-400" />{schoolInfo.website}</a>
      </div>
      <Link to="/enroll"><Button variant="gold">Enroll Today <ArrowRight size={15} /></Button></Link>
    </div>
  )
}

const EXTRAS = { 'about-us': SemesterDates, 'school-board': BoardCards, 'contact-us': ContactCard }

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PublicAbout() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const activeSlug = slug || 'about-us'

  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listAboutPages().then(setPages).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  const page = pages.find(p => p.slug === activeSlug)
  const groups = GROUP_ORDER
    .map(g => ({ group: g, items: pages.filter(p => p.nav_group === g).sort((a, b) => a.sort_order - b.sort_order) }))
    .filter(g => g.items.length > 0)
  const Extra = EXTRAS[activeSlug]

  return (
    <div>
      {/* Header band */}
      <section className="bg-navy text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-yellow-400 font-zh text-sm tracking-widest mb-2">{schoolInfo.nameZh}</p>
          <h1 className="font-display text-3xl md:text-4xl">About {schoolInfo.shortName}</h1>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Mobile topic picker */}
        <div className="md:hidden mb-6">
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Topic</label>
          <select value={activeSlug} onChange={e => navigate(pathFor(e.target.value))}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg outline-none focus:border-yellow-500">
            {groups.map(({ group, items }) => (
              <optgroup key={group} label={group}>
                {items.map(p => <option key={p.slug} value={p.slug}>{p.title}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex gap-10 items-start">
          {/* Sidebar */}
          <aside className="hidden md:block w-60 flex-shrink-0 sticky top-24">
            {groups.map(({ group, items }) => (
              <div key={group} className="mb-5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-1.5 px-3">{group}</p>
                <div className="space-y-0.5">
                  {items.map(p => (
                    <Link key={p.slug} to={pathFor(p.slug)}
                      className={`block px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        p.slug === activeSlug
                          ? 'bg-yellow-50 text-yellow-800 font-medium'
                          : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                      }`}>
                      {p.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 max-w-3xl">
            {loading ? (
              <TableSkeleton rows={5} className="!p-0 py-4" />
            ) : error ? (
              <p className="text-red-500 text-sm py-12">Failed to load: {error}</p>
            ) : !page ? (
              <div className="py-12">
                <p className="text-slate-500 text-sm mb-3">That page doesn't exist.</p>
                <Link to="/about" className="text-yellow-600 hover:text-yellow-700 text-sm font-medium underline underline-offset-2">Back to About Us</Link>
              </div>
            ) : (
              <article className="animate-fade-in">
                <h2 className="font-display text-3xl text-slate-900 mb-6">{page.title}</h2>
                {renderBody(page.body)}
                {Extra && <Extra />}
              </article>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
