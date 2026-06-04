// ─── PUBLIC SCHOOL INFO ──────────────────────────────────────────────────────

export const schoolInfo = {
  name: 'Academia',
  tagline: 'Shaping Minds. Building Futures.',
  founded: 1987,
  address: '42 Elmwood Avenue, Chicago, IL 60601',
  phone: '(312) 555-0190',
  email: 'info@academia.edu',
  principalName: 'Dr. Amelia Richardson',
  stats: [
    { label: 'Students Enrolled', value: '1,248' },
    { label: 'Expert Faculty', value: '96' },
    { label: 'Years of Excellence', value: '38+' },
    { label: 'Graduation Rate', value: '99%' },
  ],
}

export const publicClasses = [
  { id: 'cls-9', grade: 'Grade 9', teacher: 'Mr. Okonkwo', students: 120, subjects: ['Mathematics', 'English', 'Science', 'History', 'Art'], description: 'Foundation year focusing on core academic skills and critical thinking.' },
  { id: 'cls-10', grade: 'Grade 10', teacher: 'Ms. Rivera', students: 118, subjects: ['Mathematics', 'English Literature', 'Physics', 'History', 'Art & Design'], description: 'Intermediate studies with specialisation tracks beginning this year.' },
  { id: 'cls-11', grade: 'Grade 11', teacher: 'Dr. Chen', students: 112, subjects: ['Advanced Mathematics', 'English', 'Chemistry', 'Economics', 'Computer Science'], description: 'Pre-advanced studies preparing students for senior examinations.' },
  { id: 'cls-12', grade: 'Grade 12', teacher: 'Mr. Thompson', students: 98, subjects: ['Calculus', 'Literature', 'Physics', 'Economics', 'Design Technology'], description: 'Senior year with university-preparatory curriculum and mentorship.' },
]

export const publicAnnouncements = [
  { id: 1, title: 'Open Day — Saturday, June 7th', category: 'events', published_at: '2026-05-23', author: 'Admin Office', body: 'Prospective families are welcome to tour our campus, meet faculty, and learn about our programmes. Registration opens May 30th.', is_public: true },
  { id: 2, title: 'Annual Science Fair Results', category: 'academics', published_at: '2026-05-20', author: 'Science Dept.', body: 'Congratulations to all participants. First place goes to Sofia Reyes (Grade 11) for her project on urban air-quality monitoring.', is_public: true },
  { id: 3, title: 'New Computer Science Lab Opens', category: 'general', published_at: '2026-05-10', author: 'Principal', body: 'Our state-of-the-art CS lab is now open. The facility features 40 workstations and a dedicated robotics corner.', is_public: true },
  { id: 4, title: 'Fee Payment Deadline — June 1st', category: 'urgent', published_at: '2026-05-15', author: 'Finance Office', body: 'All outstanding Term 2 tuition fees must be settled by June 1st.', is_public: false },
  { id: 5, title: 'Staff Professional Development Day — May 30', category: 'general', published_at: '2026-05-18', author: 'Principal', body: 'School will be closed on May 30th for Staff PD.', is_public: false },
  { id: 6, title: 'End-of-Year Examinations Schedule', category: 'academics', published_at: '2026-05-23', author: 'Admin Office', body: 'Exams commence June 10th. Individual timetables are available in the portal.', is_public: false },
  { id: 7, title: 'Library Extended Hours During Exam Period', category: 'academics', published_at: '2026-05-10', author: 'Library', body: 'The library will be open until 8:00 PM on weekdays June 10-24.', is_public: false },
]

// ─── AUTH / ROLE DATA ─────────────────────────────────────────────────────────

export const mockUser = {
  id: 'usr-001', full_name: 'Jane Doe', role: 'admin',
  avatar_url: null, email: 'jane@academia.edu',
}

export const mockStats = {
  admin: [
    { label: 'Total Students', value: '1,248', delta: '+34 this term', trend: 'up', icon: 'Users' },
    { label: 'Pending Admissions', value: '87', delta: '12 need review', trend: 'warn', icon: 'UserCheck' },
    { label: 'Fees Collected', value: '$142k', delta: '94% of target', trend: 'up', icon: 'Coins' },
    { label: 'Avg. Attendance', value: '91%', delta: '+2% vs last month', trend: 'up', icon: 'TrendingUp' },
  ],
  teacher: [
    { label: 'My Classes', value: '4', delta: '128 students total', trend: 'up', icon: 'BookOpen' },
    { label: 'Pending Grades', value: '23', delta: 'Due this week', trend: 'warn', icon: 'PenLine' },
    { label: 'Avg. Attendance', value: '88%', delta: 'Across all classes', trend: 'up', icon: 'CalendarCheck' },
    { label: 'Published Notices', value: '3', delta: 'This month', trend: 'up', icon: 'Megaphone' },
  ],
  student: [
    { label: 'GPA', value: '3.7', delta: '+0.2 this term', trend: 'up', icon: 'BarChart2' },
    { label: 'Attendance', value: '94%', delta: 'This semester', trend: 'up', icon: 'CalendarCheck' },
    { label: 'Pending Fees', value: '$850', delta: 'Due Jun 1', trend: 'warn', icon: 'Coins' },
    { label: 'Assignments Due', value: '5', delta: 'This week', trend: 'warn', icon: 'ClipboardList' },
  ],
  parent: [
    { label: "Child GPA", value: '3.5', delta: 'Grade 10-A', trend: 'up', icon: 'BarChart2' },
    { label: 'Attendance', value: '91%', delta: 'This semester', trend: 'up', icon: 'CalendarCheck' },
    { label: 'Outstanding Fees', value: '$850', delta: 'Due Jun 1', trend: 'warn', icon: 'Coins' },
    { label: 'New Messages', value: '2', delta: 'From teachers', trend: 'up', icon: 'MessageSquare' },
  ],
}

export const mockEnrollments = [
  { id: 'enr-001', student_name: 'Marcus Webb', grade: 'Grade 10', status: 'pending', applied: '2026-05-20', email: 'marcus@email.com' },
  { id: 'enr-002', student_name: 'Sofia Reyes', grade: 'Grade 9', status: 'admitted', applied: '2026-05-15', email: 'sofia@email.com' },
  { id: 'enr-003', student_name: 'Ethan Park', grade: 'Grade 11', status: 'enrolled', applied: '2026-05-01', email: 'ethan@email.com' },
  { id: 'enr-004', student_name: 'Amara Osei', grade: 'Grade 10', status: 'rejected', applied: '2026-04-28', email: 'amara@email.com' },
  { id: 'enr-005', student_name: 'Liam Chen', grade: 'Grade 9', status: 'pending', applied: '2026-05-22', email: 'liam@email.com' },
  { id: 'enr-006', student_name: 'Priya Sharma', grade: 'Grade 12', status: 'enrolled', applied: '2026-04-10', email: 'priya@email.com' },
]

export const mockPayments = [
  { id: 'pay-001', student: 'Ethan Park', description: 'Tuition Term 2', amount: 4200, status: 'paid', date: '2026-05-01', ref: 'SAND-A1B2C3' },
  { id: 'pay-002', student: 'Sofia Reyes', description: 'Registration Fee', amount: 350, status: 'paid', date: '2026-05-16', ref: 'SAND-D4E5F6' },
  { id: 'pay-003', student: 'Marcus Webb', description: 'Tuition Term 2', amount: 4200, status: 'pending', date: null, ref: null },
  { id: 'pay-004', student: 'Priya Sharma', description: 'Lab Fee', amount: 150, status: 'paid', date: '2026-04-28', ref: 'SAND-G7H8I9' },
  { id: 'pay-005', student: 'Liam Chen', description: 'Tuition Term 2', amount: 4200, status: 'failed', date: '2026-05-20', ref: 'SAND-J1K2L3' },
]

export const mockGrades = [
  { subject: 'Mathematics', teacher: 'Mr. Okonkwo', score: 88, max: 100, term: 'Term 2', grade: 'B+' },
  { subject: 'English Literature', teacher: 'Ms. Rivera', score: 94, max: 100, term: 'Term 2', grade: 'A' },
  { subject: 'Physics', teacher: 'Dr. Chen', score: 76, max: 100, term: 'Term 2', grade: 'B' },
  { subject: 'History', teacher: 'Mr. Thompson', score: 91, max: 100, term: 'Term 2', grade: 'A-' },
  { subject: 'Art and Design', teacher: 'Ms. Patel', score: 97, max: 100, term: 'Term 2', grade: 'A+' },
]

export const mockAttendance = [
  { class: 'Grade 10-A', date: 'Today', present: 29, total: 30, pct: 97 },
  { class: 'Grade 11-B', date: 'Today', present: 26, total: 30, pct: 87 },
  { class: 'Grade 9-C', date: 'Today', present: 22, total: 30, pct: 73 },
  { class: 'Grade 12-A', date: 'Today', present: null, total: 28, pct: null },
]

export const mockTimetable = {
  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  periods: [
    { time: '8:00-9:00',   subjects: ['Mathematics', 'Physics', 'Mathematics', 'English Literature', 'Art and Design'] },
    { time: '9:00-10:00',  subjects: ['English Literature', 'Mathematics', 'History', 'Physics', 'Mathematics'] },
    { time: '10:20-11:20', subjects: ['Physics', 'History', 'English Literature', 'Art and Design', 'English Literature'] },
    { time: '11:20-12:20', subjects: ['Art and Design', 'English Literature', 'Physics', 'Mathematics', 'History'] },
    { time: '13:00-14:00', subjects: ['History', 'Art and Design', 'Art and Design', 'History', 'Physics'] },
  ],
}

export const mockChildren = [
  { id: 'std-001', name: 'James Doe', grade: 'Grade 10-A', gpa: 3.5, attendance: 91, teacher: 'Ms. Rivera', fees_due: 850 },
]
