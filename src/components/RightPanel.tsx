import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import ChatPanel from './ChatPanel'
import SuggestionsPanel from './SuggestionsPanel'
import QueuePanel from './QueuePanel'
import GoalsPanel from './GoalsPanel'
import './RightPanel.css'

const MEDIA_TOOLS = [
  { icon: '📎', label: 'Attach' },
  { icon: '🎤', label: 'Voice' },
  { icon: '👁', label: 'Vision' },
  { icon: '🔌', label: 'MCP' },
]

const ACTION_TOOLS = [
  { icon: '🔁', label: 'New Loop' },
  { icon: '🤖', label: 'New Agent' },
  { icon: '⚡', label: 'Add Skill' },
  { icon: '🩺', label: 'Health Check' },
  { icon: '💻', label: 'Terminal' },
]

function Waveform({ active }: { active: boolean }) {
  const bars = [3, 6, 10, 14, 10, 16, 8, 12, 6, 10, 14, 8, 4, 10, 6]
  return (
    <div className={`rp-waveform ${active ? 'active' : ''}`}>
      {bars.map((h, i) => (
        <span key={i} className="rp-wave-bar" style={{ '--i': i, '--base': `${h}px` } as React.CSSProperties} />
      ))}
    </div>
  )
}

export default function RightPanel() {
  const { health, online, suggestions, queueTasks } = useBackend()
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [chipMessage, setChipMessage] = useState<string | undefined>(undefined)

  const activeQueueCount = queueTasks.filter(t => t.status === 'pending' || t.status === 'running').length
  const hasRunningTask = queueTasks.some(t => t.status === 'running')
  const telegramStatus = health?.telegram_status ?? 'disabled'

  return (
    <aside className="right-panel">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="rp-header">
        <div className="rp-avatar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="3" fill="#a78bfa"/>
            <path d="M5 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <div className="rp-identity">
          <span className="rp-name">MAT</span>
          <span className={`rp-status ${online ? 'online' : ''}`}>{online ? 'Online' : 'Offline'}</span>
        </div>

        <Waveform active={online} />

        <div className="rp-actions">
          <button type="button" className="rp-icon-btn" onClick={() => setGoalsOpen(o => !o)} title="Goals">🎯</button>
          <button
            type="button"
            className={`rp-icon-btn ${hasRunningTask ? 'pulsing' : ''}`}
            onClick={() => setQueueOpen(o => !o)}
            title="Task queue"
          >
            🗂️
            {activeQueueCount > 0 && <span className="rp-badge">{activeQueueCount}</span>}
          </button>
          <button type="button" className="rp-icon-btn" onClick={() => setSuggestionsOpen(o => !o)} title="Suggestions">
            💡
            {suggestions.length > 0 && <span className="rp-badge">{suggestions.length}</span>}
          </button>
          <span className={`rp-telegram telegram-${telegramStatus}`} title={`Telegram ${telegramStatus}`} />
        </div>
      </div>

      {/* ── CHAT ───────────────────────────────────────────────── */}
      <div className="rp-chat">
        <ChatPanel prefillMessage={chipMessage} onPrefillConsumed={() => setChipMessage(undefined)} />
      </div>

      {/* ── MODEL PILL ─────────────────────────────────────────── */}
      {health?.active_model && (
        <div className="rp-model-pill">
          <span className="rp-model-dot" />
          {health.active_model.provider} · {health.active_model.model}
        </div>
      )}

      {suggestionsOpen && <SuggestionsPanel onClose={() => setSuggestionsOpen(false)} />}
      {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
      {goalsOpen && <GoalsPanel onClose={() => setGoalsOpen(false)} />}
    </aside>
  )
}
