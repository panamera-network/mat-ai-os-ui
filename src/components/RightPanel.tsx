import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import ChatPanel from './ChatPanel'
import SuggestionsPanel from './SuggestionsPanel'
import QueuePanel from './QueuePanel'
import GoalsPanel from './GoalsPanel'
import { API_BASE_URL } from '../config'
import './RightPanel.css'

interface IntegritySummary {
  status: string
  level?: string
}

const QUICK_CHIPS = [
  'System Summary',
  'Run Health Check',
  'Active Loops',
  'Agent Status',
  'Memory Report',
  'Open Terminal',
]

const QUICK_TOOLS = [
  { icon: '🔁', label: 'New Loop' },
  { icon: '🤖', label: 'New Agent' },
  { icon: '⚡', label: 'Add Skill' },
  { icon: '🩺', label: 'Health Check' },
  { icon: '💻', label: 'Terminal' },
]

const LOOP_STATUS_COLOR: Record<string, string> = {
  active: 'var(--accent-green)',
  paused: 'var(--accent-amber)',
  idle: 'var(--text-secondary)',
}

export default function RightPanel() {
  const { health, suggestions, queueTasks, loops } = useBackend()
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [integrity, setIntegrity] = useState<IntegritySummary | null>(null)
  const [chipMessage, setChipMessage] = useState<string | undefined>(undefined)

  const activeQueueCount = queueTasks.filter((t) => t.status === 'pending' || t.status === 'running').length
  const hasRunningTask = queueTasks.some((t) => t.status === 'running')
  const telegramStatus = health?.telegram_status ?? 'disabled'

  const activeLoops = loops.filter((l) => l.status === 'active').slice(0, 4)

  useEffect(() => {
    fetch(`${API_BASE_URL}/memory/integrity`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setIntegrity(d) })
      .catch(() => {})
  }, [])

  const integrityColor =
    integrity?.status === 'critical'
      ? 'var(--accent-red)'
      : integrity?.status === 'warning'
        ? 'var(--accent-amber)'
        : 'var(--accent-green)'

  const integrityLabel =
    integrity?.status === 'critical'
      ? 'Critical'
      : integrity?.status === 'warning'
        ? 'Warning'
        : integrity?.status
          ? 'Excellent'
          : '—'

  return (
    <aside className="right-panel">
      {/* Header */}
      <div className="ask-mat-header">
        <div className="ask-mat-avatar">🤖</div>
        <span className="ask-mat-title">ASK MAT.AI</span>
        <div className="ask-mat-actions">
          <button
            type="button"
            className="ask-mat-icon-btn"
            onClick={() => setGoalsOpen((o) => !o)}
            title="Goals"
          >
            🎯
          </button>
          <button
            type="button"
            className={`ask-mat-icon-btn ${hasRunningTask ? 'pulsing' : ''}`}
            onClick={() => setQueueOpen((o) => !o)}
            title="Task queue"
          >
            🗂️
            {activeQueueCount > 0 && <span className="ask-mat-badge">{activeQueueCount}</span>}
          </button>
          <button
            type="button"
            className="ask-mat-icon-btn"
            onClick={() => setSuggestionsOpen((o) => !o)}
            title="Suggestions"
          >
            💡
            {suggestions.length > 0 && <span className="ask-mat-badge">{suggestions.length}</span>}
          </button>
          <span
            className={`telegram-status-dot telegram-${telegramStatus}`}
            title={`Telegram ${telegramStatus}`}
          />
        </div>
      </div>

      {/* Chat */}
      <div className="ask-mat-chat">
        <ChatPanel prefillMessage={chipMessage} onPrefillConsumed={() => setChipMessage(undefined)} />
      </div>

      {/* Quick chip actions */}
      <div className="quick-chips">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            className="quick-chip"
            onClick={() => setChipMessage(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Active Loops */}
      <div className="right-section">
        <div className="right-section-title">
          ACTIVE LOOPS
          <button
            type="button"
            className="right-section-link"
            onClick={() => setQueueOpen(true)}
          >
            View All →
          </button>
        </div>
        {activeLoops.length === 0 ? (
          <div className="right-empty">No active loops</div>
        ) : (
          <div className="right-loops-list">
            {activeLoops.map((loop) => (
              <div className="right-loop-row" key={loop.id}>
                <span className="right-loop-dot" style={{ background: LOOP_STATUS_COLOR[loop.status] ?? 'var(--text-secondary)' }} />
                <span className="right-loop-name">{loop.name}</span>
                <span
                  className="right-loop-status"
                  style={{ color: LOOP_STATUS_COLOR[loop.status] ?? 'var(--text-secondary)' }}
                >
                  {loop.status === 'active' ? 'Running' : loop.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Governance */}
      <div className="right-section">
        <div className="right-section-title">
          GOVERNANCE
          <span className="right-section-badge active">Active •</span>
        </div>
        <div className="right-progress-bar">
          <div className="right-progress-fill" style={{ width: '100%', background: 'var(--accent-green)' }} />
        </div>
        <div className="right-progress-label">100%</div>
      </div>

      {/* Memory Integrity */}
      <div className="right-section">
        <div className="right-section-title">
          MEMORY INTEGRITY
          <span className="right-section-badge" style={{ color: integrityColor }}>
            {integrityLabel}
          </span>
        </div>
        <div className="right-progress-bar">
          <div
            className="right-progress-fill"
            style={{
              width: integrity?.status === 'critical' ? '30%' : integrity?.status === 'warning' ? '65%' : '100%',
              background: integrityColor,
            }}
          />
        </div>
        <div className="right-progress-label right-progress-sub">Long-Term Health Check</div>
      </div>

      {/* Quick Tools */}
      <div className="right-section quick-tools-section">
        <div className="right-section-title">QUICK TOOLS</div>
        <div className="quick-tools-row">
          {QUICK_TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className="quick-tool-btn"
              title={tool.label}
              onClick={() => setChipMessage(tool.label)}
            >
              <span className="quick-tool-icon">{tool.icon}</span>
              <span className="quick-tool-label">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Model pill */}
      {health?.active_model && (
        <div className="right-model-pill">
          <span className="right-model-dot" />
          {health.active_model.provider} · {health.active_model.model}
        </div>
      )}

      {suggestionsOpen && <SuggestionsPanel onClose={() => setSuggestionsOpen(false)} />}
      {queueOpen && <QueuePanel onClose={() => setQueueOpen(false)} />}
      {goalsOpen && <GoalsPanel onClose={() => setGoalsOpen(false)} />}
    </aside>
  )
}
