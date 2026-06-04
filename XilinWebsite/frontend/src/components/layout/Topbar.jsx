import { Bell, Search, PanelLeft } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useState } from 'react'

const PAGE_TITLES = {
  '/dashboard':       'Dashboard',
  '/announcements':   'Announcements',
  '/grades':          'Grade Management',
  '/my-grades':       'My Grades',
  '/child-grades':    'Grades',
  '/grade-entry':     'Grade Entry',
  '/attendance':      'Attendance',
  '/child-attendance':'Attendance',
  '/timetable':       'Timetable',
  '/child-timetable': 'Timetable',
  '/my-classes':      'My Classes',
  '/enrollments':     'Enrollments',
  '/payments':        'Payments',
  '/my-payments':     'My Payments',
  '/users':           'User Management',
  '/settings':        'Settings',
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function Topbar({ onSidebarToggle, pathname }) {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const title = PAGE_TITLES[pathname] || 'Portal'

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 gap-4">
      <div className="flex items-center gap-4 min-w-0">
        <button onClick={onSidebarToggle} className="text-slate-400 hover:text-slate-700 transition-colors flex-shrink-0">
          <PanelLeft size={18} />
        </button>
        <h1 className="font-display text-[17px] text-slate-900 truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 h-8">
          <Search size={13} className="text-slate-400 flex-shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="bg-transparent text-xs outline-none w-28 placeholder:text-slate-400 text-slate-800"
          />
        </div>

        <button className="relative text-slate-500 hover:text-slate-800 transition-colors p-1">
          <Bell size={17} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-yellow-400 rounded-full" />
        </button>

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
