import { useBackend } from '../context/BackendContext'
import './QueuePanel.css'

interface QueuePanelProps {
  onClose: () => void
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

export default function QueuePanel({ onClose }: QueuePanelProps) {
  const { queueTasks } = useBackend()

  return (
    <>
      <div className="queue-backdrop" onClick={onClose} />
      <div className="queue-panel">
        <div className="queue-panel-header">
          <h3>Task Queue</h3>
          <button type="button" className="queue-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="queue-list">
          {queueTasks.length === 0 && <div className="queue-empty">No tasks in the queue.</div>}
          {queueTasks.map((t) => (
            <div className={`queue-task-card status-${t.status}`} key={t.id}>
              <div className="queue-task-top">
                <span className={`queue-status-badge status-${t.status}`}>
                  {t.status === 'running' && <span className="queue-running-dot" />}
                  {t.status}
                </span>
                <span className="queue-task-time">{formatTime(t.started_at ?? t.created_at)}</span>
              </div>
              <div className="queue-task-text">{t.task}</div>
              <div className="queue-task-meta">
                <span>Priority: {t.priority}</span>
                <span>Agent: —</span>
              </div>
              {t.error && <div className="queue-task-error">{t.error}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
