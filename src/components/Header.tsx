import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import SettingsPanel from './SettingsPanel'
import NotificationCenter from './NotificationCenter'
import type { WorkspaceView } from '../App'
import './Header.css'

interface HeaderProps {
  view: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
}

export default function Header({ view, onViewChange }: HeaderProps) {
  const [time, setTime] = useState(new Date())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { online, unreadNotificationCount } = useBackend()

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <header className="app-header">
      {/* LEFT: Brand */}
      <div className="header-brand">
        <div className="header-logo">M</div>
        <div className="header-brand-text">
          <div className="header-brand-name">
            MAT.AI <span className="header-brand-os">OS</span>
          </div>
          <div className="header-brand-tagline">One Brain. Infinite Skills. Autonomous Loops.</div>
        </div>
      </div>

      {/* CENTER: Nav tabs */}
      <nav className="header-nav">
        <button
          type="button"
          className={`header-nav-btn ${view === 'creator' ? 'active' : ''}`}
          onClick={() => onViewChange('creator')}
        >
          <span className="header-nav-icon">&lt;/&gt;</span>
          Creator
        </button>
        <button
          type="button"
          className={`header-nav-btn ${view === 'dev' ? 'active' : ''}`}
          onClick={() => onViewChange('dev')}
        >
          <span className="header-nav-icon">⚡</span>
          Dev
        </button>
        <button
          type="button"
          className={`header-nav-btn control ${view === 'control' ? 'active' : ''}`}
          onClick={() => onViewChange('control')}
        >
          <span className="header-nav-icon">🚀</span>
          Control Center
        </button>
      </nav>

      {/* RIGHT: Status + Time + Actions */}
      <div className="header-right">
        <div className="header-status">
          <span className={`header-status-dot ${online ? 'online' : 'offline'}`} />
          <div className="header-status-text">
            <span className="header-status-label">{online ? 'Online' : 'Offline'}</span>
            <span className="header-status-sub">{online ? 'System Healthy' : 'Backend unreachable'}</span>
          </div>
        </div>

        <div className="header-time-block">
          <div className="header-clock">{timeStr}</div>
          <div className="header-date">{dateStr}</div>
        </div>

        <button
          type="button"
          className="header-action-btn"
          onClick={() => setNotifOpen((o) => !o)}
          aria-label="Notifications"
        >
          🔔
          {unreadNotificationCount > 0 && (
            <span className="header-action-badge">{unreadNotificationCount}</span>
          )}
        </button>

        <button
          type="button"
          className="header-action-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
    </header>
  )
}
