import { useState } from 'react'
import { useBackend } from '../context/BackendContext'
import MemorySystem from './MemorySystem'
import ChatPanel from './ChatPanel'
import SuggestionsPanel from './SuggestionsPanel'
import QueuePanel from './QueuePanel'
import './RightPanel.css'

const TELEGRAM_LABEL: Record<string, string> = {
  online: 'Telegram online',
  offline: 'Telegram offline (error)',
  disabled: 'Telegram disabled (no token)',
}

export default function RightPanel() {
  const { health, suggestions, queueTasks } = useBackend()
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const telegramStatus = health?.telegram_status ?? 'disabled'
  const activeQueueCount = queueTasks.filter((t) => t.status === 'pending' || t.status === 'running').length
  const hasRunningTask = queueTasks.some((t) => t.status === 'running')

  return (
    <aside className="right-panel">
      <div className="right-panel-header">
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
      </div>

      <MemorySystem />
      <ChatPanel />

      {suggestionsOpen && <SuggestionsPanel onClose={() => setSuggestionsOpen(false)} />}
      {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
    </aside>
  )
}
