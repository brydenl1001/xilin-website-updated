import { createClient } from '@supabase/supabase-js'
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Normalize an announcement's media into an array of URLs, supporting both the
 * newer `media_urls` array column and the legacy single `media_url` column.
 */
export function announcementImages(a) {
  if (a?.media_urls?.length) return a.media_urls
  return a?.media_url ? [a.media_url] : []
}

/**
 * Extract the most useful error message from a failed `functions.invoke()` call.
 * Edge functions return their detail as JSON in the error context, so prefer that
 * over the generic transport-level message.
 */
async function edgeFunctionError(error, fallback) {
  let message = fallback ?? error.message
  try {
    const body = await error.context?.json?.()
    if (body?.error) message = body.error
  } catch { /* keep default message */ }
  return new Error(message)
}

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
    classCount:   data?.classCount ?? 0,
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
  if (error) throw await edgeFunctionError(error)
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
  if (error) throw await edgeFunctionError(error)
  return data
}

/**
 * Admin: create an account via the `create-account` edge function (service role).
 * payload.kind:
 *   'staff'  → { first_name, last_name, email, role: 'admin'|'teacher', password? }
 *   'family' → { family_name, email, phone?, password? }
 *   'member' → { first_name, last_name, role: 'parent'|'student', family_id, phone? }
 * Returns { id, temp_password?, emailed? }.
 */
export async function createAccount(payload) {
  const { data, error } = await supabase.functions.invoke('create-account', { body: payload })
  if (error) throw await edgeFunctionError(error)
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
 * Family sign-in by family name OR 4-digit Family ID + password. Routed through
 * the `family-login` edge function, which resolves the identifier to the account
 * and returns a session that we apply locally.
 */
export async function familyLogin(identifier, password) {
  const { data, error } = await supabase.functions.invoke('family-login', { body: { identifier, password } })
  if (error) throw await edgeFunctionError(error, 'Sign-in failed.')
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
 *   { type: 'profile', id, first_name, last_name, role, can_login, ... }
 *   { type: 'family',  id, family_name, email, family_members: [...] }
 */
export async function resolveCurrentIdentity(uid) {
  const [{ data: family, error: familyError }, { data: profile, error: profileError }] =
    await Promise.all([
      supabase.from('families').select('*, family_members(*, profiles(*))').eq('id', uid).maybeSingle(),
      supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    ])
  if (familyError) throw familyError
  if (family) return { type: 'family', ...family }
  if (profileError) throw profileError
  if (profile) return { type: 'profile', ...profile }
  throw new Error('No identity found for current session.')
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


/**
 * Self-service: a signed-in staff member updates their own personal info.
 * Routed through a SECURITY DEFINER RPC (there is no self-UPDATE RLS policy) that
 * only ever touches a safe column whitelist — role/can_login can't be changed.
 * Address is stored as separate parts (street, city, state, postal_code, country).
 */
export async function saveOwnProfileInfo({ first_name, last_name, phone, date_of_birth, street, city, state, postal_code, country }) {
  const { error } = await supabase.rpc('update_own_profile', {
    p_first_name: first_name ?? null,
    p_last_name: last_name ?? null,
    p_phone: phone ?? null,
    p_date_of_birth: date_of_birth || null,
    p_street: street ?? null,
    p_city: city ?? null,
    p_state: state ?? null,
    p_postal_code: postal_code ?? null,
    p_country: country ?? null,
  })
  if (error) throw new Error(error.message)
}

/**
 * Self-service: a family (household login) updates its own info. The family name
 * doubles as the login username, so it must stay unique — the RPC rejects a name
 * that's already taken. Address is stored as separate parts.
 */
export async function saveOwnFamilyInfo({ family_name, phone, street, city, state, postal_code, country }) {
  const { error } = await supabase.rpc('update_own_family', {
    p_family_name: family_name ?? null,
    p_phone: phone ?? null,
    p_street: street ?? null,
    p_city: city ?? null,
    p_state: state ?? null,
    p_postal_code: postal_code ?? null,
    p_country: country ?? null,
  })
  if (error) throw new Error(error.message)
}

/** Self-service: change the signed-in account's password (family, teacher, or admin). */
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw new Error(error.message)
}

/**
 * Self-service: change the signed-in account's login email. Routed through the
 * `change-email` edge function (service role) so it takes effect immediately and
 * keeps families.email in sync for family-login resolution.
 */
export async function changeEmail(newEmail) {
  const { data, error } = await supabase.functions.invoke('change-email', { body: { email: newEmail } })
  if (error) throw await edgeFunctionError(error, 'Could not change your email.')
  return data
}

/** Family self-service: add a member (parent/student) to the caller's own family. */
export async function familyAddMember(first_name, last_name, role, { gender, date_of_birth, phone } = {}) {
  const { data, error } = await supabase.rpc('family_add_member', {
    p_first_name: first_name, p_last_name: last_name ?? null, p_role: role,
    p_gender: gender || null, p_dob: date_of_birth || null, p_phone: phone ?? null,
  })
  if (error) throw new Error(error.message)
  return data
}

/** Family self-service: edit a member of the caller's own family. */
export async function familyUpdateMember(profileId, { first_name, last_name, role, phone, date_of_birth, gender }) {
  const { error } = await supabase.rpc('family_update_member', {
    p_profile_id: profileId, p_first_name: first_name, p_last_name: last_name ?? null, p_role: role,
    p_phone: phone ?? null, p_dob: date_of_birth || null, p_gender: gender || null,
  })
  if (error) throw new Error(error.message)
}

/** Family/admin: request enrollment that needs admin approval (e.g. after registration closes). */
export async function requestEnrollment(memberId, classId) {
  const { data, error } = await supabase.rpc('request_enrollment', { p_member_id: memberId, p_class_id: classId })
  if (error) throw new Error(error.message)
  return data
}

/** Admin: approve a pending enrollment request (charges the family + enrolls). */
export async function approvePendingEnrollment(enrollmentId) {
  const { data, error } = await supabase.rpc('approve_pending_enrollment', { p_enrollment_id: enrollmentId })
  if (error) throw new Error(error.message)
  return data
}

/** Admin: reject (delete) a pending enrollment request. */
export async function rejectPendingEnrollment(enrollmentId) {
  const { error } = await supabase.rpc('reject_pending_enrollment', { p_enrollment_id: enrollmentId })
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
 * Admin: update a family member's info. Keeps the member profile and the
 * family_members relationship in sync. role: 'parent' | 'student'. Any of
 * first_name/last_name/role/phone/date_of_birth/gender may be provided.
 */
export async function updateFamilyMember(familyId, profileId, { first_name, last_name, role, phone, date_of_birth, gender }) {
  const updates = {}
  if (first_name !== undefined) updates.first_name = first_name
  if (last_name !== undefined) updates.last_name = last_name || null
  if (role !== undefined) updates.role = role
  if (phone !== undefined) updates.phone = phone
  if (date_of_birth !== undefined) updates.date_of_birth = date_of_birth || null
  if (gender !== undefined) updates.gender = gender || null
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
 * Admin: update any profile's editable info (staff or member). Role and personal
 * fields only — never can_login/is_active (use setAccountActive for the latter).
 * Relies on the admin-full-access RLS policy on profiles.
 */
export async function adminUpdateProfile(profileId, updates) {
  const allowed = ['first_name', 'last_name', 'role', 'phone', 'date_of_birth', 'gender', 'street', 'city', 'state', 'postal_code', 'country']
  const clean = {}
  for (const k of allowed) if (updates[k] !== undefined) clean[k] = updates[k] === '' ? null : updates[k]
  const { data, error } = await supabase.from('profiles').update(clean).eq('id', profileId).select().single()
  if (error) throw error
  return data
}

/**
 * Admin: activate or deactivate an account (family login, staff login, or member).
 * Routed through the `set-account-active` edge function, which flips the flag
 * (families.status / profiles.is_active) and bans/unbans the auth user so a
 * deactivated login can't be used. The account is never deleted.
 */
export async function setAccountActive(targetId, active) {
  const { data, error } = await supabase.functions.invoke('set-account-active', { body: { target_id: targetId, active } })
  if (error) throw await edgeFunctionError(error, 'Could not update the account.')
  return data
}

/**
 * Admin: fully remove a member — deletes their enrollments, the family link,
 * and the member profile. (Members have no login, so there's no auth user.)
 */
export async function removeFamilyMemberFully(familyId, profileId) {
  const { error } = await supabase.rpc('remove_family_member_fully', {
    p_family_id: familyId,
    p_profile_id: profileId,
  })
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

/** Get the single "current" semester (is_current = true), or null. */
export async function getCurrentSemester() {
  const { data, error } = await supabase
    .from('semesters')
    .select('*')
    .eq('is_current', true)
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

/** Public: list courses for the unauthenticated /classes page. Delegates to listCourses. */
export function listPublicCourses() { return listCourses() }

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

/**
 * Admin: set a class's status:
 *   'active'   → visible + open for enrollment
 *   'canceled' → visible to families/public but not enrollable
 *   'inactive' → hidden from non-admins (draft/archived)
 * Status is a visibility flag only — it does not drop enrollees. Classes are
 * never deleted.
 */
export async function setClassStatus(classId, status) {
  const { error } = await supabase.rpc('set_class_status', { p_class_id: classId, p_status: status })
  if (error) throw new Error(error.message)
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
// MATERIALS (catalog items classes require; sold in person at the front office)
// ─────────────────────────────────────────────────────────────────────────────

/** List catalog materials. Pass false to include archived (inactive) ones. */
export async function listMaterials(activeOnly = true) {
  let query = supabase.from('materials').select('*')
  if (activeOnly) query = query.eq('is_active', true)
  const { data, error } = await query.order('name', { ascending: true })
  if (error) throw error
  return data
}

/** Admin: create a catalog material (name required; price defaults to 0). */
export async function createMaterial(material) {
  const { data, error } = await supabase.from('materials').insert(material).select().single()
  if (error) throw error
  return data
}

/** Admin: update a catalog material. Set is_active:false to archive it. */
export async function updateMaterial(materialId, updates) {
  const { data, error } = await supabase.from('materials').update(updates).eq('id', materialId).select().single()
  if (error) throw error
  return data
}

/**
 * Materials linked to a class, with the catalog row and required/optional flag.
 * `activeOnly` hides archived catalog items — use it anywhere the list is shown
 * to people (archived materials aren't for sale). Leave it false when editing
 * the links, so an archived-but-still-linked item isn't silently dropped.
 */
export async function listClassMaterials(classId, activeOnly = false) {
  let query = supabase
    .from('class_materials')
    .select(`material_id, is_required, materials${activeOnly ? '!inner' : ''}(*)`)
    .eq('class_id', classId)
  if (activeOnly) query = query.eq('materials.is_active', true)
  const { data, error } = await query
  if (error) throw error
  return data
}

/**
 * Admin: replace a class's material links in one go.
 * `links` is [{ material_id, is_required }].
 */
export async function setClassMaterials(classId, links) {
  const { error: delErr } = await supabase.from('class_materials').delete().eq('class_id', classId)
  if (delErr) throw delErr
  if (!links?.length) return
  const rows = links.map(l => ({ class_id: classId, material_id: l.material_id, is_required: l.is_required !== false }))
  const { error } = await supabase.from('class_materials').insert(rows)
  if (error) throw error
}

/**
 * Materials a family needs, per student, for a semester (null = all semesters).
 * Rows: { student_id, student_name, material_id, material_name, description,
 * price, is_required, purchased, classes }. Admin or the family itself.
 */
export async function getFamilyMaterials(familyId, semesterId = null) {
  const { data, error } = await supabase.rpc('get_family_materials', {
    p_family_id: familyId, p_semester_id: semesterId,
  })
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Admin: record an in-person materials sale. `items` is
 * [{ student_id, material_id, semester_id }]. Family credit is applied first and
 * the remainder recorded as cash received. Returns
 * { items, total, credit_used, cash_received, new_credit }.
 */
export async function purchaseMaterials(familyId, items, note = null, date = null) {
  const { data, error } = await supabase.rpc('purchase_materials', {
    p_family_id: familyId, p_items: items, p_note: note, p_date: date,
  })
  if (error) throw new Error(error.message)
  return data
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

/** Admin: batch-fetch enrollments for multiple members in one query. Returns map of memberId → enrollment[]. */
export async function getEnrollmentsForMembers(memberIds) {
  if (!memberIds.length) return {}
  const { data, error } = await supabase
    .from('enrollments')
    .select('*, classes(*, courses(*), semesters(*))')
    .in('student_id', memberIds)
    .order('application_date', { ascending: false })
  if (error) throw error
  const map = Object.fromEntries(memberIds.map(id => [id, []]))
  ;(data || []).forEach(e => { if (map[e.student_id] !== undefined) map[e.student_id].push(e) })
  return map
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

/**
 * Pay for selected unpaid classes.
 *   Admin  → method 'cash': family credit is applied first, the remainder is
 *            recorded as cash received. `date` optionally backdates the entry.
 *   Family → method 'credit': only when credit covers the full total (card
 *            payments go through startClassCheckout instead).
 * Marks each class paid and writes per-class ledger entries.
 */
export async function payEnrollments(familyId, enrollmentIds, method, note = null, date = null) {
  const { data, error } = await supabase.rpc('pay_enrollments', {
    p_family_id: familyId, p_enrollment_ids: enrollmentIds, p_method: method, p_note: note, p_date: date,
  })
  if (error) throw new Error(error.message)
  return data
}

/** The fixed reasons an admin must choose from when manually adjusting credit. */
export const ADJUST_REASONS = [
  'Refunded credit', 'Error adjustment', 'Credit addition',
  'Scholarship / discount', 'Returned check / failed payment', 'Other',
]

/**
 * Admin: manually add/subtract family credit (e.g. correcting an error or
 * recording an external refund). `reason` must be one of ADJUST_REASONS; a note
 * is required when the reason is 'Other'.
 */
export async function adjustCredit(familyId, amount, reason, note = null, date = null) {
  const { data, error } = await supabase.rpc('adjust_credit', {
    p_family_id: familyId, p_amount: amount, p_reason: reason, p_note: note, p_date: date,
  })
  if (error) throw new Error(error.message)
  return data
}

/**
 * Family: pay for selected classes by card. Credit is applied first server-side;
 * the card is charged only the remainder (+ processing fee on that remainder).
 * Returns { settled: true, ... } when credit covered everything (no redirect
 * needed), or { url, total, credit_used, card_total, fee } — redirect to `url`.
 * Classes are marked paid by the `stripe-webhook` edge function on confirmation.
 */
export async function startClassCheckout(enrollmentIds) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { kind: 'pay_classes', enrollment_ids: enrollmentIds },
  })
  if (error) throw await edgeFunctionError(error, 'Could not start the payment.')
  return data
}

/**
 * Family: add any amount of credit to the account by card (fee added on top).
 * Returns { url, total, fee, credit } — redirect the browser to `url`.
 */
export async function startCreditCheckout(amount) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { kind: 'add_credit', amount },
  })
  if (error) throw await edgeFunctionError(error, 'Could not start the payment.')
  return data
}

/**
 * Admin: preview how many recipients a Send-Email target resolves to (no send).
 * target: 'everyone'|'families'|'teachers'|'admins'|'class'|'people'.
 * Returns { count, sample: string[] }.
 */
export async function previewAdminEmail({ target, classId, recipientIds }) {
  const { data, error } = await supabase.functions.invoke('send-admin-email', {
    body: { preview: true, target, class_id: classId || null, recipient_ids: recipientIds || [] },
  })
  if (error) throw await edgeFunctionError(error, 'Could not resolve recipients.')
  return data
}

/**
 * Admin: send an email to the resolved recipient set. Returns
 * { sent, failed, total, errors }. Throws a 503-style error if email isn't
 * configured (RESEND_API_KEY / EMAIL_FROM not set).
 */
export async function sendAdminEmail({ target, classId, recipientIds, subject, body }) {
  const { data, error } = await supabase.functions.invoke('send-admin-email', {
    body: { target, class_id: classId || null, recipient_ids: recipientIds || [], subject, body },
  })
  if (error) throw await edgeFunctionError(error, 'Could not send the email.')
  return data
}

/**
 * Admin: per-semester financial summary (active-class enrollments only).
 * Returns { registered, received, due, families_owing }. Pass null for all semesters.
 */
export async function getSemesterFinancials(semesterId = null) {
  const { data, error } = await supabase.rpc('get_semester_financials', { p_semester_id: semesterId })
  if (error) throw error
  const row = data?.[0] || {}
  return {
    registered: Number(row.registered || 0),
    received: Number(row.received || 0),
    due: Number(row.due || 0),
    families_owing: Number(row.families_owing || 0),
  }
}

/** Admin: derived amount owed per family (unpaid active classes). Returns map of family_id → { owed, unpaid_count }. */
export async function getFamilyOwedMap() {
  const { data, error } = await supabase.from('family_owed').select('*')
  if (error) throw error
  const map = {}
  ;(data || []).forEach(r => { map[r.family_id] = { owed: Number(r.owed), unpaid_count: r.unpaid_count } })
  return map
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
    .select('*, classes(name, semester_id, courses(name), semesters(name)), member:member_id(first_name, last_name)')
    .eq('family_id', familyId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────────────────────────────────────
// ABOUT PAGES (admin-editable content for the public About section)
// ─────────────────────────────────────────────────────────────────────────────

/** Public: list every About sub-page (title, group, body). */
export async function listAboutPages() {
  const { data, error } = await supabase
    .from('about_pages')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data
}

/** Admin: update an About sub-page's title/body. */
export async function updateAboutPage(id, { title, body }) {
  const { data, error } = await supabase
    .from('about_pages')
    .update({ title, body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}


// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR EVENTS (admin-managed, publicly visible)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Public: the date-by-date session schedule (the printed-style school-year
 * calendar). Pass a semester id to scope it, or omit for every semester.
 * Week numbers are derived at render time, not stored.
 */
export async function listCalendarSessions(semesterId = null) {
  let query = supabase.from('school_calendar_sessions').select('*')
  if (semesterId) query = query.eq('semester_id', semesterId)
  const { data, error } = await query.order('session_date', { ascending: true })
  if (error) throw error
  return data
}

/** Admin: add one session row. */
export async function createCalendarSession(row) {
  const { data, error } = await supabase.from('school_calendar_sessions').insert(row).select().single()
  if (error) throw error
  return data
}

/** Admin: update a session row (date, has_class, description). */
export async function updateCalendarSession(id, updates) {
  const { data, error } = await supabase.from('school_calendar_sessions').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Admin: remove a session row. */
export async function deleteCalendarSession(id) {
  const { error } = await supabase.from('school_calendar_sessions').delete().eq('id', id)
  if (error) throw error
}

/**
 * Admin: fill a semester with one row per week, from class_start through
 * class_end on the same weekday, all marked as having class. Existing dates are
 * left untouched (so it's safe to re-run after adding holidays). Returns the
 * number of rows added.
 */
export async function generateWeeklySessions(semester) {
  if (!semester?.class_start || !semester?.class_end) {
    throw new Error('This semester needs a class start and end date first.')
  }
  const rows = []
  // Parse as local dates to avoid the UTC shift that would move a Sunday to Saturday.
  const [sy, sm, sd] = semester.class_start.split('-').map(Number)
  const end = semester.class_end
  for (let d = new Date(sy, sm - 1, sd); ; d.setDate(d.getDate() + 7)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (iso > end) break
    rows.push({ semester_id: semester.id, session_date: iso, has_class: true, description: null })
  }
  if (!rows.length) return 0
  const { data, error } = await supabase
    .from('school_calendar_sessions')
    .upsert(rows, { onConflict: 'semester_id,session_date', ignoreDuplicates: true })
    .select('id')
  if (error) throw error
  return data?.length || 0
}

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
    .select('*, profiles(first_name, last_name)')

  if (category) query = query.eq('category', category)

  const { data, error } = await query.order('published_at', { ascending: false })
  if (error) throw error
  return data
}

/**
 * Admin/teacher: upload an image/media file for an announcement to Storage and
 * return its public URL. Stored in the public `announcement-media` bucket.
 */
const ALLOWED_MEDIA_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'])

export async function uploadAnnouncementMedia(file) {
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    throw new Error('File type not allowed. Accepted: JPEG, PNG, GIF, WebP, PDF.')
  }
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
//           { applicant_type: 'parent'|'student', first_name, last_name, email, phone,
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
