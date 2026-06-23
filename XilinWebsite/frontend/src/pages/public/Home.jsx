import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { schoolInfo } from '../../lib/mockData'
import { listPublicAnnouncements, getPublicStats } from '../../lib/supabaseClient'
import { Badge, Button } from '../../components/ui'
import { ArrowRight, MapPin, Phone, Mail, BookOpen, Users, Award } from 'lucide-react'
const CAT_COLOR = { events: 'bg-amber-100 text-amber-700', academics: 'bg-blue-100 text-blue-700', general: 'bg-slate-100 text-slate-600', urgent: 'bg-red-100 text-red-700' }

export default function Home() {
  const [publicNews, setPublicNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ studentCount: 0, teacherCount: 0 })

  useEffect(() => {
    listPublicAnnouncements()
      .then(data => setPublicNews(data.slice(0, 3)))
      .catch(err => console.error('Failed to load announcements:', err))
      .finally(() => setLoading(false))
    getPublicStats()
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err))
  }, [])

  return (
    <div>
      {/* Hero */}
      <section className="bg-slate-900 text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-yellow-400/5 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/3 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <p className="text-yellow-400 text-xs uppercase tracking-widest font-medium mb-4">Est. {schoolInfo.founded}</p>
          <h1 className="font-display text-5xl md:text-6xl leading-tight max-w-2xl mb-6">
            {schoolInfo.tagline}
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mb-8 leading-relaxed">
            A premier institution dedicated to academic excellence, character development, and preparing students for the world ahead.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/enroll">
              <Button variant="gold" size="lg">Apply for Admission <ArrowRight size={16} /></Button>
            </Link>
            <Link to="/news">
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">Latest News</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-3 gap-8">
          {[
            { label: 'Students Enrolled', value: stats.studentCount.toLocaleString(), Icon: BookOpen },
            { label: 'Expert Faculty', value: stats.teacherCount.toLocaleString(), Icon: Users },
            { label: 'Years of Excellence', value: `${new Date().getFullYear() - schoolInfo.founded}+`, Icon: Award },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="w-10 h-10 rounded-xl bg-yellow-50 flex items-center justify-center mx-auto mb-3">
                <s.Icon size={18} className="text-yellow-600" />
              </div>
              <p className="font-display text-3xl text-slate-900">{s.value}</p>
              <p className="text-sm text-slate-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* About + Principal */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">About Academia</p>
          <h2 className="font-display text-3xl text-slate-900 mb-5 leading-snug">A tradition of excellence for over three decades</h2>
          <p className="text-slate-500 leading-relaxed mb-4">
            Founded in {schoolInfo.founded}, Academia has grown into one of Chicago's most respected educational institutions. Our curriculum blends rigorous academics with arts, technology, and character-building programmes.
          </p>
          <p className="text-slate-500 leading-relaxed mb-6">
            With a 99% graduation rate and dedicated faculty, we ensure every student is equipped to pursue their ambitions with confidence and clarity.
          </p>
          <Link to="/classes">
            <Button variant="secondary" size="sm">Explore Our Classes <ArrowRight size={14} /></Button>
          </Link>
        </div>
        <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-yellow-400/5" />
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-4">From the Principal</p>
          <p className="font-display text-lg leading-relaxed text-white/90 mb-6 italic">
            "At Academia, we believe every student carries unique potential. Our mission is to create the environment in which that potential flourishes — academically, personally, and socially."
          </p>
          <p className="text-white font-medium text-sm">{schoolInfo.principalName}</p>
          <p className="text-white/40 text-xs mt-0.5">Principal, Academia</p>
        </div>
      </section>

      {/* Latest News */}
      <section className="bg-slate-100/60 py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-1">Latest</p>
              <h2 className="font-display text-2xl text-slate-900">News & Announcements</h2>
            </div>
            <Link to="/news" className="text-sm text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {loading ? (
              <p className="text-slate-400 text-sm col-span-3 text-center py-8">Loading announcements…</p>
            ) : publicNews.length === 0 ? (
              <p className="text-slate-400 text-sm col-span-3 text-center py-8">No announcements yet.</p>
            ) : publicNews.map(ann => (
              <div key={ann.id} className="bg-white rounded-xl p-5 border border-slate-200 hover:border-yellow-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${CAT_COLOR[ann.category]}`}>
                    {ann.category}
                  </span>
                  <span className="text-xs text-slate-400">{ann.published_at?.slice(0, 10)}</span>
                </div>
                <h3 className="font-display text-[15px] text-slate-900 leading-snug mb-2">{ann.title}</h3>
                <p className="text-sm text-slate-500 line-clamp-2">{ann.body}</p>
                <p className="text-xs text-slate-400 mt-3">{ann.profiles?.full_name || 'School Office'}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl text-slate-900 mb-4">Ready to join Academia?</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">Applications for the 2026–27 academic year are open. Begin your journey today.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/enroll">
            <Button variant="gold" size="lg">Start Application</Button>
          </Link>
          <a href={`mailto:${schoolInfo.email}`}>
            <Button variant="outline" size="lg">Contact Admissions</Button>
          </a>
        </div>
      </section>

      {/* Contact bar */}
      <section className="bg-slate-900 text-white py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-8 justify-center md:justify-start text-sm text-slate-400">
          <span className="flex items-center gap-2"><MapPin size={14} className="text-yellow-400" />{schoolInfo.address}</span>
          <span className="flex items-center gap-2"><Phone size={14} className="text-yellow-400" />{schoolInfo.phone}</span>
          <span className="flex items-center gap-2"><Mail size={14} className="text-yellow-400" />{schoolInfo.email}</span>
        </div>
      </section>
    </div>
  )
}
