import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { schoolInfo } from '../../lib/basicInfo'
import { listPublicAnnouncements, getPublicStats, getActiveSemester, listCalendarEvents } from '../../lib/supabaseClient'
import { Button } from '../../components/ui'
import EventCalendar, { semesterEvents } from '../../components/EventCalendar'
import { ArrowRight, Mail, Globe, BookOpen, Users, GraduationCap } from 'lucide-react'
const CAT_COLOR = { events: 'bg-amber-100 text-amber-700', academics: 'bg-blue-100 text-blue-700', general: 'bg-slate-100 text-slate-600', urgent: 'bg-red-100 text-red-700' }

const announcementImages = (a) => (a.media_urls?.length ? a.media_urls : (a.media_url ? [a.media_url] : []))

export default function Home() {
  const [publicNews, setPublicNews] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ studentCount: 0, teacherCount: 0, courseCount: 0 })
  const [calEvents, setCalEvents] = useState([])
  const [activeSem, setActiveSem] = useState(null)

  useEffect(() => {
    listPublicAnnouncements()
      .then(data => setPublicNews(data.slice(0, 3)))
      .catch(err => console.error('Failed to load announcements:', err))
      .finally(() => setLoading(false))
    getPublicStats()
      .then(setStats)
      .catch(err => console.error('Failed to load stats:', err))
    getActiveSemester().then(setActiveSem).catch(() => {})
    listCalendarEvents().then(setCalEvents).catch(() => {})
  }, [])

  const calendarEvents = [
    ...semesterEvents(activeSem),
    ...calEvents.map(e => ({ date: e.event_date, endDate: e.end_date, title: e.title, category: e.category, description: e.description })),
  ]
  const calInitial = activeSem?.registration_start || calEvents[0]?.event_date || undefined

  return (
    <div>
      {/* Hero */}
      <section className="bg-navy text-white py-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-yellow-400/10 -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-white/3 translate-y-1/2 -translate-x-1/4" />
        </div>
        <div className="max-w-6xl mx-auto relative">
          <p className="text-yellow-400 font-zh text-sm tracking-widest font-medium mb-4">{schoolInfo.nameZh}</p>
          <h1 className="font-display text-5xl md:text-6xl leading-tight max-w-2xl mb-6">
            {schoolInfo.tagline}
          </h1>
          <p className="text-slate-300 text-lg max-w-xl mb-8 leading-relaxed">
            {schoolInfo.name} welcomes students and families of every background to learn Mandarin
            Chinese and explore Chinese culture together — in a warm, supportive community.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/enroll">
              <Button variant="gold" size="lg">Enroll in a Class <ArrowRight size={16} /></Button>
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
            { label: 'Dedicated Teachers', value: stats.teacherCount.toLocaleString(), Icon: Users },
            { label: 'Classes Offered', value: stats.courseCount.toLocaleString(), Icon: GraduationCap },
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

      {/* About + Mission */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-3">About Our School</p>
          <h2 className="font-display text-3xl text-slate-900 mb-5 leading-snug">Nurturing language, heritage, and community</h2>
          <p className="text-slate-500 leading-relaxed mb-4">
            {schoolInfo.name} offers weekend Mandarin classes for learners of all ages and levels —
            from first words to fluent conversation. Our curriculum pairs language study with the art,
            traditions, and stories that bring Chinese culture to life.
          </p>
          <p className="text-slate-500 leading-relaxed mb-6">
            Taught by experienced, caring teachers, every class is a place where students build
            confidence, make friends, and stay connected to their heritage.
          </p>
          <Link to="/classes">
            <Button variant="secondary" size="sm">Explore Our Classes <ArrowRight size={14} /></Button>
          </Link>
        </div>
        <div className="bg-navy rounded-2xl p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-yellow-400/10" />
          <p className="text-yellow-400 text-xs uppercase tracking-widest mb-4">Our Mission</p>
          <p className="font-display text-lg leading-relaxed text-white/90 mb-6 italic">
            "To inspire a lifelong love of the Chinese language and culture, and to build a welcoming
            community where every learner — child or adult — can grow with confidence."
          </p>
          <p className="text-white font-medium text-sm">{schoolInfo.name}</p>
          <p className="text-white/40 font-zh text-xs mt-0.5">{schoolInfo.nameZh}</p>
        </div>
      </section>

      {/* Calendar */}
      <section className="bg-slate-100/60 py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-yellow-600 text-xs uppercase tracking-widest font-medium mb-1">Dates</p>
              <h2 className="font-display text-2xl text-slate-900">School Calendar</h2>
            </div>
            {activeSem && <span className="text-sm text-slate-400">{activeSem.name}</span>}
          </div>
          <EventCalendar key={calInitial || 'cal'} events={calendarEvents} initialDate={calInitial} />
        </div>
      </section>

      {/* Latest News */}
      <section className="py-16 px-6">
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
            ) : publicNews.map(ann => {
              const imgs = announcementImages(ann)
              return (
              <Link key={ann.id} to="/news" className="bg-white rounded-xl border border-slate-200 hover:border-yellow-300 transition-colors cursor-pointer overflow-hidden flex flex-col">
                {imgs[0] && <img src={imgs[0]} alt="" className="w-full h-40 object-cover" />}
                <div className="p-5 flex-1">
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
              </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-3xl text-slate-900 mb-4">Ready to join {schoolInfo.shortName}?</h2>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">Enrollment is open for new students and families. Browse the catalog and apply online today.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/enroll">
            <Button variant="gold" size="lg">Start Application</Button>
          </Link>
          <a href={`mailto:${schoolInfo.email}`}>
            <Button variant="outline" size="lg">Contact Us</Button>
          </a>
        </div>
      </section>

      {/* Contact bar */}
      <section className="bg-navy text-white py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-8 justify-center md:justify-start text-sm text-slate-300">
          <span className="flex items-center gap-2"><Mail size={14} className="text-yellow-400" />{schoolInfo.email}</span>
          <a href={`https://${schoolInfo.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
            <Globe size={14} className="text-yellow-400" />{schoolInfo.website}
          </a>
          <span className="flex items-center gap-2 font-zh">{schoolInfo.nameZh}</span>
        </div>
      </section>
    </div>
  )
}
