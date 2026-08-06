import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import AppRouter from './router/index.jsx'

// A password-reset link carries its token in the URL hash and should land on
// /reset-password. If Supabase's Site URL is used as the fallback (which happens
// when the redirect target isn't in the Auth "Redirect URLs" allowlist), the
// token arrives at the site root instead — and supabase-js would quietly sign
// the visitor in with a recovery session on the home page rather than letting
// them set a new password. Forward it to the reset page, hash intact, before
// the client gets a chance to consume it.
if (window.location.hash.includes('type=recovery') && window.location.pathname !== '/reset-password') {
  window.location.replace(`/reset-password${window.location.hash}`)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppRouter />
  </React.StrictMode>
)
