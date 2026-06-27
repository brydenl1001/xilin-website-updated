// Static branding/config content — not backed by any database table.
// Everything else (users, stats, enrollments, payments, attendance, classes,
// announcements) comes from real Supabase calls via src/lib/supabaseClient.js.

export const schoolInfo = {
  name: 'Xilin Northwest Chinese School',
  nameZh: '希林西北中文学校',
  shortName: 'Xilin',
  founded: 1996,
  tagline: 'Where Chinese Language and Culture Come to Life.',
  email: 'info@xilinchinese.org',
  website: 'xilinchinese.org',
  // NOTE: The public site did not list a physical address, phone number, or
  // founding year — fill these in here when you have the official details.
}

// Placeholder board/leadership for the public About page — replace names, roles,
// bios (and add photo URLs in /public) with the school's real leadership.
export const boardMembers = [
  { name: 'President Name', role: 'President', bio: 'A short bio about the school president — their background and vision for Xilin.' },
  { name: 'Vice President', role: 'Vice President', bio: 'A short bio for this board member.' },
  { name: 'Board Member', role: 'Treasurer', bio: 'A short bio for this board member.' },
  { name: 'Board Member', role: 'Secretary', bio: 'A short bio for this board member.' },
]
