import { useState } from 'react'
import { publicAnnouncements } from '../../lib/mockData'
import { Lock } from 'lucide-react'
import { Link } from 'react-router-dom'

const CATS = ['all', 'events', 'academics', 'general', 'urgent']
const CAT_BG = { events: 'border-l-amber-400', academics: 'border-l-blue-400', general: 'border-l-slate-300', urgent: 'border-l-red-400' }
const CAT_BADGE = { events: 'bg-amber-100 text-amber-700', academics: 'bg-blue-100 text-blue-700', general: 'bg-slate-100 text-slate-600', urgent: 'bg-red-100 text-red-700' }

export default function PublicNews() {
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const allAnn = publicAnnouncements
  const publicOnly = allAnn.filter(a => a.is_public)
  const privateCount = allAnn.filter(a => !a.is_public).length

  const filtered = publicOnly.filter(a => filter === 'all' || a.category === filter)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-2">School Updates</p>
        <h1 className="font-display text-4xl text-slate-900 mb-3">News & Announcements</h1>
        <p className="text-slate-500">Stay up to date with everything happening at Academia.</p>
      </div>

      {/* Private notice banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-7 flex items-center gap-3">
        <Lock size={16} className="text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-500">
          {privateCount} internal announcement{privateCount !== 1 ? 's are' : ' is'} only visible to staff and students.{' '}
          <Link to="/login" className="text-yellow-600 hover:text-yellow-700 font-medium underline underline-offset-2">Sign in</Link> to see all updates.
        </p>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 mb-6 flex-wrap">
        {CATS.map(c => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
              filter === c ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {c === 'all' ? `All (${publicOnly.length})` : `${c} (${publicOnly.filter(a => a.category === c).length})`}
          </button>
        ))}
      </div>

      {/* Announcement list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-12">No announcements in this category.</p>
        )}
        {filtered.map(ann => (
          <div
            key={ann.id}
            onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
            className={`bg-white border-l-4 border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-all ${CAT_BG[ann.category]}`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-display text-[16px] text-slate-900 leading-snug">{ann.title}</h3>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 capitalize ${CAT_BADGE[ann.category]}`}>
                {ann.category}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">{ann.author} · {ann.published_at}</p>
            {expanded === ann.id && (
              <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3 animate-fade-in">
                {ann.body}
              </p>
            )}
            <p className="text-xs text-yellow-600 mt-1">{expanded === ann.id ? 'Show less ↑' : 'Read more ↓'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
