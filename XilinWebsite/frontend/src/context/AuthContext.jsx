import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { resolveCurrentIdentity, signIn as supaSignIn, signOut as supaSignOut } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // identity: { type: 'profile', id, full_name, role, ... }
  //        or { type: 'family',  id, family_name, family_members: [...] }
  const [identity, setIdentity] = useState(null)
  // The signed-in email lives on the auth session, not on the profiles row
  // (profiles has no email column), so we track it separately for staff logins.
  const [authEmail, setAuthEmail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user && active) {
        setAuthEmail(session.user.email ?? null)
        await loadIdentity(session.user.id)
      }
      if (active) setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setAuthEmail(session.user.email ?? null)
        await loadIdentity(session.user.id)
      } else {
        setAuthEmail(null)
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
    setAuthEmail(null)
    setIdentity(null)
  }

  // Re-fetch the current identity (e.g. after the user edits their own profile).
  const refreshUser = async () => {
    if (identity?.id) await loadIdentity(identity.id)
  }

  // ─── Normalized `user` shape for the rest of the app ───────────────────────
  // type 'profile' → role is admin/teacher (staff logins), use fields directly
  // type 'family'  → synthetic role 'family' (household login), plus members
  const user = !identity
    ? null
    : identity.type === 'profile'
      ? { id: identity.id, full_name: identity.full_name, role: identity.role, email: identity.email || authEmail, avatar_url: identity.avatar_url }
      : {
          id: identity.id,
          full_name: identity.family_name,
          role: 'family',
          email: identity.email || authEmail,
          avatar_url: null,
          familyMembers: identity.family_members?.map(m => ({ ...m.profiles, relationship: m.relationship })) || [],
        }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
