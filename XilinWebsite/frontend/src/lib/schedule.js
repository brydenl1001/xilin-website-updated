// Two classes conflict only within the SAME semester, on the same day, with
// overlapping time windows. Classes at the same time in different semesters
// don't conflict.
export const timesOverlap = (a, b) =>
  a?.semester_id && a.semester_id === b?.semester_id &&
  a.day_of_week && a.day_of_week === b?.day_of_week &&
  a.start_time && a.end_time && b.start_time && b.end_time &&
  a.start_time < b.end_time && b.start_time < a.end_time

// An enrollment belongs to a term that's still shown to families. Enrollments
// whose class sits in an inactive (past) semester are hidden from family views.
// Note: RLS hides inactive semesters from non-admins, so the embedded
// `semesters` join is null for stale terms — this predicate covers both cases.
export const inActiveSemester = (enrollment) => !!enrollment?.classes?.semesters?.is_active
