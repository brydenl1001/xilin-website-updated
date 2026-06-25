import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Shared selected-member state for the family portal pages. Returns ALL family
 * members (parents and students alike, since both can take classes), plus the
 * currently selected one. Resets to the first member on mount (no persistence
 * across navigation).
 */
export function useSelectedMember() {
  const { user } = useAuth()
  const members = user?.familyMembers || []
  const [memberId, setMemberId] = useState(members[0]?.id || '')
  const member = members.find(m => m.id === memberId)

  return { members, memberId, setMemberId, member }
}
