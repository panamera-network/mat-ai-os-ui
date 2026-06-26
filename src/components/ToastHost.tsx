import { useToast } from '../context/ToastContext'
import './ToastHost.css'

const ICON: Record<string, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

export default function ToastHost() {
  const { toasts, dismissToast } = useToast()

  if (toasts.length === 0) return null

  return (
    <div className="toast-host">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismissToast(t.id)}>
          <span className="toast-icon">{ICON[t.kind]}</span>
          <span className="toast-message">{t.message}</span>
        </div>
      ))}
    </div>
  )
}
