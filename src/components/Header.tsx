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
  const status = online ? 'online' : 'offline'
  const inCreator = view === 'creator'
  const inDev = view === 'dev'

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="app-header">
      <div className="app-header-center">
        <div className="app-header-title">
          <span className="app-header-brand">MAT.AI</span>
          <span className="app-header-badge">OS</span>
        </div>
        <div className="app-header-tagline">One Brain. Infinite Skills. Autonomous Loops.</div>
      </div>
      <div className="app-header-right">
        <button
          type="button"
          className={`creator-toggle-btn ${inCreator ? 'active' : ''}`}
          onClick={() => onViewChange(inCreator ? 'brain' : 'creator')}
          title={inCreator ? 'Back to Brain' : 'Open Creator workspace'}
        >
          {inCreator ? '🏠 Home' : '🎬 Creator'}
        </button>
        <button
          type="button"
          className={`creator-toggle-btn ${inDev ? 'active' : ''}`}
          onClick={() => onViewChange(inDev ? 'brain' : 'dev')}
          title={inDev ? 'Back to Brain' : 'Open Dev workspace'}
        >
          {inDev ? '🏠 Home' : '🛠️ Dev'}
        </button>
        <button
          type="button"
          className="header-bell-btn"
          onClick={() => setNotifOpen((open) => !open)}
          aria-label="Notifications"
          title="Notifications"
        >
          🔔
          {unreadNotificationCount > 0 && <span className="header-icon-badge">{unreadNotificationCount}</span>}
        </button>
        <button
          type="button"
          className="header-bell-btn"
          onClick={() => setSettingsOpen(true)}
          aria-label="Settings"
          title="Settings"
        >
          ⚙️
        </button>
        <div className={`status-pill ${status}`}>
          <span className="status-dot" />
          {status === 'online' ? 'Online' : 'Offline'}
        </div>
        <div className="clock">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
    </header>
  )
}
