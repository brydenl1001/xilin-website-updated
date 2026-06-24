import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '../context/AuthContext'
import DashboardLayout from '../components/layout/DashboardLayout'
import PublicLayout from '../components/layout/PublicLayout'

// Public pages
import Home          from '../pages/public/Home'
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
import AdminFamilies    from '../pages/admin/Families'
import AdminPayments    from '../pages/admin/Payments'
import AdminAttendance  from '../pages/admin/Attendance'
import AdminTimetable   from '../pages/admin/Timetable'
import AdminUsers       from '../pages/admin/Users'

// Teacher pages
import TeacherDashboard  from '../pages/teacher/Dashboard'
import TeacherMyClasses  from '../pages/teacher/MyClasses'
import TeacherAttendance from '../pages/teacher/Attendance'

// Student pages
import StudentDashboard  from '../pages/student/Dashboard'
import StudentMyPayments from '../pages/student/MyPayments'
import StudentAttendance from '../pages/student/Attendance'

// Parent pages
import ParentDashboard       from '../pages/parent/Dashboard'
import ParentChildAttendance from '../pages/parent/ChildAttendance'
import ParentPayments        from '../pages/parent/Payments'

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
  if (user?.role === 'student') return <StudentDashboard />
  if (user?.role === 'parent')  return <ParentDashboard />
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
          <Route path="/attendance"  element={<AdminAttendance />} />
          <Route path="/timetable"   element={<AdminTimetable />} />
          <Route path="/applications" element={<AdminApplications />} />
          <Route path="/courses"        element={<AdminCourses />} />
          <Route path="/manage-classes" element={<AdminClasses />} />
          <Route path="/families"     element={<AdminFamilies />} />
          <Route path="/payments"    element={<AdminPayments />} />
          <Route path="/users"       element={<AdminUsers />} />
        </>}

        {/* Teacher */}
        {role === 'teacher' && <>
          <Route path="/my-classes"  element={<TeacherMyClasses />} />
          <Route path="/attendance"  element={<TeacherAttendance />} />
          <Route path="/timetable"   element={<Timetable subtitle="Your teaching schedule" />} />
        </>}

        {/* Student */}
        {role === 'student' && <>
          <Route path="/attendance"  element={<StudentAttendance />} />
          <Route path="/timetable"   element={<Timetable subtitle="Your weekly class schedule" />} />
          <Route path="/my-payments" element={<StudentMyPayments />} />
        </>}

        {/* Parent */}
        {role === 'parent' && <>
          <Route path="/child-attendance"  element={<ParentChildAttendance />} />
          <Route path="/child-timetable"   element={<Timetable subtitle="Weekly class schedule" />} />
          <Route path="/payments"          element={<ParentPayments />} />
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
