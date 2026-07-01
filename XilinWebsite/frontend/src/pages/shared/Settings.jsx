import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { getProfile, getOwnFamily, saveOwnProfileInfo, saveOwnFamilyInfo } from '../../lib/supabaseClient'
import { Card, Button, Input, Textarea, PageHeader } from '../../components/ui'

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const isFamily = user?.role === 'family'

  const [form, setForm] = useState({ full_name: '', family_name: '', phone: '', date_of_birth: '', address: '', username: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="max-w-2xl animate-fade-in">
      <PageHeader title="Settings" subtitle="Manage your account and personal details" />
      <Card className="mb-5">
        <h3 className="font-display text-base text-slate-900 mb-4">{isFamily ? 'Household Details' : 'Profile'}</h3>
        {loading ? (
          <p className="text-sm text-slate-400 py-4">Loading…</p>
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
    </div>
  )
}
