import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Megaphone, BookOpen, CalendarCheck, Clock,
  Home, CreditCard, Users, Settings, LogOut, GraduationCap,
  ChevronLeft, ChevronRight, Globe, Inbox
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV_CONFIG = {
  admin: [
    { section: 'Overview', items: [
      { label: 'Dashboard',     to: '/dashboard',     icon: LayoutDashboard },
      { label: 'Announcements', to: '/announcements', icon: Megaphone },
    ]},
    { section: 'Catalog', items: [
      { label: 'Courses',      to: '/courses',        icon: BookOpen },
      { label: 'Classes',      to: '/manage-classes', icon: GraduationCap },
    ]},
    { section: 'Academic', items: [
      { label: 'Attendance',   to: '/attendance', icon: CalendarCheck },
      { label: 'Timetable',    to: '/timetable',  icon: Clock },
    ]},
    { section: 'Management', items: [
      { label: 'Applications', to: '/applications', icon: Inbox },
      { label: 'Families',     to: '/families',     icon: Home },
      { label: 'Users',        to: '/users',        icon: Users },
      { label: 'Payments',     to: '/payments',     icon: CreditCard },
    ]},
    { section: 'System', items: [
      { label: 'Settings',     to: '/settings',    icon: Settings },
    ]},
  ],
  teacher: [
    { section: 'Overview', items: [
      { label: 'Dashboard',     to: '/dashboard',     icon: LayoutDashboard },
      { label: 'Announcements', to: '/announcements', icon: Megaphone },
    ]},
    { section: 'Academic', items: [
      { label: 'My Classes',   to: '/my-classes',  icon: BookOpen },
      { label: 'Attendance',   to: '/attendance',  icon: CalendarCheck },
      { label: 'Timetable',    to: '/timetable',   icon: Clock },
    ]},
    { section: 'System', items: [
      { label: 'Settings',     to: '/settings',    icon: Settings },
    ]},
  ],
  family: [
    { section: 'Overview', items: [
      { label: 'Dashboard',     to: '/dashboard',     icon: LayoutDashboard },
      { label: 'Announcements', to: '/announcements', icon: Megaphone },
    ]},
    { section: 'Family', items: [
      { label: 'Attendance',   to: '/child-attendance',  icon: CalendarCheck },
      { label: 'Timetable',    to: '/child-timetable',   icon: Clock },
    ]},
    { section: 'Finance', items: [
      { label: 'Payments',     to: '/payments',    icon: CreditCard },
    ]},
    { section: 'System', items: [
      { label: 'Settings',     to: '/settings',    icon: Settings },
    ]},
  ],
}

const ROLE_BADGE = {
  admin:   'bg-yellow-400/20 text-yellow-300',
  teacher: 'bg-cyan-400/20 text-cyan-300',
  family:  'bg-purple-400/20 text-purple-300',
}

function Initials({ name }) {
  const parts = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-yellow-400/15 border border-yellow-400/30 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-yellow-400">
      {parts}
    </div>
  )
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, signOut } = useAuth()
  if (!user) return null
  const sections = NAV_CONFIG[user.role] || NAV_CONFIG.admin

  return (
    <aside className={`h-screen flex flex-col bg-navy transition-[width] duration-300 ease-in-out flex-shrink-0 ${collapsed ? 'w-[60px]' : 'w-56'}`}>
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-white/8 min-h-[68px]">
        {!collapsed && (
          <div className="flex items-center gap-2 overflow-hidden">
            <img src="/XilinLogo.jpg" alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0 ring-1 ring-white/15" />
            <div className="overflow-hidden">
              <p className="font-display text-[15px] text-white whitespace-nowrap leading-tight">
                Xilin<span className="text-yellow-400 font-zh"> 希林</span>
              </p>
              <p className="text-[9px] text-white/30 uppercase tracking-widest">Chinese School</p>
            </div>
          </div>
        )}
        {collapsed && <img src="/XilinLogo.jpg" alt="Xilin logo" className="w-8 h-8 rounded-full object-cover mx-auto ring-1 ring-white/15" />}
        {!collapsed && (
          <button onClick={onToggle} className="text-white/25 hover:text-white/60 transition-colors ml-2 flex-shrink-0 cursor-pointer">
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      {/* Toggle when collapsed */}
      {collapsed && (
        <button onClick={onToggle} className="flex justify-center py-3 text-white/25 hover:text-white/60 transition-colors border-b border-white/8 cursor-pointer">
          <ChevronRight size={14} />
        </button>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {sections.map(section => (
          <div key={section.section} className="mb-1">
            {!collapsed && (
              <p className="text-[9px] font-medium uppercase tracking-widest text-white/25 px-4 pt-3 pb-1">
                {section.section}
              </p>
            )}
            {section.items.map(({ label, to, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={collapsed ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 py-2.5 text-[13px] transition-all duration-150 border-l-2 ${
                    collapsed ? 'px-0 justify-center' : 'px-4'
                  } ${
                    isActive
                      ? 'text-yellow-400 bg-yellow-400/8 border-yellow-400 font-medium'
                      : 'text-white/50 border-transparent hover:text-white/80 hover:bg-white/4'
                  }`
                }
              >
                <Icon size={15} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Public site link */}
      <NavLink
        to="/"
        className="flex items-center gap-3 px-4 py-3 text-[12px] text-white/25 hover:text-white/50 border-t border-white/8 transition-colors"
        title={collapsed ? 'Public Site' : undefined}
      >
        <Globe size={13} className="flex-shrink-0" />
        {!collapsed && 'Public Site'}
      </NavLink>

      {/* User footer */}
      <div className="p-3 border-t border-white/8">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <Initials name={user.full_name} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white font-medium truncate">{user.full_name}</p>
              <span className={`text-[9px] capitalize font-medium px-1.5 py-0.5 rounded ${ROLE_BADGE[user.role]}`}>
                {user.role}
              </span>
            </div>
            <button onClick={signOut} title="Sign out" className="text-white/25 hover:text-white/60 transition-colors flex-shrink-0 cursor-pointer">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={signOut} title="Sign out" className="flex justify-center w-full text-white/25 hover:text-white/60 py-1 transition-colors cursor-pointer">
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}
