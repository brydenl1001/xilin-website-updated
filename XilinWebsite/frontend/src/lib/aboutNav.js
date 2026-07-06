// Shared navigation config for the public About section + its admin editor.

export const GROUP_ORDER = ['About', 'Governance & Policies', 'Guidelines', 'Resources', 'Visit Us']

export const pathFor = (slug) => slug === 'about-us' ? '/about' : `/about/${slug}`
