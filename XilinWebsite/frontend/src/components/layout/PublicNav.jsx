import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { Menu, X, LayoutDashboard } from 'lucide-react'
import { Button } from '../ui'
import { useAuth } from '../../context/AuthContext'

const NAV_LINKS = [
  { label: 'Home',          to: '/' },
  { label: 'About',         to: '/about' },
  { label: 'Classes',       to: '/classes' },
  { label: 'Announcements', to: '/news' },
  { label: 'Enroll',        to: '/enroll' },
]

export default function PublicNav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/XilinLogo.png" alt="Xilin Northwest Chinese School logo" className="w-9 h-9 object-contain" />
          <span className="font-display text-xl text-slate-900">Xilin<span className="text-yellow-600 font-zh"> 希林</span></span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, to }) => (
            <Link
              key={to}
              to={to}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                pathname === to
                  ? 'text-yellow-800 font-medium bg-yellow-50'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link to="/dashboard">
              <Button variant="gold" size="sm"><LayoutDashboard size={14} /> Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link to="/enroll">
                <Button variant="gold" size="sm">Apply Now</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(o => !o)} className="md:hidden text-slate-500 cursor-pointer">
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
              className="block px-3 py-2.5 rounded-lg text-sm text-slate-600 hover:bg-yellow-50 hover:text-yellow-800 transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="flex gap-2 pt-3 border-t border-slate-100 mt-2">
            {user ? (
              <Link to="/dashboard" onClick={() => setOpen(false)} className="flex-1"><Button variant="gold" size="sm" className="w-full"><LayoutDashboard size={14} /> Dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login" className="flex-1"><Button variant="outline" size="sm" className="w-full">Sign In</Button></Link>
                <Link to="/enroll" className="flex-1"><Button variant="gold" size="sm" className="w-full">Apply</Button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
