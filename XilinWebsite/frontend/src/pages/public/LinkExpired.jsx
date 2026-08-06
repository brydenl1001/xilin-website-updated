import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui'
import { ArrowLeft, TimerOff } from 'lucide-react'

/**
 * Dead-end screen for a password-reset link that can no longer be used — expired,
 * already spent, or tampered with. `/reset-password` sends people here rather
 * than showing the failure inline, so a stale link never leaves them staring at a
 * password form that can't work.
 */
export default function LinkExpired() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-700 text-sm mb-6 transition-colors">
          <ArrowLeft size={14} /> Back to site
        </Link>
        <div className="flex items-center gap-2.5 mb-6">
          <img src="/XilinLogo.png" alt="" className="w-9 h-9 object-contain" />
          <p className="font-display text-2xl text-slate-900">Xilin<span className="text-yellow-600 font-zh"> 希林</span></p>
        </div>

        <h2 className="font-display text-3xl text-slate-900 mb-1 flex items-center gap-2">
          <TimerOff size={26} className="text-yellow-600" /> Link expired
        </h2>
        <p className="text-slate-500 text-sm mb-6">
          This password reset link is no longer valid. Reset links expire about an hour after they're
          sent and can only be used once — if you've already reset your password, sign in with the new one.
        </p>
        <Button variant="gold" className="w-full" onClick={() => navigate('/login?forgot=1')}>
          Email me a new link
        </Button>
        <p className="text-xs text-slate-400 text-center mt-4">
          <Link to="/login" className="text-yellow-600 hover:text-yellow-700 font-medium">Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}
