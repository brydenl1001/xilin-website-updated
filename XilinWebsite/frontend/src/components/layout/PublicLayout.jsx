import PublicNav from './PublicNav'

export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-navy text-white py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/XilinLogo.png" alt="" className="w-11 h-11 object-contain" />
            <div>
              <p className="font-display text-lg">Xilin<span className="text-yellow-400 font-zh"> 希林</span></p>
              <p className="text-slate-400 text-sm mt-0.5">Xilin Northwest Chinese School · Est. 1996</p>
            </div>
          </div>
          <p className="text-slate-500 text-xs">&copy; {new Date().getFullYear()} Xilin Northwest Chinese School. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
