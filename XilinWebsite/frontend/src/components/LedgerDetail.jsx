import { Link } from 'react-router-dom'
import { personName } from '../lib/format'

/**
 * Renders "Member · Class · Note" for a balance-ledger transaction, linking the
 * member and class to their detail pages. `memberTo(id)` builds the member link
 * target (admin → /users/:id, family → /members/:id); omit it to not link members.
 */
export default function LedgerDetail({ t, memberTo }) {
  const parts = []
  if (t.member_id && personName(t.member)) {
    parts.push(memberTo
      ? <Link key="m" to={memberTo(t.member_id)} className="hover:text-yellow-700 hover:underline">{personName(t.member)}</Link>
      : <span key="m">{personName(t.member)}</span>)
  }
  if (t.class_id && t.classes?.name) {
    parts.push(<Link key="c" to={`/class/${t.class_id}`} className="hover:text-yellow-700 hover:underline">{t.classes.name}</Link>)
  }
  if (t.note) parts.push(<span key="n">{t.note}</span>)
  if (!parts.length) return '—'
  return parts.reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`s${i}`} className="text-slate-300"> · </span>, el], [])
}
