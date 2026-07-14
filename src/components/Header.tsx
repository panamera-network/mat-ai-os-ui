import { useEffect, useRef, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import { useLauncher } from '../context/LauncherContext'
import SettingsPanel from './SettingsPanel'
import NotificationCenter from './NotificationCenter'
import type { WorkspaceView } from '../App'
import './Header.css'

interface HeaderProps {
  view: WorkspaceView
  onViewChange: (view: WorkspaceView) => void
}

const MAX_HISTORY = 24

function Sparkline({ values, warn }: { values: number[]; warn: boolean }) {
  if (values.length < 2) return <div className="sparkline-placeholder" />
  const w = 64
  const h = 24
  const pts = values.map((v, i) => {
    const x = (i / (MAX_HISTORY - 1)) * w
    const y = h - (Math.max(0, Math.min(100, v)) / 100) * h
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const color = warn ? 'var(--accent-amber)' : '#a78bfa'
  const fillPts = [`0,${h}`, ...pts, `${w},${h}`].join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="sparkline-svg" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${warn}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={fillPts} fill={`url(#sg-${warn})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatCard({ label, value, warn, history }: {
  label: string; value: number; warn: boolean; history: number[]
}) {
  return (
    <div className={`hdr-stat-card ${warn ? 'warn' : ''}`}>
      <div className="hdr-stat-top">
        <span className="hdr-stat-label">{label}</span>
        <span className="hdr-stat-value">{value.toFixed(0)}<span className="hdr-stat-unit">%</span></span>
      </div>
      <Sparkline values={history} warn={warn} />
    </div>
  )
}

export default function Header({ view, onViewChange }: HeaderProps) {
  const [time, setTime] = useState(new Date())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const { online, unreadNotificationCount } = useBackend()
  const { health: lh } = useLauncher()

  const cpuH  = useRef<number[]>([])
  const ramH  = useRef<number[]>([])
  const swapH = useRef<number[]>([])
  const diskH = useRef<number[]>([])
  const [, forceRender] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!lh) return
    const push = (r: React.MutableRefObject<number[]>, v: number) => {
      r.current = [...r.current, v].slice(-MAX_HISTORY)
    }
    push(cpuH,  lh.cpu_percent)
    push(ramH,  lh.ram_percent)
    push(swapH, lh.swap_percent ?? 0)
    push(diskH, lh.disk_percent)
    forceRender(n => n + 1)
  }, [lh])

  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = time.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <header className="app-header">

      {/* ── GROUP 1: Logo ─────────────────────────────── */}
      <div className="hdr-group hdr-logo-group">
        <div className="hdr-logo-mark">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <defs>
              <linearGradient id="lg-a" x1="0" y1="0" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                <stop stopColor="#c084fc"/>
                <stop offset="1" stopColor="#60a5fa"/>
              </linearGradient>
              <linearGradient id="lg-m" x1="5" y1="8" x2="25" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e2d9ff"/>
                <stop offset="1" stopColor="#93c5fd"/>
              </linearGradient>
              <filter id="lg-glow">
                <feGaussianBlur stdDeviation="1.5" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            {/* Hexagon background */}
            <path d="M15 2L27 8.5V21.5L15 28L3 21.5V8.5L15 2Z" stroke="url(#lg-a)" strokeWidth="1.2" strokeLinejoin="round" fill="rgba(139,92,246,0.1)"/>
            {/* Bold M letterform */}
            <path d="M7 21V9L15 17L23 9V21" stroke="url(#lg-m)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" filter="url(#lg-glow)"/>
          </svg>
        </div>
        <div className="hdr-logo-text">
          <span className="hdr-logo-name">MAT<span className="hdr-logo-dot">.</span>AI <span className="hdr-logo-os">OS</span></span>
          <span className="hdr-logo-tag">One Brain. Infinite Skills.</span>
        </div>
      </div>

      {/* ── GROUP 2: PC Health ────────────────────────── */}
      <div className="hdr-group hdr-health-group">
        {lh ? (
          <>
            <StatCard label="CPU"  value={lh.cpu_percent}        warn={lh.cpu_percent > 80}         history={cpuH.current} />
            <StatCard label="RAM"  value={lh.ram_percent}        warn={lh.ram_percent > 85}         history={ramH.current} />
            <StatCard label="SWAP" value={lh.swap_percent ?? 0}  warn={(lh.swap_percent??0) > 70}   history={swapH.current} />
            <StatCard label="DISK" value={lh.disk_percent}       warn={lh.disk_percent > 90}        history={diskH.current} />
          </>
        ) : (
          <span className="hdr-health-offline">Launcher offline</span>
        )}
      </div>

      {/* ── GROUP 3: Nav ──────────────────────────────── */}
      <div className="hdr-group hdr-nav-group">
        <button type="button"
          className={`hdr-nav-btn ${view === 'creator' ? 'active' : ''}`}
          onClick={() => onViewChange('creator')}>
          <span className="hdr-nav-icon">&lt;/&gt;</span> Creator
        </button>
        <button type="button"
          className={`hdr-nav-btn ${view === 'dev' ? 'active' : ''}`}
          onClick={() => onViewChange('dev')}>
          <span className="hdr-nav-icon">⚡</span> Dev
        </button>
        <button type="button"
          className={`hdr-nav-btn hdr-nav-control ${view === 'control' ? 'active' : ''}`}
          onClick={() => onViewChange('control')}>
          <span className="hdr-nav-icon">🚀</span> Control Center
        </button>
      </div>

      {/* ── GROUP 4: Status + Time + Actions ─────────── */}
      <div className="hdr-group hdr-right-group">
        <div className="hdr-status-card">
          <span className={`hdr-status-dot ${online ? 'online' : ''}`} />
          <div className="hdr-status-text">
            <span className="hdr-status-label">{online ? 'Online' : 'Offline'}</span>
            <span className="hdr-status-sub">{online ? 'System Healthy' : 'Unreachable'}</span>
          </div>
        </div>

        <div className="hdr-time-card">
          <span className="hdr-time-icon">🕐</span>
          <div className="hdr-time-text">
            <span className="hdr-clock">{timeStr}</span>
            <span className="hdr-date">{dateStr}</span>
          </div>
        </div>

        <button type="button" className="hdr-action-btn" onClick={() => setNotifOpen(o => !o)} aria-label="Notifications">
          🔔
          {unreadNotificationCount > 0 && (
            <span className="hdr-action-badge">{unreadNotificationCount}</span>
          )}
        </button>

        <button type="button" className="hdr-action-btn" onClick={() => setSettingsOpen(true)} aria-label="Settings">
          ⚙️
        </button>
      </div>

      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      {notifOpen && <NotificationCenter onClose={() => setNotifOpen(false)} />}
    </header>
  )
}
