import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import SuggestionsPanel from './SuggestionsPanel'
import QueuePanel from './QueuePanel'
import './Header.css'

const TELEGRAM_LABEL: Record<string, string> = {
  online: 'Telegram online',
  offline: 'Telegram offline (error)',
  disabled: 'Telegram disabled (no token)',
}

export default function Header() {
  const [time, setTime] = useState(new Date())
  const { online, health, suggestions, queueTasks } = useBackend()
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const status = online ? 'online' : 'offline'
  const telegramStatus = health?.telegram_status ?? 'disabled'
  const activeQueueCount = queueTasks.filter((t) => t.status === 'pending' || t.status === 'running').length
  const hasRunningTask = queueTasks.some((t) => t.status === 'running')

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="app-header">
      <div className="app-header-title">
        <span className="app-header-brand">MAT.AI</span>
        <span className="app-header-badge">OS</span>
      </div>
      <div className="app-header-tagline">One Brain. Infinite Skills. Autonomous Loops.</div>
      <div className="app-header-right">
        <div className={`status-pill ${status}`}>
          <span className="status-dot" />
          {status === 'online' ? 'Online' : 'Offline'}
        </div>
        {health?.active_model && <div className="model-pill">{health.active_model.model}</div>}

        <button
          type="button"
          className="header-icon-btn"
          onClick={() => setQueueOpen((open) => !open)}
          aria-label="Task queue"
          title="Task queue"
        >
          <span className={hasRunningTask ? 'queue-icon running' : 'queue-icon'}>🗂️</span>
          {activeQueueCount > 0 && <span className="header-icon-badge">{activeQueueCount}</span>}
        </button>

        <button
          type="button"
          className="header-icon-btn"
          onClick={() => setSuggestionsOpen((open) => !open)}
          aria-label="Proactive suggestions"
          title="Proactive suggestions"
        >
          <span className="suggestions-icon">💡</span>
          {suggestions.length > 0 && <span className="header-icon-badge">{suggestions.length}</span>}
        </button>

        <span
          className={`telegram-icon telegram-${telegramStatus}`}
          title={TELEGRAM_LABEL[telegramStatus] ?? TELEGRAM_LABEL.disabled}
          aria-label={TELEGRAM_LABEL[telegramStatus] ?? TELEGRAM_LABEL.disabled}
        >
          ✈
        </span>
        <div className="clock">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      {suggestionsOpen && <SuggestionsPanel onClose={() => setSuggestionsOpen(false)} />}
      {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
    </header>
  )
}
