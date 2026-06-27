import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/layout/DashboardLayout'
import PublicLayout from '../components/layout/PublicLayout'

// Public pages
import Home          from '../pages/public/Home'
import PublicAbout   from '../pages/public/PublicAbout'
import PublicNews    from '../pages/public/PublicNews'
import PublicClasses from '../pages/public/PublicClasses'
import PublicEnroll  from '../pages/public/PublicEnroll'
import Login         from '../pages/public/Login'

// Shared portal pages
import Announcements from '../pages/shared/Announcements'
import Settings      from '../pages/shared/Settings'
import Timetable     from '../pages/shared/Timetable'

// Admin pages
import AdminDashboard   from '../pages/admin/Dashboard'
import AdminApplications from '../pages/admin/Applications'
import AdminCourses     from '../pages/admin/Courses'
import AdminClasses     from '../pages/admin/Classes'
import AdminSemesters   from '../pages/admin/Semesters'
import AdminReports     from '../pages/admin/Reports'
import AdminFamilies    from '../pages/admin/Families'
import AdminTimetable   from '../pages/admin/Timetable'
import AdminUsers       from '../pages/admin/Users'

// Teacher pages
import TeacherDashboard  from '../pages/teacher/Dashboard'
import TeacherMyClasses  from '../pages/teacher/MyClasses'

// Family (household) pages
import FamilyDashboard       from '../pages/family/Dashboard'
import FamilyPayments        from '../pages/family/Payments'

// ─── Guards ──────────────────────────────────────────────────────────────────
function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400 text-sm">Loading…</div>
  return user ? children : <Navigate to="/login" replace />
}

function RedirectIfAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-slate-400 text-sm">Loading…</div>
  return user ? <Navigate to="/dashboard" replace /> : children
}

// ─── Role-specific dashboard picker ──────────────────────────────────────────
function RoleDashboard() {
  const { user } = useAuth()
  if (user?.role === 'admin')   return <AdminDashboard />
  if (user?.role === 'teacher') return <TeacherDashboard />
  if (user?.role === 'family')  return <FamilyDashboard />
  return <AdminDashboard />
}

// ─── Portal routes (role-gated views) ────────────────────────────────────────
function PortalRoutes() {
  const { user } = useAuth()
  const role = user?.role

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/dashboard"      element={<RoleDashboard />} />
        <Route path="/announcements"  element={<Announcements />} />
        <Route path="/settings"       element={<Settings />} />

        {/* Admin */}
        {role === 'admin' && <>
          <Route path="/timetable"   element={<AdminTimetable />} />
          <Route path="/applications" element={<AdminApplications />} />
          <Route path="/courses"        element={<AdminCourses />} />
          <Route path="/manage-classes" element={<AdminClasses />} />
          <Route path="/semesters"    element={<AdminSemesters />} />
          <Route path="/reports"      element={<AdminReports />} />
          <Route path="/families"     element={<AdminFamilies />} />
          <Route path="/users"       element={<AdminUsers />} />
        </>}

        {/* Teacher */}
        {role === 'teacher' && <>
          <Route path="/my-classes"  element={<TeacherMyClasses />} />
          <Route path="/timetable"   element={<Timetable subtitle="Your teaching schedule" />} />
        </>}

        {/* Family (household) */}
        {role === 'family' && <>
          <Route path="/child-timetable"   element={<Timetable subtitle="Weekly class schedule" />} />
          <Route path="/payments"          element={<FamilyPayments />} />
        </>}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </DashboardLayout>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      {/* Public site */}
      <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
      <Route path="/about" element={<PublicLayout><PublicAbout /></PublicLayout>} />
      <Route path="/news" element={<PublicLayout><PublicNews /></PublicLayout>} />
      <Route path="/classes" element={<PublicLayout><PublicClasses /></PublicLayout>} />
      <Route path="/enroll" element={<PublicLayout><PublicEnroll /></PublicLayout>} />
      <Route path="/login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />

      {/* Authenticated portal */}
      <Route path="/*" element={<RequireAuth><PortalRoutes /></RequireAuth>} />
    </Routes>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
