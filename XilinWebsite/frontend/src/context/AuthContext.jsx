import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'
import { mockUser } from '../lib/mockData'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(mockUser)

  const signIn = async (email, password) => {
    setUser({ ...mockUser, email })
    return { error: null }
  }

  const signInWithRole = (role) => {
    const names  = { admin: 'Jane Doe', teacher: 'Mr. Okonkwo', student: 'Ethan Park', parent: 'Maria Reyes' }
    const emails = { admin: 'jane@academia.edu', teacher: 'okonkwo@academia.edu', student: 'ethan@student.edu', parent: 'maria@parent.edu' }
    setUser({ id: `usr-${role}`, full_name: names[role], role, email: emails[role], avatar_url: null })
  }

  const signOut = async () => {
    setUser(null)
    await supabase.auth.signOut().catch(() => {})
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut, signInWithRole }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
