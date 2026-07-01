import { useState, useEffect } from 'react'
import { CheckCircle, ArrowRight, Users, UserPlus, ShieldCheck, CalendarDays } from 'lucide-react'
import { Button, Input, Textarea } from '../../components/ui'
import { listPublicCourses, submitEnrollmentApplication, getActiveSemester } from '../../lib/supabaseClient'

const STEPS = ['Your Details', 'Family', 'Classes', 'Review & Submit']

function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
              i < current ? 'bg-green-500 text-white' :
              i === current ? 'bg-navy text-yellow-400 ring-4 ring-navy/20' :
              'bg-slate-200 text-slate-400'
            }`}>
              {i < current ? <CheckCircle size={16} /> : i + 1}
            </div>
            <p className={`text-xs mt-1.5 whitespace-nowrap ${i === current ? 'text-slate-900 font-medium' : 'text-slate-400'}`}>
              {label}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-12 h-0.5 mx-2 mb-5 transition-all ${i < current ? 'bg-green-500' : 'bg-slate-200'}`} />
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

  const [courses, setCourses] = useState([])
  const [coursesError, setCoursesError] = useState('')
  const [semester, setSemester] = useState(null)

  const [form, setForm] = useState({
    applicant_type: 'parent',   // 'parent' | 'student'
    full_name: '', email: '', phone: '', dob: '',
    family_mode: 'new',         // 'new' | 'existing'
    family_id: '', family_name: '',
    password: '', password_confirm: '',
    class_ids: [],
    notes: '',
  })
  const [errors, setErrors] = useState({})
  // Update a field and clear its validation error as the user types.
  const set = (k) => (e) => {
    const value = e.target.value
    setForm(f => ({ ...f, [k]: value }))
    setErrors(er => (er[k] ? { ...er, [k]: undefined } : er))
  }

  useEffect(() => {
    listPublicCourses()
      .then(setCourses)
      .catch(err => setCoursesError(err.message))
    getActiveSemester().then(setSemester).catch(() => {})
  }, [])

  const toggleClass = (id) => setForm(f => ({
    ...f,
    class_ids: f.class_ids.includes(id) ? f.class_ids.filter(c => c !== id) : [...f.class_ids, id],
  }))

  /**
   * Submits the application to the `enroll-apply` edge function, which validates
   * the input, checks the Family ID when joining an existing family, and inserts
   * a pending enrollment_applications row. Nothing is activated until an admin
   * approves it.
   */
  const [reference, setReference] = useState('')
  const handleSubmit = async () => {
    setSubmitting(true)
    setSubmitError('')
    try {
      const result = await submitEnrollmentApplication(form)
      if (result?.reference) setReference(result.reference)
      setSubmitted(true)
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSubmitted(false)
    setStep(0)
    setReference('')
    setErrors({})
    setForm({
      applicant_type: 'parent', full_name: '', email: '', phone: '', dob: '',
      family_mode: 'new', family_id: '', family_name: '', password: '', password_confirm: '', class_ids: [], notes: '',
    })
  }

  // Per-step validation — runs when the user clicks "Continue".
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  const validateStep = (s) => {
    const e = {}
    if (s === 0) {
      if (!form.full_name.trim()) e.full_name = 'Please enter your full name.'
      if (!form.email.trim()) e.email = 'Please enter your email address.'
      else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.'
    }
    if (s === 1) {
      if (form.family_mode === 'existing') {
        if (!form.family_id.trim()) e.family_id = 'Please enter the Family ID.'
        else if (!UUID_RE.test(form.family_id.trim())) e.family_id = "That doesn't look like a valid Family ID."
      } else {
        if (!form.family_name.trim()) e.family_name = 'Please enter a family name.'
        if (form.password.length < 8) e.password = 'Choose a password of at least 8 characters.'
        else if (form.password !== form.password_confirm) e.password_confirm = 'Passwords do not match.'
      }
    }
    return e
  }

  const goNext = () => {
    const e = validateStep(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setErrors({})
    setStep(s => s + 1)
  }

  const selectedCourses = courses.filter(c => form.class_ids.includes(c.id))

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-6 py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle size={28} className="text-green-600" />
        </div>
        <h2 className="font-display text-3xl text-slate-900 mb-3">Application Submitted!</h2>
        <p className="text-slate-500 mb-6 leading-relaxed">
          Thank you for applying to Xilin. Your request has been sent to our admissions team for
          review. Once an administrator approves it, we'll email you at <strong>{form.email}</strong>{' '}
          with your account details and next steps.
        </p>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-8 flex items-center justify-center gap-2 text-sm text-yellow-800">
          <ShieldCheck size={16} className="flex-shrink-0" />
          Pending administrator approval
        </div>
        {reference && (
          <p className="text-sm text-slate-400 mb-6">Reference: <span className="font-mono font-medium text-slate-700">{reference}</span></p>
        )}
        <Button variant="secondary" onClick={reset}>
          Submit Another Application
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <div className="text-center mb-10">
        <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-2">Admissions</p>
        <h1 className="font-display text-4xl text-slate-900 mb-3">Apply to Enroll</h1>
        {semester && (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 mb-3">
            <CalendarDays size={13} /> Enrolling for {semester.name}{semester.academic_year ? ` · ${semester.academic_year}` : ''}
          </p>
        )}
        <p className="text-slate-500">Students and parents are both welcome to take classes. Complete the form below — every application is reviewed by an administrator before it's approved.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <StepIndicator current={step} />

        {/* Step 0 — Applicant details */}
        {step === 0 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">I am applying as a…</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: 'parent', label: 'Parent / Guardian' },
                  { val: 'student', label: 'Student' },
                ].map(opt => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, applicant_type: opt.val }))}
                    className={`rounded-xl px-4 py-3 text-sm font-medium border transition-all cursor-pointer ${
                      form.applicant_type === opt.val
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Full Name" id="fname" placeholder="e.g. Maria Adeyemi" value={form.full_name} onChange={set('full_name')} required error={errors.full_name} />
            <Input label="Email Address" id="email" type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required error={errors.email} />
            <Input label="Phone Number" id="phone" type="tel" placeholder="(312) 000-0000" value={form.phone} onChange={set('phone')} />
            {form.applicant_type === 'student' && (
              <Input label="Date of Birth" id="dob" type="date" value={form.dob} onChange={set('dob')} />
            )}
          </div>
        )}

        {/* Step 1 — Family */}
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <h3 className="font-display text-lg text-slate-900 mb-1">Family</h3>
            <p className="text-sm text-slate-500 mb-4">Each learner belongs to a family account. Join an existing one or start a new family.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: 'new', label: 'Create new family', Icon: UserPlus },
                { val: 'existing', label: 'Join existing family', Icon: Users },
              ].map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, family_mode: opt.val }))}
                  className={`rounded-xl px-4 py-3 text-sm font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                    form.family_mode === opt.val
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <opt.Icon size={16} /> {opt.label}
                </button>
              ))}
            </div>

            {form.family_mode === 'existing' ? (
              <div className="pt-2">
                <Input
                  label="Family ID"
                  id="familyid"
                  placeholder="e.g. 1a2b3c4d-…"
                  value={form.family_id}
                  onChange={set('family_id')}
                  required
                  error={errors.family_id}
                />
                <p className="text-xs text-slate-400 mt-1.5">
                  Ask the primary contact of your family for the Family ID shown in their portal settings.
                  An admin will confirm the link before it takes effect.
                </p>
              </div>
            ) : (
              <div className="pt-2">
                <Input
                  label="Family Name"
                  id="familyname"
                  placeholder="e.g. The Adeyemi Family"
                  value={form.family_name}
                  onChange={set('family_name')}
                  required
                  error={errors.family_name}
                />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <Input label="Choose a Password" id="password" type="password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} required error={errors.password} />
                  <Input label="Confirm Password" id="password_confirm" type="password" placeholder="Re-enter password" value={form.password_confirm} onChange={set('password_confirm')} required error={errors.password_confirm} />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">
                  You'll sign in with your <strong>4-digit Family ID</strong> and this password once an admin approves your application.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Classes */}
        {step === 2 && (
          <div className="animate-fade-in">
            <h3 className="font-display text-lg text-slate-900 mb-1">Choose Classes{semester ? ` · ${semester.name}` : ''}</h3>
            <p className="text-sm text-slate-500 mb-4">Select the classes you'd like to enroll in{semester ? ` for ${semester.name}` : ''}. You can change these later with the school office.</p>

            {coursesError && <p className="text-sm text-red-500">Failed to load catalog: {coursesError}</p>}
            {!coursesError && courses.length === 0 && (
              <p className="text-sm text-slate-400 py-6 text-center">No classes are open for enrollment right now. You can still submit your application and pick classes later.</p>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1">
              {courses.map(course => {
                const checked = form.class_ids.includes(course.id)
                return (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => toggleClass(course.id)}
                    className={`w-full text-left rounded-xl px-4 py-3 border transition-all flex items-start gap-3 cursor-pointer ${
                      checked ? 'border-yellow-500 bg-yellow-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      checked ? 'bg-yellow-500 border-yellow-500 text-slate-900' : 'border-slate-300'
                    }`}>
                      {checked && <CheckCircle size={12} />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">{course.name}</span>
                      {course.subject_area && <span className="block text-xs text-slate-400">{course.subject_area}</span>}
                    </span>
                  </button>
                )
              })}
            </div>
            {form.class_ids.length > 0 && (
              <p className="text-xs text-yellow-700 mt-3">{form.class_ids.length} class{form.class_ids.length !== 1 ? 'es' : ''} selected</p>
            )}
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="animate-fade-in">
            <h3 className="font-display text-lg text-slate-900 mb-5">Review Your Application</h3>
            <div className="bg-slate-50 rounded-xl p-5 space-y-3">
              {[
                ['Applying As', form.applicant_type === 'parent' ? 'Parent / Guardian' : 'Student'],
                ['Full Name', form.full_name],
                ['Email', form.email],
                ['Phone', form.phone || 'Not provided'],
                ...(form.applicant_type === 'student' ? [['Date of Birth', form.dob || 'Not provided']] : []),
                ['Family', form.family_mode === 'existing' ? `Join existing (ID: ${form.family_id})` : `New family — ${form.family_name}`],
                ...(semester ? [['Term', `${semester.name}${semester.academic_year ? ` · ${semester.academic_year}` : ''}`]] : []),
                ['Classes', selectedCourses.length ? selectedCourses.map(c => c.name).join(', ') : 'None selected yet'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2 border-b border-slate-200 last:border-0">
                  <span className="text-xs text-slate-400 flex-shrink-0">{k}</span>
                  <span className="text-sm text-slate-900 font-medium text-right">{v}</span>
                </div>
              ))}
            </div>

            <Textarea label="Additional Notes (optional)" id="notes" className="mt-4" placeholder="Anything the admissions team should know..." value={form.notes} onChange={set('notes')} rows={3} />

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-yellow-800">
              <ShieldCheck size={16} className="flex-shrink-0" />
              This application will be reviewed and must be approved by an administrator.
            </div>
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
            <Button variant="gold" onClick={goNext} disabled={submitting}>
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
