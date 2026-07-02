import { useBackend, type NotificationType } from '../context/BackendContext'
import './NotificationCenter.css'

interface NotificationCenterProps {
  onClose: () => void
}

const TYPE_ICON: Record<NotificationType, string> = {
  task_queued: '🗂️',
  task_completed: '✅',
  task_failed: '⚠️',
  loop_triggered: '🔁',
  loop_completed: '🔁',
  agent_active: '🤖',
  agent_idle: '😴',
  suggestion: '💡',
  alert: '🚨',
  system_notification: '🔔',
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, dismissNotification, pinNotification, markAllNotificationsRead } = useBackend()

  return (
    <>
      <div className="notif-backdrop" onClick={onClose} />
      <div className="notif-panel">
        <div className="notif-panel-header">
          <h3>Notifications</h3>
          <div className="notif-header-actions">
            <button type="button" className="notif-mark-read-btn" onClick={markAllNotificationsRead}>
              Mark all read
            </button>
            <button type="button" className="notif-close-btn" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
        </div>
        <div className="notif-list">
          {notifications.length === 0 && <div className="notif-empty">No notifications yet.</div>}
          {notifications.map((n) => (
            <div key={n.id} className={`notif-card ${n.read ? '' : 'unread'}`}>
              <span className="notif-icon">{TYPE_ICON[n.type] ?? '🔔'}</span>
              <div className="notif-body">
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">{formatTime(n.timestamp)}</div>
              </div>
              <div className="notif-actions">
                <button
                  type="button"
                  className={`notif-pin-btn ${n.pinned ? 'pinned' : ''}`}
                  onClick={() => pinNotification(n.id)}
                  aria-label="Pin notification"
                  title="Pin (prevents auto-dismiss)"
                >
                  📌
                </button>
                <button
                  type="button"
                  className="notif-dismiss-btn"
                  onClick={() => dismissNotification(n.id)}
                  aria-label="Dismiss notification"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
