import { useState, useEffect } from 'react'
import { listPublicAnnouncements } from '../../lib/supabaseClient'
import { Lock, X } from 'lucide-react'
import { Link } from 'react-router-dom'

const CATS = ['all', 'events', 'academics', 'general', 'urgent']
const CAT_BG = { events: 'border-l-amber-400', academics: 'border-l-blue-400', general: 'border-l-slate-300', urgent: 'border-l-red-400' }
const CAT_BADGE = { events: 'bg-amber-100 text-amber-700', academics: 'bg-blue-100 text-blue-700', general: 'bg-slate-100 text-slate-600', urgent: 'bg-red-100 text-red-700' }
const images = (a) => (a.media_urls?.length ? a.media_urls : (a.media_url ? [a.media_url] : []))

export default function PublicNews() {
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    listPublicAnnouncements()
      .then(setAnnouncements)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = announcements.filter(a => filter === 'all' || a.category === filter)

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-8">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-2">School Updates</p>
        <h1 className="font-display text-4xl text-slate-900 mb-3">News & Announcements</h1>
        <p className="text-slate-500">Stay up to date with everything happening at Xilin Northwest Chinese School.</p>
      </div>

      {/* Sign-in nudge */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-7 flex items-center gap-3">
        <Lock size={16} className="text-slate-400 flex-shrink-0" />
        <p className="text-sm text-slate-500">
          Staff, students, and families have access to additional internal announcements.{' '}
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
              filter === c ? 'bg-navy text-white' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {c === 'all' ? `All (${announcements.length})` : `${c} (${announcements.filter(a => a.category === c).length})`}
          </button>
        ))}
      </div>

      {/* Announcement list */}
      <div className="space-y-3">
        {loading && <p className="text-slate-400 text-sm text-center py-12">Loading announcements…</p>}
        {error && <p className="text-red-500 text-sm text-center py-12">Failed to load: {error}</p>}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-slate-400 text-sm text-center py-12">No announcements in this category.</p>
        )}
        {filtered.map(ann => {
          const imgs = images(ann)
          return (
          <div
            key={ann.id}
            onClick={() => setSelected(ann)}
            className={`bg-white border-l-4 border border-slate-200 rounded-xl p-5 cursor-pointer hover:border-slate-300 transition-all ${CAT_BG[ann.category]}`}
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <h3 className="font-display text-[16px] text-slate-900 leading-snug">{ann.title}</h3>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full flex-shrink-0 capitalize ${CAT_BADGE[ann.category]}`}>
                {ann.category}
              </span>
            </div>
            <p className="text-xs text-slate-400">{ann.profiles?.full_name || 'School Office'} · {ann.published_at?.slice(0, 10)}</p>
            <p className="text-sm text-slate-500 line-clamp-2 mt-1">{ann.body}</p>
            {imgs.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-thin">
                {imgs.map((url, i) => (
                  <img key={i} src={url} alt="" className="h-28 w-40 flex-shrink-0 object-cover rounded-lg border border-slate-100" />
                ))}
              </div>
            )}
          </div>
          )
        })}
      </div>

      {/* Announcement popup */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelected(null)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-600 cursor-pointer"><X size={18} /></button>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full capitalize ${CAT_BADGE[selected.category]}`}>{selected.category}</span>
            <h2 className="font-display text-2xl text-slate-900 mt-3 mb-1">{selected.title}</h2>
            <p className="text-xs text-slate-400 mb-4">{selected.profiles?.full_name || 'School Office'} · {selected.published_at?.slice(0, 10)}</p>
            {images(selected).length > 0 && (
              <div className="space-y-3 mb-4">
                {images(selected).map((url, i) => (
                  <img key={i} src={url} alt="" className="rounded-lg w-full max-h-80 object-cover border border-slate-100" />
                ))}
              </div>
            )}
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{selected.body}</p>
          </div>
        </div>
      )}
    </div>
  )
}
