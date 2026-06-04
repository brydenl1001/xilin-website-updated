import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '../ui'

const NAV_LINKS = [
  { label: 'Home',          to: '/' },
  { label: 'Announcements', to: '/news' },
  { label: 'Classes',       to: '/classes' },
  { label: 'Enroll',        to: '/enroll' },
]

export default function PublicNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="font-display text-xl text-slate-900">
          Aca<span className="text-yellow-500">demia</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                pathname === to
                  ? 'text-slate-900 font-medium bg-slate-100'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link to="/login">
            <Button variant="outline" size="sm">Sign In</Button>
          </Link>
          <Link to="/enroll">
            <Button variant="gold" size="sm">Apply Now</Button>
          </Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden text-slate-500">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-6 py-4 space-y-1">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
            <Link to="/login" className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
            <Link to="/enroll" className="flex-1"><Button variant="gold" size="sm" className="w-full">Apply</Button></Link>
          </div>
        </div>
      )}
    </nav>
  )
}
