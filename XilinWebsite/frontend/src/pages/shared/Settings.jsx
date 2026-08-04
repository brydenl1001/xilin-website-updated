import { useState, useEffect } from 'react'
import { Hash, Mail, KeyRound, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import {
  getProfile, getOwnFamily, saveOwnProfileInfo, saveOwnFamilyInfo, changeEmail, changePassword,
} from '../../lib/supabaseClient'
import { Card, Button, Input, PageHeader, TableSkeleton } from '../../components/ui'
import { useFeedback } from '../../context/FeedbackContext'

const EMPTY = {
  first_name: '', last_name: '', family_name: '', phone: '', date_of_birth: '',
  street: '', city: '', state: '', postal_code: '', country: '',
}

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { toast } = useFeedback()
  const isFamily = user?.role === 'family'

  const [form, setForm] = useState(EMPTY)
  const [familyCode, setFamilyCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Email + password change forms
  const [emailForm, setEmailForm] = useState('')
  const [emailBusy, setEmailBusy] = useState(false)
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let live = true
    setLoading(true)
    const fetch = isFamily ? getOwnFamily(user.id) : getProfile(user.id)
    fetch
      .then(rec => {
        if (!live) return
        setForm({
          first_name: rec.first_name || '',
          last_name: rec.last_name || '',
          family_name: rec.family_name || '',
          phone: rec.phone || '',
          date_of_birth: rec.date_of_birth || '',
          street: rec.street || '',
          city: rec.city || '',
          state: rec.state || '',
          postal_code: rec.postal_code || '',
          country: rec.country || '',
        })
        setFamilyCode(rec.family_code || '')
      })
      .catch(err => { if (live) setError(err.message) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [user?.id, isFamily])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    const address = {
      street: form.street, city: form.city, state: form.state,
      postal_code: form.postal_code, country: form.country,
    }
    try {
      if (isFamily) {
        await saveOwnFamilyInfo({ family_name: form.family_name, phone: form.phone, ...address })
      } else {
        await saveOwnProfileInfo({ first_name: form.first_name, last_name: form.last_name, phone: form.phone, date_of_birth: form.date_of_birth, ...address })
      }
      await refreshUser()
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleEmail = async (e) => {
    e.preventDefault()
    const next = emailForm.trim().toLowerCase()
    if (!next || next === (user?.email || '').toLowerCase()) return
    setEmailBusy(true)
    try {
      await changeEmail(next)
      await refreshUser()
      setEmailForm('')
      toast.success('Email updated.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setEmailBusy(false)
    }
  }

  const handlePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next.length < 8) return toast.error('Password must be at least 8 characters.')
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match.')
    setPwBusy(true)
    try {
      await changePassword(pwForm.next)
      setPwForm({ next: '', confirm: '' })
      toast.success('Password changed.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setPwBusy(false)
    }
  }

  const addressFields = (
    <div className="space-y-3">
      <label className="block text-xs font-medium text-slate-600">Address</label>
      <Input id="s-street" placeholder="Street address" value={form.street} onChange={set('street')} />
      <div className="grid grid-cols-2 gap-3">
        <Input id="s-city" placeholder="City" value={form.city} onChange={set('city')} />
        <Input id="s-state" placeholder="State / Province" value={form.state} onChange={set('state')} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input id="s-zip" placeholder="ZIP / Postal code" value={form.postal_code} onChange={set('postal_code')} />
        <Input id="s-country" placeholder="Country" value={form.country} onChange={set('country')} />
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl animate-fade-in">
      <PageHeader title="Settings" subtitle="Manage your account and personal details" />

      {/* ── Profile / household details ── */}
      <Card className="mb-5">
        <h3 className="font-display text-base text-slate-900 mb-4">{isFamily ? 'Household Details' : 'Profile'}</h3>
        {loading ? (
          <TableSkeleton rows={3} className="!p-0 py-2" />
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {isFamily ? (
              <>
                <Input label="Family Name" id="s-famname" value={form.family_name} onChange={set('family_name')} required />
                <p className="text-xs text-slate-400 -mt-2">Your family name is also your sign-in name, so it must be unique.</p>
                {familyCode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1.5">Family ID</label>
                    <p className="text-sm font-mono font-medium text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center gap-2">
                      <Hash size={13} className="text-slate-400" />{familyCode}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Use this 4-digit ID (or your family name) to sign in. It can't be changed.</p>
                  </div>
                )}
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" id="s-first" value={form.first_name} onChange={set('first_name')} required />
                <Input label="Last Name" id="s-last" value={form.last_name} onChange={set('last_name')} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone" id="s-phone" type="tel" placeholder="e.g. 206-555-0100" value={form.phone} onChange={set('phone')} />
              {!isFamily && (
                <Input label="Date of Birth" id="s-dob" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              )}
            </div>

            {addressFields}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
              <p className="text-sm font-medium text-slate-700 capitalize px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">{user?.role}</p>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" variant="gold" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}</Button>
          </form>
        )}
      </Card>

      {/* ── Change email ── */}
      <Card className="mb-5">
        <h3 className="font-display text-base text-slate-900 mb-1 flex items-center gap-2"><Mail size={16} className="text-slate-400" /> Email</h3>
        <p className="text-xs text-slate-400 mb-4">Current: <span className="font-medium text-slate-600">{user?.email || '—'}</span></p>
        <form onSubmit={handleEmail} className="space-y-3">
          <Input label="New email" id="s-newemail" type="email" placeholder="you@email.com" value={emailForm} onChange={e => setEmailForm(e.target.value)} />
          <Button type="submit" variant="outline" size="sm" disabled={emailBusy || !emailForm.trim()}>{emailBusy ? 'Updating…' : 'Update Email'}</Button>
        </form>
      </Card>

      {/* ── Change password ── */}
      <Card>
        <h3 className="font-display text-base text-slate-900 mb-4 flex items-center gap-2"><KeyRound size={16} className="text-slate-400" /> Password</h3>
        <form onSubmit={handlePassword} className="space-y-3">
          <Input label="New password" id="s-pw" type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
          <Input label="Confirm new password" id="s-pw2" type={showPw ? 'text' : 'password'} value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">
            {showPw ? <EyeOff size={13} /> : <Eye size={13} />}{showPw ? 'Hide password' : 'Show password'}
          </button>
          <div><Button type="submit" variant="outline" size="sm" disabled={pwBusy || !pwForm.next || !pwForm.confirm}>{pwBusy ? 'Saving…' : 'Change Password'}</Button></div>
        </form>
      </Card>
    </div>
  )
}
