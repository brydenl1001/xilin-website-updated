import { Link } from 'react-router-dom'
import { Button } from '../../components/ui'
import { Home, LogIn } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto px-6 py-24 text-center">
      <p className="font-display text-7xl text-navy mb-2">404</p>
      <h1 className="font-display text-2xl text-slate-900 mb-3">Page not found</h1>
      <p className="text-slate-500 mb-8 leading-relaxed">
        That page doesn't exist or may have moved. If you're looking for your
        family, teacher, or admin portal, sign in below.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/"><Button variant="gold"><Home size={15} /> Go Home</Button></Link>
        <Link to="/login"><Button variant="outline"><LogIn size={15} /> Sign In</Button></Link>
      </div>
    </div>
  )
}
