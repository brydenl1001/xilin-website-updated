import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { resolveCurrentIdentity, signIn as supaSignIn, signOut as supaSignOut } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // identity: { type: 'profile', id, full_name, role, ... }
  //        or { type: 'family',  id, family_name, family_members: [...] }
  const [identity, setIdentity] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && active) {
        await loadIdentity(session.user.id)
      }
      if (active) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await loadIdentity(session.user.id)
      } else {
        setIdentity(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const loadIdentity = async (uid) => {
    try {
      const resolved = await resolveCurrentIdentity(uid)
      setIdentity(resolved)
    } catch (err) {
      console.error('Failed to resolve identity:', err)
      setIdentity(null)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supaSignIn(email, password)
    if (error) return { error }
    if (data?.user) await loadIdentity(data.user.id)
    return { error: null }
  }

  const signOut = async () => {
    await supaSignOut()
    setIdentity(null)
  }

  // ─── Normalized `user` shape for the rest of the app ───────────────────────
  // type 'profile' → role is admin/teacher/student, use fields directly
  // type 'family'  → synthetic role 'parent', plus raw family data + members
  const user = !identity
    ? null
    : identity.type === 'profile'
      ? { id: identity.id, full_name: identity.full_name, role: identity.role, email: identity.email, avatar_url: identity.avatar_url }
      : {
          id: identity.id,
          full_name: identity.family_name,
          role: 'parent',
          email: identity.email,
          avatar_url: null,
          familyMembers: identity.family_members?.map(m => ({ ...m.profiles, relationship: m.relationship })) || [],
        }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
