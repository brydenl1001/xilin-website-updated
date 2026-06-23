// Static branding/config content — not backed by any database table.
// Everything else previously here (mockUser, mockStats, mockEnrollments,
// mockPayments, mockGrades, mockAttendance, mockTimetable, mockChildren,
// publicClasses, publicAnnouncements) has been replaced by real Supabase
// calls via src/lib/supabaseClient.js.

export const schoolInfo = {
  name: 'Academia',
  tagline: 'Shaping Minds. Building Futures.',
  founded: 1987,
  address: '42 Elmwood Avenue, Chicago, IL 60601',
  phone: '(312) 555-0190',
  email: 'info@academia.edu',
  principalName: 'Dr. Amelia Richardson',
}
