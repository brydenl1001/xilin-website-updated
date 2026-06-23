import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

/**
 * Shared selected-child state for parent portal pages.
 * Currently resets to the first student on every page mount (no persistence
 * across navigation) — for a multi-child family that should remember the
 * selection, lift this into AuthContext or a dedicated context provider.
 */
export function useSelectedChild() {
  const { user } = useAuth()
  const students = (user?.familyMembers || []).filter(m => m.relationship === 'student')
  const [childId, setChildId] = useState(students[0]?.id || '')
  const child = students.find(s => s.id === childId)

  return { students, childId, setChildId, child }
}
