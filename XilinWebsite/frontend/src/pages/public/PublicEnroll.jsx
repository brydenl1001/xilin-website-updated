import { useState } from 'react'
import { CheckCircle, ArrowRight } from 'lucide-react'
import { Button, Input, Select, Textarea } from '../../components/ui'

const STEPS = ['Personal Info', 'Academic Details', 'Review & Submit']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              i < current ? 'bg-green-500 text-white' :
              i === current ? 'bg-slate-900 text-yellow-400 ring-4 ring-slate-900/20' :
              'bg-slate-200 text-slate-400'
            }`}>
              {i < current ? <CheckCircle size={16} /> : i + 1}
            </div>
            <p className={`text-xs mt-1.5 whitespace-nowrap ${i === current ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {label}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-16 h-0.5 mx-2 mb-5 transition-all ${i < current ? 'bg-green-500' : 'bg-slate-200'}`} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function PublicEnroll() {
  const [step, setStep] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({
    student_name: '', dob: '', parent_name: '', email: '', phone: '',
    grade: 'Grade 9', prev_school: '', notes: '',
  })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  /**
   * Submitting an application creates a new auth.users entry for the
   * student, a profiles row, and an enrollments row — all of which require
   * the service role key. This MUST go through a backend endpoint, not a
   * direct Supabase client call.
   *
   * Expected backend contract (e.g. POST /api/enrollments/apply):
   *   1. supabase.auth.admin.createUser({ email: form.email, password: <generated> })
   *   2. insert into profiles (id, full_name, role='student', can_login=true)
   *   3. insert into enrollments (student_id, status='pending', notes)
   *   4. (optionally) email the parent/guardian their temporary credentials
   *
   * Until that endpoint exists, this call will fail — replace the URL below
   * once your backend is deployed.
   */
  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/enrollments/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `Server responded with ${res.status}`)
      }
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h2 className="font-display text-3xl text-slate-900 mb-3">Application Submitted!</h2>
        <p className="text-slate-500 mb-8 leading-relaxed">
          Thank you for applying to Academia. Our admissions team will review your application and contact you at <strong>{form.email}</strong> within 5–7 business days.
        </p>
        <p className="text-sm text-slate-400 mb-6">Reference: <span className="font-mono font-medium text-slate-700">APP-{Date.now().toString().slice(-6)}</span></p>
        <Button variant="secondary" onClick={() => { setSubmitted(false); setStep(0); setForm({ student_name:'',dob:'',parent_name:'',email:'',phone:'',grade:'Grade 9',prev_school:'',notes:'' }) }}>
          Submit Another Application
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-2">Admissions</p>
        <h1 className="font-display text-4xl text-slate-900 mb-3">Apply to Academia</h1>
        <p className="text-slate-500">Complete the form below to begin the admissions process for the 2026–27 year.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <StepIndicator current={step} />

        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-display text-lg text-slate-900 mb-4">Student Information</h3>
            <Input label="Student Full Name" id="sname" placeholder="e.g. James Adeyemi" value={form.student_name} onChange={set('student_name')} required />
            <Input label="Date of Birth" id="dob" type="date" value={form.dob} onChange={set('dob')} required />
            <div className="border-t border-slate-100 pt-4 mt-4">
              <h3 className="font-display text-lg text-slate-900 mb-4">Parent / Guardian</h3>
            </div>
            <Input label="Parent / Guardian Full Name" id="pname" placeholder="e.g. Maria Adeyemi" value={form.parent_name} onChange={set('parent_name')} required />
            <Input label="Email Address" id="email" type="email" placeholder="parent@email.com" value={form.email} onChange={set('email')} required />
            <Input label="Phone Number" id="phone" type="tel" placeholder="(312) 000-0000" value={form.phone} onChange={set('phone')} />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-display text-lg text-slate-900 mb-4">Academic Details</h3>
            <Select label="Grade Applying For" id="grade" value={form.grade} onChange={set('grade')}>
              {['Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'].map(g => <option key={g}>{g}</option>)}
            </Select>
            <Input label="Previous School" id="prevschool" placeholder="Name of current/last school" value={form.prev_school} onChange={set('prev_school')} />
            <Textarea label="Additional Notes (optional)" id="notes" placeholder="Any relevant information, special requirements, or questions..." value={form.notes} onChange={set('notes')} rows={4} />
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="font-display text-lg text-slate-900 mb-5">Review Your Application</h3>
            <div className="bg-slate-50 rounded-xl p-5 space-y-3">
              {[
                ['Student Name', form.student_name],
                ['Date of Birth', form.dob],
                ['Parent / Guardian', form.parent_name],
                ['Email', form.email],
                ['Phone', form.phone || 'Not provided'],
                ['Grade', form.grade],
                ['Previous School', form.prev_school || 'Not provided'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-slate-200 last:border-0">
                  <span className="text-xs text-slate-400">{k}</span>
                  <span className="text-sm text-slate-900 font-medium text-right max-w-xs">{v}</span>
                </div>
              ))}
            </div>
            {form.notes && (
              <div className="mt-3 bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{form.notes}</p>
              </div>
            )}
          </div>
        )}

        {submitError && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 mt-4 text-xs text-red-600">
            Failed to submit: {submitError}
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-slate-100">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0 || submitting}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="gold" onClick={() => setStep(s => s + 1)} disabled={step === 0 && (!form.student_name || !form.email || !form.parent_name)}>
              Continue <ArrowRight size={14} />
            </Button>
          ) : (
            <Button variant="gold" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
