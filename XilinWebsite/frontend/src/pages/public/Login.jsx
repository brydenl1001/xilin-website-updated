import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { familyLogin } from '../../lib/supabaseClient'
import { Button, Input } from '../../components/ui'
import { ArrowLeft } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Staff sign in with an email; families with a username or 4-digit ID.
      if (identifier.includes('@')) {
        const { error } = await signIn(identifier.trim(), password)
        if (error) throw new Error(error.message)
      } else {
        await familyLogin(identifier.trim(), password)
      }
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-navy flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-yellow-400/5 -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/3 translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-8 transition-colors">
            <ArrowLeft size={14} /> Back to site
          </Link>
          <div className="flex items-center gap-3">
            <img src="/XilinLogo.png" alt="Xilin Northwest Chinese School logo" className="w-12 h-12 object-contain" />
            <div>
              <p className="font-display text-2xl text-white leading-tight">Xilin<span className="text-yellow-400 font-zh"> 希林</span></p>
              <p className="text-slate-400 text-xs uppercase tracking-widest mt-0.5">School Portal</p>
            </div>
          </div>
        </div>
        <div className="relative">
          <p className="text-white/20 font-display text-4xl leading-tight italic mb-4">
            "A journey of a thousand miles begins with a single step."
          </p>
          <p className="text-slate-500 text-sm font-zh">千里之行，始于足下 · Chinese proverb</p>
        </div>
        <div className="relative">
          <p className="text-slate-400 text-sm leading-relaxed">
            Sign in to view your classes, attendance, and payments — all in one place.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-4 transition-colors">
              <ArrowLeft size={14} /> Back to site
            </Link>
            <div className="flex items-center gap-2.5">
              <img src="/XilinLogo.png" alt="" className="w-9 h-9 object-contain" />
              <p className="font-display text-2xl text-slate-900">Xilin<span className="text-yellow-600 font-zh"> 希林</span></p>
            </div>
          </div>

          <h2 className="font-display text-3xl text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-400 text-sm mb-8">Sign in to your school portal</p>

          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <Input label="Email or Family ID" id="identifier" placeholder="you@email.com or 4-digit ID" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
            <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <Button type="submit" variant="gold" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>
          <p className="text-[11px] text-slate-400 text-center mb-2">Staff sign in with email · families with their username or 4-digit Family ID.</p>

          <p className="text-xs text-slate-400 text-center">
            Forgot your password? Contact the school office for a reset.
          </p>
        </div>
      </div>
    </div>
  )
}
