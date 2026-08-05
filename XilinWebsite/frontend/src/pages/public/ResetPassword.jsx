import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, changePassword } from '../../lib/supabaseClient'
import { Button, Input } from '../../components/ui'
import { ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react'

/**
 * Landing page for the emailed password-reset link. Supabase's client picks the
 * recovery token out of the URL and establishes a short-lived recovery session;
 * we use it to set the new password, then sign out so they log in cleanly.
 */
export default function ResetPassword() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)   // recovery session established?
  const [checking, setChecking] = useState(true)
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    let live = true
    // The token may still be being exchanged when we mount, so listen as well as
    // checking once.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (live && session) { setReady(true); setChecking(false) }
    })
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!live) return
      if (session) setReady(true)
      setChecking(false)
    })
    return () => { live = false; subscription.unsubscribe() }
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (next.length < 8) return setError('Password must be at least 8 characters.')
    if (next !== confirm) return setError('Passwords do not match.')
    setBusy(true); setError('')
    try {
      await changePassword(next)
      await supabase.auth.signOut()   // end the recovery session; sign in fresh
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

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

        {done ? (
          <>
            <h2 className="font-display text-3xl text-slate-900 mb-1 flex items-center gap-2">
              <CheckCircle2 size={26} className="text-green-600" /> Password updated
            </h2>
            <p className="text-slate-500 text-sm mb-6">You can now sign in with your new password.</p>
            <Button variant="gold" className="w-full" onClick={() => navigate('/login')}>Go to sign in</Button>
          </>
        ) : checking ? (
          <p className="text-slate-400 text-sm">Checking your reset link…</p>
        ) : !ready ? (
          <>
            <h2 className="font-display text-3xl text-slate-900 mb-1">Link expired</h2>
            <p className="text-slate-500 text-sm mb-6">
              This password reset link is invalid or has already been used. Reset links expire about an hour after they're sent.
            </p>
            <Button variant="gold" className="w-full" onClick={() => navigate('/login')}>Request a new link</Button>
          </>
        ) : (
          <>
            <h2 className="font-display text-3xl text-slate-900 mb-1">Choose a new password</h2>
            <p className="text-slate-400 text-sm mb-8">Pick something you don't use anywhere else.</p>
            <form onSubmit={submit} className="space-y-4">
              <Input label="New password" id="rp-pw" type={showPw ? 'text' : 'password'} placeholder="At least 8 characters"
                value={next} onChange={e => setNext(e.target.value)} required />
              <Input label="Confirm new password" id="rp-pw2" type={showPw ? 'text' : 'password'}
                value={confirm} onChange={e => setConfirm(e.target.value)} required />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />}{showPw ? 'Hide password' : 'Show password'}
              </button>
              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
              <Button type="submit" variant="gold" className="w-full" disabled={busy || !next || !confirm}>
                {busy ? 'Saving…' : 'Set new password'}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
