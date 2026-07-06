import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { Button, Modal } from '../components/ui'

// In-app replacements for window.alert / window.confirm:
//   const { toast, confirm } = useFeedback()
//   toast.success('Saved.') / toast.error('Something failed.')
//   if (!(await confirm({ message: 'Delete this?', danger: true }))) return

const FeedbackContext = createContext(null)

let nextId = 1

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [dialog, setDialog] = useState(null) // { title, message, confirmLabel, cancelLabel, danger }
  const resolver = useRef(null)

  const dismiss = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), [])

  const push = useCallback((type, message) => {
    const id = nextId++
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const toast = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  }

  const confirm = useCallback((opts) => {
    const o = typeof opts === 'string' ? { message: opts } : opts
    return new Promise((resolve) => {
      resolver.current = resolve
      setDialog({ title: 'Please confirm', confirmLabel: 'Confirm', cancelLabel: 'Cancel', danger: false, ...o })
    })
  }, [])

  const settle = (result) => {
    setDialog(null)
    resolver.current?.(result)
    resolver.current = null
  }

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      {toasts.length > 0 && createPortal(
        <div className="fixed top-4 right-4 z-[70] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]">
          {toasts.map(t => (
            <div key={t.id} role="status"
              className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 shadow-lg bg-white animate-fade-in ${
                t.type === 'success' ? 'border-green-200' : 'border-red-200'
              }`}>
              {t.type === 'success'
                ? <CheckCircle size={16} className="text-green-600 flex-shrink-0 mt-0.5" />
                : <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />}
              <p className="text-sm text-slate-700 flex-1 min-w-0 break-words">{t.message}</p>
              <button onClick={() => dismiss(t.id)} aria-label="Dismiss"
                className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer flex-shrink-0">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}

      {/* Confirm dialog */}
      <Modal open={!!dialog} onClose={() => settle(false)} title={dialog?.title || 'Please confirm'} maxWidth="max-w-md">
        {dialog && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">{dialog.message}</p>
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Button variant={dialog.danger ? 'danger' : 'gold'} size="sm" onClick={() => settle(true)}>
                {dialog.confirmLabel}
              </Button>
              <Button variant="outline" size="sm" onClick={() => settle(false)}>{dialog.cancelLabel}</Button>
            </div>
          </div>
        )}
      </Modal>
    </FeedbackContext.Provider>
  )
}

export const useFeedback = () => useContext(FeedbackContext)
