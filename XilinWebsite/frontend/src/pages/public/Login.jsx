import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Button, Input } from '../../components/ui'
import { ArrowLeft } from 'lucide-react'

const DEMO_ROLES = [
  { role: 'admin',   desc: 'Full school management' },
  { role: 'teacher', desc: 'Classes, grades, attendance' },
  { role: 'student', desc: 'Personal academic records' },
  { role: 'parent',  desc: "Monitor child's progress" },
]

export default function Login() {
  const { signIn, signInWithRole } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail]       = useState('jane@academia.edu')
  const [password, setPassword] = useState('password')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await signIn(email, password)
    setLoading(false)
    if (error) setError(error.message)
    else navigate('/dashboard')
  }

  const handleDemo = (role) => {
    signInWithRole(role)
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-slate-900 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-yellow-400/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/3 translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={14} /> Back to site
          </Link>
          <p className="font-display text-2xl text-white">Aca<span className="text-yellow-400">demia</span></p>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">School Portal</p>
        </div>
        <div className="relative">
          <p className="text-white/20 font-display text-4xl leading-tight italic mb-4">
            "Education is the most powerful weapon which you can use to change the world."
          </p>
          <p className="text-slate-500 text-sm">Nelson Mandela</p>
        </div>
        <div className="relative grid grid-cols-2 gap-2">
          {['1,248 Students', '96 Staff', 'RBAC Secured', '4 Portals'].map(s => (
            <div key={s} className="bg-white/5 rounded-xl px-4 py-3 border border-white/8">
              <p className="text-white text-sm">{s}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
              <ArrowLeft size={14} /> Back to site
            </Link>
            <p className="font-display text-2xl text-slate-900">Aca<span className="text-yellow-500">demia</span></p>
          </div>

          <h2 className="font-display text-3xl text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-8">Sign in to your school portal</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <Input label="Email" id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center">
              <span className="px-3 bg-slate-50 text-xs text-slate-400">or try a demo account</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {DEMO_ROLES.map(({ role, desc }) => (
              <button
                key={role}
                onClick={() => handleDemo(role)}
                className="group border border-slate-200 rounded-xl p-3 text-left hover:border-yellow-300 hover:bg-yellow-50/50 transition-all"
              >
                <p className="text-sm font-medium text-slate-900 capitalize">{role}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
