import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Card, Button, Input, PageHeader } from '../../components/ui'

export default function Settings() {
  const { user } = useAuth()
  const [name, setName]   = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [saved, setSaved] = useState(false)

  const handleSave = (e) => {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl animate-fade-in">
      <PageHeader title="Settings" subtitle="Manage your account preferences" />
      <Card className="mb-5">
        <h3 className="font-display text-base text-slate-900 mb-4">Profile</h3>
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Full Name" id="s-name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email" id="s-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Role</label>
            <p className="text-sm font-medium text-slate-700 capitalize px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg">{user?.role}</p>
          </div>
          <Button type="submit" variant="gold">{saved ? 'Saved!' : 'Save Changes'}</Button>
        </form>
      </Card>
      <Card>
        <h3 className="font-display text-base text-slate-900 mb-4">Notifications</h3>
        {['Email me about new announcements', 'Email me about payment reminders', 'Email me about grade updates'].map(label => (
          <label key={label} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 cursor-pointer">
            <span className="text-sm text-slate-700">{label}</span>
            <input type="checkbox" defaultChecked className="accent-yellow-400 w-4 h-4 cursor-pointer" />
          </label>
        ))}
      </Card>
    </div>
  )
}
