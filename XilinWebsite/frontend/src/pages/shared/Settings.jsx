import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getProfile, getOwnFamily, saveOwnProfileInfo, saveOwnFamilyInfo, changePassword } from '../../lib/supabaseClient'
import { Card, Button, Input, Textarea, PageHeader, TableSkeleton } from '../../components/ui'
import { Eye, EyeOff, Lock } from 'lucide-react'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const isFamily = user?.role === 'family'

  const [form, setForm] = useState({ full_name: '', family_name: '', phone: '', date_of_birth: '', address: '', username: '' })
  const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [showPasswords, setShowPasswords] = useState({ old: false, new: false, confirm: false })
  const [expandPassword, setExpandPassword] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let live = true
    setLoading(true)
    const fetch = isFamily ? getOwnFamily(user.id) : getProfile(user.id)
    fetch
      .then(rec => {
        if (!live) return
        setForm({
          full_name: rec.full_name || '',
          family_name: rec.family_name || '',
          phone: rec.phone || '',
          date_of_birth: rec.date_of_birth || '',
          address: rec.address || '',
          username: rec.username || '',
        })
      })
      .catch(err => { if (live) setError(err.message) })
      .finally(() => { if (live) setLoading(false) })
    return () => { live = false }
  }, [user?.id, isFamily])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))
  const setPassword = (k) => (e) => setPasswordForm(f => ({ ...f, [k]: e.target.value }))

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSaved(false)
    try {
      if (isFamily) {
        await saveOwnFamilyInfo({ family_name: form.family_name, phone: form.phone, address: form.address, username: form.username })
      } else {
        await saveOwnProfileInfo({ full_name: form.full_name, phone: form.phone, date_of_birth: form.date_of_birth, address: form.address })
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

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)

    // Validation
    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    if (passwordForm.oldPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from current password')
      return
    }

    setPasswordSaving(true)
    try {
      await changePassword(passwordForm.oldPassword, passwordForm.newPassword)
      setPasswordSaved(true)
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      setExpandPassword(false)
      setTimeout(() => setPasswordSaved(false), 2500)
    } catch (err) {
      setPasswordError(err.message)
    } finally {
      setPasswordSaving(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }))
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <PageHeader title="Settings" subtitle="Manage your account and personal details" />
      
      {/* Profile Settings Card */}
      <Card className="mb-5">
        <h3 className="font-display text-base text-slate-900 mb-4">{isFamily ? 'Household Details' : 'Profile'}</h3>
        {loading ? (
          <TableSkeleton rows={3} className="!p-0 py-2" />
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {isFamily ? (
              <>
                <Input label="Family Name" id="s-famname" value={form.family_name} onChange={set('family_name')} />
                <div>
                  <Input label="Login Username" id="s-username" placeholder="e.g. the-chen-family" value={form.username} onChange={set('username')} />
                  <p className="text-xs text-slate-400 mt-1">Sign in with this username or your 4-digit Family ID. Letters, numbers, dot, dash, underscore (3–30 chars).</p>
                </div>
              </>
            ) : (
              <Input label="Full Name" id="s-name" value={form.full_name} onChange={set('full_name')} />
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Email</label>
              <p className="text-sm font-medium text-slate-700 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">{user?.email || '—'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Phone" id="s-phone" type="tel" placeholder="e.g. 206-555-0100" value={form.phone} onChange={set('phone')} />
              {!isFamily && (
                <Input label="Date of Birth" id="s-dob" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
              )}
            </div>

            <Textarea label="Address" id="s-address" rows={2} placeholder="Street, city, state, ZIP" value={form.address} onChange={set('address')} />

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
              <p className="text-sm font-medium text-slate-700 capitalize px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">{user?.role}</p>
            </div>

            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <Button type="submit" variant="gold" disabled={saving}>{saving ? 'Saving…' : saved ? 'Saved!' : 'Save Changes'}</Button>
          </form>
        )}
      </Card>

      {/* Password Change Card */}
      <Card>
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setExpandPassword(!expandPassword)}>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <h3 className="font-display text-base text-slate-900">Change Password</h3>
          </div>
          <svg className={`w-5 h-5 text-slate-400 transition-transform ${expandPassword ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>

        {expandPassword && (
          <form onSubmit={handlePasswordChange} className="space-y-4 border-t border-slate-200 pt-4">
            {/* Current Password */}
            <div>
              <label htmlFor="old-password" className="block text-xs font-medium text-slate-600 mb-1.5">Current Password</label>
              <div className="relative">
                <input
                  id="old-password"
                  type={showPasswords.old ? 'text' : 'password'}
                  value={passwordForm.oldPassword}
                  onChange={setPassword('oldPassword')}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('old')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.old ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label htmlFor="new-password" className="block text-xs font-medium text-slate-600 mb-1.5">New Password</label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={setPassword('newPassword')}
                  placeholder="Enter a new password (minimum 6 characters)"
                  className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-slate-600 mb-1.5">Confirm New Password</label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={setPassword('confirmPassword')}
                  placeholder="Re-enter your new password"
                  className="w-full px-3 py-2 pr-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {passwordError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{passwordError}</p>}

            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="gold" disabled={passwordSaving}>
                {passwordSaving ? 'Updating…' : passwordSaved ? 'Password Updated!' : 'Update Password'}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setExpandPassword(false); setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' }); setPasswordError('') }}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  )
}
