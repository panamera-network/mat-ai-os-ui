import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import ProfilePanel from './ProfilePanel'
import GoalsPanel from './GoalsPanel'
import './Header.css'

export default function Header() {
  const [time, setTime] = useState(new Date())
  const [profileOpen, setProfileOpen] = useState(false)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const { online } = useBackend()
  const status = online ? 'online' : 'offline'

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
        <button type="button" className="profile-btn" onClick={() => setGoalsOpen(true)}>
          Goals
        </button>
        <button type="button" className="profile-btn" onClick={() => setProfileOpen(true)}>
          Profile
        </button>
        <div className={`status-pill ${status}`}>
          <span className="status-dot" />
          {status === 'online' ? 'Online' : 'Offline'}
        </div>
        <div className="clock">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>
      {profileOpen && <ProfilePanel onClose={() => setProfileOpen(false)} />}
      {goalsOpen && <GoalsPanel onClose={() => setGoalsOpen(false)} />}
    </header>
  )
}
