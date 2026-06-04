import PublicNav from './PublicNav'

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-slate-900 text-white py-10 mt-16">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg">Aca<span className="text-yellow-400">demia</span></p>
            <p className="text-slate-400 text-sm mt-0.5">42 Elmwood Avenue, Chicago, IL 60601</p>
          </div>
          <p className="text-slate-500 text-xs">© 2026 Academia. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
