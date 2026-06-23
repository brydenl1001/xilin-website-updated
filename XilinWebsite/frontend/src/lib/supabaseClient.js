import { supabase } from './supabase'

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE SUPABASE FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════
// Aligned with the final schema:
//   profiles, families, family_members, semesters, courses, classes,
//   class_teachers, enrollments, fee_structures, payments, announcements,
//   grades, attendance
//
// All functions here use the anon key and rely on RLS policies for access
// control. Safe to call directly from React components/pages.
//
// NOT included here (must go through a backend endpoint instead — see the
// BACKEND-ONLY block at the bottom of this file):
//   - supabase.auth.admin.createUser()       → needs service role key
//   - Creating students, parents, families    → needs service role key
//   - Multi-table atomic transactions          → enrollment approval +
//     class assignment + family linking, real payment confirmation, etc.
// ═════════════════════════════════════════════════════════════════════════════


// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC STATS
// ─────────────────────────────────────────────────────────────────────────────

/** Public: get counts of students and teachers for the homepage stats section. */
export async function getPublicStats() {
  const [students, teachers] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
  ])
  if (students.error) throw students.error
  if (teachers.error) throw teachers.error
  return { studentCount: students.count ?? 0, teacherCount: teachers.count ?? 0 }
}


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

/** Sign in with email + password. Works for admin, teacher, student, or family. */
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

/** Sign out the current session. */
export async function signOut() {
  return supabase.auth.signOut()
}

/** Get the current session (or null). */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

/** Subscribe to auth state changes. Returns the unsubscribe function. */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => callback(event, session))
  return () => data.subscription.unsubscribe()
}


// ─────────────────────────────────────────────────────────────────────────────
// IDENTITY RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
// Two distinct login types exist:
//   1. profiles.id = auth.uid()  → admin, teacher, student (can_login = true)
//   2. families.id = auth.uid()  → household login for the parent portal
// Call this right after sign-in to figure out which one you have.

/**
 * Resolve who is currently logged in.
 * Returns either:
 *   { type: 'profile', id, full_name, role, can_login, ... }
 *   { type: 'family',  id, family_name, email, family_members: [...] }
 */
export async function resolveCurrentIdentity(uid) {
  // Try family login first
  const { data: family, error: familyError } = await supabase
    .from('families')
    .select('*, family_members(*, profiles(*))')
    .eq('id', uid)
    .maybeSingle()
  if (familyError) throw familyError

  if (family) {
    return { type: 'family', ...family }
  }

  // Otherwise it's a direct profile login (admin/teacher/student)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single()
  if (profileError) throw profileError

  return { type: 'profile', ...profile }
}

/** Fetch a single profile by id. RLS allows: self, own family, or admin. */
export async function getProfile(profileId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()
  if (error) throw error
  return data
}

/** Update the current user's own profile (name, phone, avatar — not role/can_login). */
export async function updateOwnProfile(profileId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: list all profiles, optionally filtered by role. RLS allows full access for admins. */
export async function listProfiles(role = null) {
  let query = supabase.from('profiles').select('*')
  if (role) query = query.eq('role', role)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// FAMILIES (creation is backend-only — these are read/management operations)
// ─────────────────────────────────────────────────────────────────────────────

/** Family: get own record + all members (parents + students). */
export async function getOwnFamily(familyId) {
  const { data, error } = await supabase
    .from('families')
    .select('*, family_members(*, profiles(*))')
    .eq('id', familyId)
    .single()
  if (error) throw error
  return data
}

/** Admin: list all families. */
export async function listFamilies() {
  const { data, error } = await supabase
    .from('families')
    .select('*, family_members(*, profiles(*))')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Admin: update family contact info (name, phone, address — not email/credentials). */
export async function updateFamily(familyId, updates) {
  const { data, error } = await supabase
    .from('families')
    .update(updates)
    .eq('id', familyId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Admin: link an EXISTING profile (parent or student) to a family.
 * relationship must be one of: 'parent' | 'student' | 'guardian'
 * Note: a database trigger blocks admin/teacher profiles from being added.
 */
export async function addFamilyMember(familyId, profileId, relationship, isPrimaryContact = false) {
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      family_id: familyId,
      profile_id: profileId,
      relationship,
      is_primary_contact: isPrimaryContact,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: remove a member from a family. */
export async function removeFamilyMember(familyId, profileId) {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('profile_id', profileId)
  if (error) throw error
}


// ─────────────────────────────────────────────────────────────────────────────
// SEMESTERS
// ─────────────────────────────────────────────────────────────────────────────

/** Authenticated: list all semesters. */
export async function listSemesters() {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .order('class_start', { ascending: false })
  if (error) throw error
  return data
}

/** Get the currently active semester (is_active = true). */
export async function getActiveSemester() {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('is_active', true)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Admin: create a new semester (registration_start/end, class_start/end required). */
export async function createSemester(semester) {
  const { data, error } = await supabase
    .from('semesters')
    .insert(semester)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: update a semester (dates, name, is_active flag). */
export async function updateSemester(semesterId, updates) {
  const { data, error } = await supabase
    .from('semesters')
    .update(updates)
    .eq('id', semesterId)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// COURSES (reusable templates, year-agnostic)
// ─────────────────────────────────────────────────────────────────────────────

/** Authenticated: list all course templates. */
export async function listCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('grade_level', { ascending: true })
  if (error) throw error
  return data
}

/** Public: list courses for the unauthenticated /classes page. */
export async function listPublicCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('grade_level', { ascending: true })
  if (error) throw error
  return data
}

/** Admin: create a new course template (code, name, grade_level required). */
export async function createCourse(course) {
  const { data, error } = await supabase
    .from('courses')
    .insert(course)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: update a course template. */
export async function updateCourse(courseId, updates) {
  const { data, error } = await supabase
    .from('courses')
    .update(updates)
    .eq('id', courseId)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// CLASSES (a running instance of a course in a semester)
// ─────────────────────────────────────────────────────────────────────────────

/** Authenticated: list classes, optionally filtered by semester. Includes teachers via join. */
export async function listClasses(semesterId = null) {
  let query = supabase
    .from('classes')
    .select('*, courses(*), semesters(*), class_teachers(role, profiles(*))')

  if (semesterId) query = query.eq('semester_id', semesterId)

  const { data, error } = await query.order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Get a single class with full detail (course, semester, all assigned teachers). */
export async function getClass(classId) {
  const { data, error } = await supabase
    .from('classes')
    .select('*, courses(*), semesters(*), class_teachers(role, profiles(*))')
    .eq('id', classId)
    .single()
  if (error) throw error
  return data
}

/** Teacher: list classes assigned to the given teacher (via class_teachers junction). */
export async function listMyClasses(teacherId) {
  const { data, error } = await supabase
    .from('class_teachers')
    .select('role, classes(*, courses(*), semesters(*))')
    .eq('teacher_id', teacherId)
  if (error) throw error
  return data
}

/** Admin: create a new class instance (course_id, semester_id, name required). */
export async function createClass(classData) {
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: update a class (room, max_students, course/semester links). */
export async function updateClass(classId, updates) {
  const { data, error } = await supabase
    .from('classes')
    .update(updates)
    .eq('id', classId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: assign a teacher to a class. role: 'lead' | 'assistant' | 'substitute'. */
export async function assignTeacherToClass(classId, teacherId, role = 'lead') {
  const { data, error } = await supabase
    .from('class_teachers')
    .insert({ class_id: classId, teacher_id: teacherId, role })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: remove a teacher from a class. */
export async function removeTeacherFromClass(classId, teacherId) {
  const { error } = await supabase
    .from('class_teachers')
    .delete()
    .eq('class_id', classId)
    .eq('teacher_id', teacherId)
  if (error) throw error
}


// ─────────────────────────────────────────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Student/family: get own enrollment records (RLS: student_id = auth.uid() OR is_family_of). */
export async function getOwnEnrollments(studentId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, classes(*, courses(*), semesters(*))')
    .eq('student_id', studentId)
    .order('application_date', { ascending: false })
  if (error) throw error
  return data
}

/** Admin/teacher: list all enrollments, optionally filtered by status. */
export async function listEnrollments(status = null) {
  let query = supabase
    .from('enrollments')
    .select('*, profiles(full_name, role)')

  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('application_date', { ascending: false })
  if (error) throw error
  return data
}

/**
 * NOTE: Submitting a brand-new application creates an auth.users entry for
 * the student, so the public "Apply" action must go through a BACKEND
 * endpoint, not this client file (see submitEnrollmentApplication in the
 * backend-only block below). This function only edits an EXISTING enrollment.
 */
export async function updateEnrollmentNotes(enrollmentId, notes) {
  const { data, error } = await supabase
    .from('enrollments')
    .update({ notes })
    .eq('id', enrollmentId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: update enrollment status. Sets admission_date automatically when status = 'admitted'. */
export async function updateEnrollmentStatus(enrollmentId, status) {
  const updates = { status }
  if (status === 'admitted') updates.admission_date = new Date().toISOString()

  const { data, error } = await supabase
    .from('enrollments')
    .update(updates)
    .eq('id', enrollmentId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: assign an admitted student to a specific class, marking them enrolled. */
export async function assignEnrollmentToClass(enrollmentId, classId) {
  const { data, error } = await supabase
    .from('enrollments')
    .update({ class_id: classId, status: 'enrolled' })
    .eq('id', enrollmentId)
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Teacher/admin: get the roster of students enrolled in a specific class.
 *
 * NOTE — RLS GAP: the current enrollments policy grants ANY teacher full
 * access (is_teacher() returns true for all teachers, not just those
 * assigned to this class). Tighten it with something like:
 *
 *   create policy "Teacher sees own class enrollments" on enrollments
 *     for select using (
 *       exists (
 *         select 1 from class_teachers ct
 *         where ct.class_id = enrollments.class_id
 *           and ct.teacher_id = auth.uid()
 *       )
 *     );
 *
 * and drop teachers from the blanket is_admin() or is_teacher() policy.
 */
export async function getClassRoster(classId) {
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, profiles(*)')
    .eq('class_id', classId)
    .eq('status', 'enrolled')
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// FEE STRUCTURES
// ─────────────────────────────────────────────────────────────────────────────

/** Authenticated: list fee structures, optionally filtered by semester. */
export async function listFeeStructures(semesterId = null) {
  let query = supabase.from('fee_structures').select('*, semesters(*)')
  if (semesterId) query = query.eq('semester_id', semesterId)

  const { data, error } = await query.order('due_date', { ascending: true })
  if (error) throw error
  return data
}

/** Admin: create a fee structure (name, amount, due_date required; grade_level/semester_id optional). */
export async function createFeeStructure(feeStructure) {
  const { data, error } = await supabase
    .from('fee_structures')
    .insert(feeStructure)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: update a fee structure. */
export async function updateFeeStructure(feeStructureId, updates) {
  const { data, error } = await supabase
    .from('fee_structures')
    .update(updates)
    .eq('id', feeStructureId)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// PAYMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Student/family: get own payment history. */
export async function getOwnPayments(studentId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*, fee_structures(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Admin: list all payments, optionally filtered by status. */
export async function listPayments(status = null) {
  let query = supabase
    .from('payments')
    .select('*, profiles(full_name), fee_structures(*)')

  if (status) query = query.eq('status', status)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * SANDBOX ONLY. Simulates what a real backend webhook would do after
 * verifying a charge with the payment gateway. Never trust a client-only
 * "success" signal for real money — this is for demo/testing purposes.
 */
export async function confirmSandboxPayment(paymentId) {
  const ref = `SAND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  const { data, error } = await supabase
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      transaction_ref: ref,
    })
    .eq('id', paymentId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin: create a payment/invoice record for a student. */
export async function createPayment(payment) {
  const { data, error } = await supabase
    .from('payments')
    .insert(payment)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/** Public: list public announcements only (is_public = true). No auth required. */
export async function listPublicAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, profiles(full_name)')
    .eq('is_public', true)
    .order('published_at', { ascending: false })
  if (error) throw error
  return data
}

/** Authenticated: list all announcements (public + internal), optionally filtered by category. */
export async function listAnnouncements(category = null) {
  let query = supabase
    .from('announcements')
    .select('*, profiles(full_name)')

  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) throw error
  return data
}

/** Admin/teacher: create a new announcement. category: 'urgent'|'events'|'academics'|'general'. */
export async function createAnnouncement(announcement) {
  const { data, error } = await supabase
    .from('announcements')
    .insert(announcement)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin/teacher: update an announcement. */
export async function updateAnnouncement(announcementId, updates) {
  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', announcementId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Admin/teacher: delete an announcement. */
export async function deleteAnnouncement(announcementId) {
  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId)
  if (error) throw error
}


// ─────────────────────────────────────────────────────────────────────────────
// GRADES
// ─────────────────────────────────────────────────────────────────────────────

/** Student/family: get own grades, optionally filtered by term. Includes the recording teacher's name. */
export async function getOwnGrades(studentId, term = null) {
  let query = supabase
    .from('grades')
    .select('*, classes(*, courses(*)), recorder:recorded_by(full_name)')
    .eq('student_id', studentId)

  if (term) query = query.eq('term', term)

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Teacher: get all grades for a specific class, optionally filtered by term. */
export async function getClassGrades(classId, term = null) {
  let query = supabase
    .from('grades')
    .select('*, profiles(full_name)')
    .eq('class_id', classId)

  if (term) query = query.eq('term', term)

  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Teacher: enter or update a single grade.
 * NOTE: requires a unique constraint on (student_id, class_id, subject, term)
 * in the grades table for upsert conflict resolution to work. Add it via:
 *   alter table grades add constraint grades_unique_entry
 *     unique (student_id, class_id, subject, term);
 */
export async function upsertGrade(grade) {
  const { data, error } = await supabase
    .from('grades')
    .upsert(grade, { onConflict: 'student_id,class_id,subject,term' })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Teacher: bulk save grades for a whole class at once. Same unique constraint required. */
export async function bulkUpsertGrades(gradesArray) {
  const { data, error } = await supabase
    .from('grades')
    .upsert(gradesArray, { onConflict: 'student_id,class_id,subject,term' })
    .select()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────

/** Student/family: get own attendance record, optionally filtered by class. */
export async function getOwnAttendance(studentId, classId = null) {
  let query = supabase
    .from('attendance')
    .select('*, classes(*)')
    .eq('student_id', studentId)

  if (classId) query = query.eq('class_id', classId)

  const { data, error } = await query.order('date', { ascending: false })
  if (error) throw error
  return data
}

/** Teacher: get attendance for a class on a specific date (YYYY-MM-DD). */
export async function getClassAttendance(classId, date) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, profiles(full_name)')
    .eq('class_id', classId)
    .eq('date', date)
  if (error) throw error
  return data
}

/**
 * Teacher: mark attendance for a single student.
 * Uses the existing unique constraint on (student_id, class_id, date)
 * already defined in the schema — no migration needed for this one.
 */
export async function markAttendance(studentId, classId, date, present, note = null) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      { student_id: studentId, class_id: classId, date, present, note },
      { onConflict: 'student_id,class_id,date' }
    )
    .select()
    .single()
  if (error) throw error
  return data
}

/** Teacher: bulk-mark attendance for a whole class at once. */
export async function bulkMarkAttendance(records) {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'student_id,class_id,date' })
    .select()
  if (error) throw error
  return data
}

/** Get attendance summary stats for a class over a date range. */
export async function getAttendanceSummary(classId, startDate, endDate) {
  const { data, error } = await supabase
    .from('attendance')
    .select('present')
    .eq('class_id', classId)
    .gte('date', startDate)
    .lte('date', endDate)
  if (error) throw error

  const total = data.length
  const present = data.filter(r => r.present).length
  return { total, present, absent: total - present, pct: total ? Math.round((present / total) * 100) : 0 }
}


// ═════════════════════════════════════════════════════════════════════════════
// BACKEND-ONLY OPERATIONS (do NOT implement these client-side)
// ═════════════════════════════════════════════════════════════════════════════
//
//   createStudentAccount(email, password, profileData)
//       → auth.admin.createUser() + profiles insert (can_login=true) +
//         family_members insert (relationship='student')
//
//   createFamilyAccount(email, password, familyData, members[])
//       → auth.admin.createUser() for the family + families insert +
//         profiles insert for each parent (can_login=false, no auth.users
//         row) + family_members insert for each parent and student
//
//   createTeacherAccount(email, password, profileData)
//       → auth.admin.createUser() + profiles insert (can_login=true)
//
//   submitEnrollmentApplication(formData)
//       → the public /enroll page action: creates a new student
//         auth.users entry + profiles row + enrollments row, all atomic
//
//   approveEnrollmentFully(enrollmentId, classId, familyId)
//       → updates enrollment status + assigns class + links family_members
//         atomically — if one step fails, all should roll back
//
//   processRealPayment(paymentId, gatewayToken)
//       → must verify the charge with the payment gateway server-side
//         before marking payments.status = 'paid'
//
// ═════════════════════════════════════════════════════════════════════════════
