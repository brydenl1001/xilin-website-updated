// Shared announcement-category styling. The <Badge> component owns the badge
// colors; this is the small colored "dot" used in announcement list rows.

export const CAT_DOT = {
  urgent:    'bg-red-400',
  events:    'bg-amber-400',
  academics: 'bg-blue-400',
  general:   'bg-slate-300',
}

// Badge variants for user/member roles (shared by Users, Families, Members pages).
export const ROLE_VARIANT = {
  admin:    'navy',
  teacher:  'academics',
  parent:   'gold',
  student:  'success',
  guardian: 'navy',
}

// Badge variant + display label for class status (Class Management, ClassDetail).
export const CLASS_STATUS_BADGE = { active: 'success', on_hold: 'warning', canceled: 'danger' }
export const CLASS_STATUS_LABEL = { active: 'Active', on_hold: 'On hold', canceled: 'Canceled' }

// The fixed set of class subject areas (used in the course form dropdown).
export const SUBJECT_AREAS = [
  'Senior',
  'Art',
  'Chinese',
  'Dance',
  'Science/Engineering',
  'English/Speech',
  'Music',
  'Math',
  'Sport/Fitness',
  'Test/Contest Prep',
]
