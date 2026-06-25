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
