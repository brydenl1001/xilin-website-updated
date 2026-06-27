import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { schoolInfo, boardMembers } from '../../lib/mockData'
import { listSemesters } from '../../lib/supabaseClient'
import { Button } from '../../components/ui'
import { ArrowRight, Mail, Globe, CalendarDays, Target, Users } from 'lucide-react'

const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

export default function PublicAbout() {
  const [semesters, setSemesters] = useState([])
  useEffect(() => { listSemesters().then(setSemesters).catch(() => {}) }, [])
  const active = semesters.find(s => s.is_active) || semesters[0]

  return (
    <div>
      {/* Header */}
      <section className="bg-navy text-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-yellow-400 font-zh text-sm tracking-widest mb-3">{schoolInfo.nameZh}</p>
          <h1 className="font-display text-4xl md:text-5xl mb-4">About {schoolInfo.name}</h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed">
            A community dedicated to teaching Mandarin Chinese language and culture to learners of all
            ages and backgrounds{schoolInfo.founded ? `, proudly serving families since ${schoolInfo.founded}` : ''}.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-10">
        <div>
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3"><Target size={18} className="text-yellow-600" /></div>
          <h2 className="font-display text-xl text-slate-900 mb-2">Our Mission</h2>
          <p className="text-slate-500 text-sm leading-relaxed">To inspire a lifelong love of the Chinese language and culture, and to build a welcoming community where every learner can grow with confidence.</p>
        </div>
        <div>
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3"><Users size={18} className="text-yellow-600" /></div>
          <h2 className="font-display text-xl text-slate-900 mb-2">Who We Serve</h2>
          <p className="text-slate-500 text-sm leading-relaxed">Children and adults alike — beginners taking their first words, and experienced speakers deepening their fluency and connection to heritage.</p>
        </div>
        <div>
          <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mb-3"><CalendarDays size={18} className="text-yellow-600" /></div>
          <h2 className="font-display text-xl text-slate-900 mb-2">Weekend Classes</h2>
          <p className="text-slate-500 text-sm leading-relaxed">Classes are held on Sundays across language, arts, music, and more — taught by experienced, caring teachers.</p>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-slate-100/60 py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-2">Leadership</p>
            <h2 className="font-display text-3xl text-slate-900">Our Board</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {boardMembers.map((m, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-navy text-yellow-400 font-display text-xl flex items-center justify-center mx-auto mb-3">{initials(m.name)}</div>
                <p className="font-display text-lg text-slate-900">{m.name}</p>
                <p className="text-xs text-yellow-600 uppercase tracking-wide mb-2">{m.role}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-8">
          <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-2">Calendar</p>
          <h2 className="font-display text-3xl text-slate-900">Semester Dates</h2>
        </div>
        {active ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 max-w-2xl mx-auto">
            <p className="font-display text-xl text-slate-900 mb-5">{active.name}{active.academic_year ? ` · ${active.academic_year}` : ''}</p>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                ['Registration opens', active.registration_start],
                ['Registration closes', active.registration_end],
                ['Classes begin', active.class_start],
                ['Classes end', active.class_end],
              ].map(([label, d]) => (
                <div key={label} className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-900">{fmtDate(d)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-slate-400 text-sm">Semester dates will be posted soon.</p>
        )}
      </section>

      {/* Contact + CTA */}
      <section className="bg-navy text-white py-14 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl mb-3">Get in touch</h2>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-300">
              <span className="flex items-center gap-2"><Mail size={14} className="text-yellow-400" />{schoolInfo.email}</span>
              <a href={`https://${schoolInfo.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white"><Globe size={14} className="text-yellow-400" />{schoolInfo.website}</a>
            </div>
          </div>
          <Link to="/enroll"><Button variant="gold" size="lg">Enroll Today <ArrowRight size={16} /></Button></Link>
        </div>
      </section>
    </div>
  )
}
