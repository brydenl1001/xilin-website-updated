import { supabase } from './supabase'

// ═════════════════════════════════════════════════════════════════════════════
// CLIENT-SIDE SUPABASE FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════
// Aligned with the schema:
//   profiles, families, family_members, semesters, courses, classes,
//   class_teachers, enrollments, balance_transactions, enrollment_applications,
//   announcements
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

/**
 * Public: counts for the homepage stats section. Uses a SECURITY DEFINER RPC
 * so anonymous visitors get aggregate counts without the profiles table being
 * readable by the anon role.
 */
export async function getPublicStats() {
  const { data, error } = await supabase.rpc('get_public_stats')
  if (error) throw error
  return {
    studentCount: data?.studentCount ?? 0,
    teacherCount: data?.teacherCount ?? 0,
    courseCount:  data?.courseCount ?? 0,
  }
}

/**
 * Public: submit an enrollment application from the /enroll page. Routed through
 * the `enroll-apply` edge function (service role) which validates the input,
 * checks the Family ID when joining an existing family, and inserts a pending
 * application for an admin to review. Nothing is activated until approval.
 */
export async function submitEnrollmentApplication(form) {
  const { data, error } = await supabase.functions.invoke('enroll-apply', { body: form })
  if (error) {
    // Surface the function's JSON error message when present.
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch { /* keep default message */ }
    throw new Error(message)
  }
  return data
}

/** Admin: list enrollment applications submitted via /enroll, optionally by status. */
export async function listEnrollmentApplications(status = null) {
  let query = supabase
    .from('enrollment_applications')
    .select('*, families(family_name)')
    .order('created_at', { ascending: false })
  if (status) query = query.eq('status', status)
  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Admin: approve or reject an application. Routed through the `review-application`
 * edge function which (on approval) creates the family login if new, a member
 * profile, the family link, and enrollments into active classes — all server-side
 * with the service role. action: 'approve' | 'reject'.
 */
export async function reviewEnrollmentApplication(applicationId, action) {
  const { data, error } = await supabase.functions.invoke('review-application', {
    body: { application_id: applicationId, action },
  })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch { /* keep default message */ }
    throw new Error(message)
  }
  return data
}

/**
 * Admin: create an account via the `create-account` edge function (service role).
 * payload.kind:
 *   'staff'  → { full_name, email, role: 'admin'|'teacher', password? }
 *   'family' → { family_name, email, phone?, password? }
 *   'member' → { full_name, role: 'parent'|'student', family_id, phone? }
 * Returns { id, temp_password?, emailed? }.
 */
export async function createAccount(payload) {
  const { data, error } = await supabase.functions.invoke('create-account', { body: payload })
  if (error) {
    let message = error.message
    try {
      const body = await error.context?.json?.()
      if (body?.error) message = body.error
    } catch { /* keep default message */ }
    throw new Error(message)
  }
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

/** Sign in with email + password (staff: admin/teacher). */
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password })
}

/**
 * Family sign-in by username OR 4-digit Family ID + password. Routed through the
 * `family-login` edge function, which resolves the identifier to the account and
 * returns a session that we apply locally.
 */
export async function familyLogin(identifier, password) {
  const { data, error } = await supabase.functions.invoke('family-login', { body: { identifier, password } })
  if (error) {
    let message = 'Sign-in failed.'
    try { const b = await error.context?.json?.(); if (b?.error) message = b.error } catch { /* keep default */ }
    throw new Error(message)
  }
  if (!data?.access_token) throw new Error(data?.error || 'Sign-in failed.')
  const { error: sErr } = await supabase.auth.setSession({
    access_token: data.access_token, refresh_token: data.refresh_token,
  })
  if (sErr) throw sErr
  return true
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

/**
 * Self-service: a signed-in staff member updates their own personal info.
 * Routed through a SECURITY DEFINER RPC (there is no self-UPDATE RLS policy) that
 * only ever touches a safe column whitelist — role/can_login can't be changed.
 */
export async function saveOwnProfileInfo({ full_name, phone, date_of_birth, address }) {
  const { error } = await supabase.rpc('update_own_profile', {
    p_full_name: full_name ?? null,
    p_phone: phone ?? null,
    p_date_of_birth: date_of_birth || null,
    p_address: address ?? null,
  })
  if (error) throw new Error(error.message)
}

/** Self-service: a family (household login) updates its own contact info. */
export async function saveOwnFamilyInfo({ family_name, phone, address }) {
  const { error } = await supabase.rpc('update_own_family', {
    p_family_name: family_name ?? null,
    p_phone: phone ?? null,
    p_address: address ?? null,
  })
  if (error) throw new Error(error.message)
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

/**
 * Admin: update a family member's name and/or role. Keeps the member profile
 * and the family_members relationship in sync. role: 'parent' | 'student'.
 */
export async function updateFamilyMember(familyId, profileId, { full_name, role }) {
  const updates = {}
  if (full_name !== undefined) updates.full_name = full_name
  if (role !== undefined) updates.role = role
  if (Object.keys(updates).length) {
    const { error } = await supabase.from('profiles').update(updates).eq('id', profileId)
    if (error) throw error
  }
  if (role !== undefined) {
    const { error } = await supabase
      .from('family_members')
      .update({ relationship: role })
      .eq('family_id', familyId)
      .eq('profile_id', profileId)
    if (error) throw error
  }
}

/**
 * Admin: fully remove a member — deletes their enrollments, the family link,
 * and the member profile. (Members have no login, so there's no auth user.)
 */
export async function removeFamilyMemberFully(familyId, profileId) {
  const { error: e1 } = await supabase.from('enrollments').delete().eq('student_id', profileId)
  if (e1) throw e1
  const { error: e2 } = await supabase
    .from('family_members').delete().eq('family_id', familyId).eq('profile_id', profileId)
  if (e2) throw e2
  const { error: e3 } = await supabase.from('profiles').delete().eq('id', profileId)
  if (e3) throw e3
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
    .order('subject_area', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Public: list courses for the unauthenticated /classes page. Ordered as a flat catalog. */
export async function listPublicCourses() {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('subject_area', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

/**
 * Public: list running class instances for the active semester (the /classes
 * catalog). Routed through a SECURITY DEFINER RPC so anonymous visitors can see
 * live schedule + capacity without the classes/enrollments tables being readable
 * by the anon role.
 */
export async function listPublicClasses() {
  const { data, error } = await supabase.rpc('get_public_classes')
  if (error) throw error
  return data || []
}

/** Admin: create a new course template (code, name required; grade_level text + price optional). */
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

/** Admin: directly enroll a family member (student/parent) into a class. */
export async function createEnrollment(studentId, classId, status = 'enrolled') {
  const { data, error } = await supabase
    .from('enrollments')
    .insert({ student_id: studentId, class_id: classId, status })
    .select('*, classes(*, courses(*), semesters(*))')
    .single()
  if (error) throw error
  return data
}

/** Admin: remove an enrollment entirely. */
export async function deleteEnrollment(enrollmentId) {
  const { error } = await supabase.from('enrollments').delete().eq('id', enrollmentId)
  if (error) throw error
}


// ─────────────────────────────────────────────────────────────────────────────
// BALANCE & PAYMENTS (family balance + immutable ledger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enroll a member into a class. Atomic: capacity hard-stop, debits the class
 * price from the family balance, and writes a ledger entry. Throws a friendly
 * message if the class is full, registration closed, or already enrolled.
 */
export async function enrollMember(memberId, classId) {
  const { data, error } = await supabase.rpc('enroll_member', { p_member_id: memberId, p_class_id: classId })
  if (error) throw new Error(error.message)
  return data
}

/** Drop a member from a class — auto-calculates the prorated credit back to the family balance. */
export async function dropMember(enrollmentId) {
  const { data, error } = await supabase.rpc('drop_member', { p_enrollment_id: enrollmentId })
  if (error) throw new Error(error.message)
  return data
}

/** Record a payment / balance change. method: 'online' (family/admin) | 'cash' | 'adjustment' (admin). */
export async function recordPayment(familyId, amount, method, note = null) {
  const { data, error } = await supabase.rpc('record_payment', {
    p_family_id: familyId, p_amount: amount, p_method: method, p_note: note,
  })
  if (error) throw new Error(error.message)
  return data
}

/** Enrolled count per class (for capacity / "full" display). Returns a Map of class_id → count. */
export async function getClassCounts() {
  const { data, error } = await supabase.from('class_enrolled_counts').select('*')
  if (error) throw error
  const map = {}
  ;(data || []).forEach(r => { map[r.class_id] = r.enrolled })
  return map
}

/** Admin: copy every class from one semester into another. Returns the number copied. */
export async function copySemesterClasses(fromId, toId) {
  const { data, error } = await supabase.rpc('copy_semester_classes', { p_from: fromId, p_to: toId })
  if (error) throw new Error(error.message)
  return data
}

/** Admin/teacher: roster (with guardian contact) for a class taught by the caller. */
export async function getClassRoster(classId) {
  const { data, error } = await supabase.rpc('get_class_roster', { p_class_id: classId })
  if (error) throw new Error(error.message)
  return data
}

/** Admin: all ledger transactions (for the financial summary report). */
export async function listAllTransactions() {
  const { data, error } = await supabase
    .from('balance_transactions')
    .select('amount, method, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

/** Family/admin: list a family's balance ledger (immutable audit trail), newest first. */
export async function listBalanceTransactions(familyId) {
  const { data, error } = await supabase
    .from('balance_transactions')
    .select('*, classes(name, courses(name)), member:member_id(full_name)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR EVENTS (admin-managed, publicly visible)
// ─────────────────────────────────────────────────────────────────────────────

/** Public: list all calendar events (oldest first). */
export async function listCalendarEvents() {
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .order('event_date', { ascending: true })
  if (error) throw error
  return data
}

/** Admin: create a calendar event. */
export async function createCalendarEvent(event) {
  const { data, error } = await supabase.from('calendar_events').insert(event).select().single()
  if (error) throw error
  return data
}

/** Admin: update a calendar event. */
export async function updateCalendarEvent(id, updates) {
  const { data, error } = await supabase.from('calendar_events').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Admin: delete a calendar event. */
export async function deleteCalendarEvent(id) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id)
  if (error) throw error
}


// ─────────────────────────────────────────────────────────────────────────────
// ANNOUNCEMENTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public: list public announcements only (is_public = true). No auth required.
 * Does NOT embed profiles — anon has no access to that table, and the public
 * pages fall back to "School Office" for the author label.
 */
export async function listPublicAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
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

/**
 * Admin/teacher: upload an image/media file for an announcement to Storage and
 * return its public URL. Stored in the public `announcement-media` bucket.
 */
export async function uploadAnnouncementMedia(file) {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage
    .from('announcement-media')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from('announcement-media').getPublicUrl(path)
  return data.publicUrl
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
//       → the public /enroll page action. formData shape:
//           { applicant_type: 'parent'|'student', full_name, email, phone,
//             dob?, family_mode: 'new'|'existing', family_id?, family_name?,
//             class_ids: [], notes? }
//         Creates a pending applicant profile (can_login=false) + a queued
//         family link (existing) or new family record (new) + one pending
//         enrollment row per class_id. Nothing is activated until an admin
//         approves it.
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
