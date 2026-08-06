import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { familyLogin, requestPasswordReset } from '../../lib/supabaseClient'
import { Button, Input } from '../../components/ui'
import { ArrowLeft } from 'lucide-react'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  // Forgot-password mode reuses the same identifier field. `?forgot=1` opens it
  // directly — that's how /link-expired hands people back here.
  const [params] = useSearchParams()
  const [forgot, setForgot] = useState(params.get('forgot') === '1')
  const [sent, setSent] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      // Staff sign in with an email; families with their family name or 4-digit ID.
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

  const handleReset = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) return setError('Enter your email, family name, or Family ID.')
    setLoading(true); setError(''); setSent('')
    try {
      const res = await requestPasswordReset(identifier.trim())
      setSent(res?.message || 'If an account matches that, we’ve sent a password reset link to its email address.')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleForgot = (on) => { setForgot(on); setError(''); setSent(''); setPassword('') }

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

          <h2 className="font-display text-3xl text-slate-900 mb-1">{forgot ? 'Reset your password' : 'Welcome back'}</h2>
          <p className="text-slate-400 text-sm mb-8">
            {forgot ? 'We’ll email a reset link to the address on your account' : 'Sign in to your school portal'}
          </p>

          {forgot ? (
            <>
              <form onSubmit={handleReset} className="space-y-4 mb-6">
                <Input label="Email, family name, or Family ID" id="identifier" placeholder="you@email.com, family name, or 4-digit ID"
                  value={identifier} onChange={e => setIdentifier(e.target.value)} required disabled={!!sent} />
                {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                {sent
                  ? <p className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">{sent}</p>
                  : <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                      {loading ? 'Sending…' : 'Send reset link'}
                    </Button>}
              </form>
              <p className="text-xs text-slate-400 text-center">
                <button type="button" onClick={() => toggleForgot(false)} className="text-yellow-600 hover:text-yellow-700 font-medium cursor-pointer">
                  ← Back to sign in
                </button>
              </p>
            </>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4 mb-6">
                <Input label="Email, family name, or Family ID" id="identifier" placeholder="you@email.com, family name, or 4-digit ID" value={identifier} onChange={e => setIdentifier(e.target.value)} required />
                <Input label="Password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
                <Button type="submit" variant="gold" className="w-full" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </Button>
              </form>
              <p className="text-[11px] text-slate-400 text-center mb-2">Staff sign in with email · families with their family name or 4-digit Family ID.</p>

              <p className="text-xs text-slate-400 text-center">
                <button type="button" onClick={() => toggleForgot(true)} className="text-yellow-600 hover:text-yellow-700 font-medium cursor-pointer">
                  Forgot your password?
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
