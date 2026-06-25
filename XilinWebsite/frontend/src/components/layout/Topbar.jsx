import { Bell, PanelLeft, Inbox } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { listAnnouncements, listEnrollmentApplications } from '../../lib/supabaseClient'

const PAGE_TITLES = {
  '/dashboard':       'Dashboard',
  '/announcements':   'Announcements',
  '/courses':         'Course Catalog',
  '/manage-classes':  'Class Management',
  '/applications':    'Applications',
  '/families':        'Families',
  '/attendance':      'Attendance',
  '/child-attendance':'Attendance',
  '/timetable':       'Timetable',
  '/child-timetable': 'Timetable',
  '/my-classes':      'My Classes',
  '/payments':        'Payments',
  '/my-payments':     'My Payments',
  '/users':           'User Management',
  '/settings':        'Settings',
}

const CAT_DOT = { urgent: 'bg-red-400', events: 'bg-amber-400', academics: 'bg-blue-400', general: 'bg-slate-300' }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function NotificationsBell() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState([])
  const [pending, setPending] = useState(0)
  const [lastSeen, setLastSeen] = useState(() => Number(localStorage.getItem('notifLastSeen') || 0))
  const ref = useRef(null)

  useEffect(() => {
    listAnnouncements().then(a => setItems(a.slice(0, 6))).catch(() => {})
    if (user?.role === 'admin') {
      listEnrollmentApplications('pending').then(a => setPending(a.length)).catch(() => {})
    }
  }, [user?.role])

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const newestTs = items[0]?.published_at ? new Date(items[0].published_at).getTime() : 0
  const hasUnread = pending > 0 || newestTs > lastSeen

  const toggle = () => {
    setOpen(o => {
      const next = !o
      if (next) {
        const now = Date.now()
        localStorage.setItem('notifLastSeen', String(now))
        setLastSeen(now)
      }
      return next
    })
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle} aria-label="Notifications"
        className="relative text-slate-500 hover:text-slate-800 transition-colors p-1 cursor-pointer">
        <Bell size={17} />
        {hasUnread && <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-500 rounded-full" />}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900">Notifications</p>
          </div>

          {user?.role === 'admin' && pending > 0 && (
            <Link to="/applications" onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 bg-yellow-50 hover:bg-yellow-100 transition-colors border-b border-slate-100">
              <Inbox size={16} className="text-yellow-600 flex-shrink-0" />
              <span className="text-sm text-yellow-800">
                {pending} application{pending !== 1 ? 's' : ''} awaiting review
              </span>
            </Link>
          )}

          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No announcements yet.</p>
            ) : items.map(ann => (
              <Link key={ann.id} to="/announcements" onClick={() => setOpen(false)}
                className="flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${CAT_DOT[ann.category]}`} />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-slate-900 truncate">{ann.title}</span>
                  <span className="block text-[11px] text-slate-400">{ann.published_at?.slice(0, 10)}</span>
                </span>
              </Link>
            ))}
          </div>

          <Link to="/announcements" onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-center text-xs text-yellow-600 hover:text-yellow-700 hover:bg-slate-50 transition-colors border-t border-slate-100">
            View all announcements
          </Link>
        </div>
      )}
    </div>
  )
}

export default function Topbar({ onSidebarToggle, pathname }) {
  const { user } = useAuth()
  const title = PAGE_TITLES[pathname] || 'Portal'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={onSidebarToggle} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0 cursor-pointer">
          <PanelLeft size={18} />
        </button>
        <h1 className="font-display text-[17px] text-slate-900 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <NotificationsBell />

        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-slate-200">
          <p className="text-xs text-slate-500 whitespace-nowrap">
            {greeting()},{' '}
            <span className="text-slate-800 font-medium">{user?.full_name?.split(' ')[0]}</span>
          </p>
        </div>
      </div>
    </header>
  )
}
