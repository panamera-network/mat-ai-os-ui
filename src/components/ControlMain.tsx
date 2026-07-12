import { useEffect, useRef, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import { useLauncher, type ServiceState } from '../context/LauncherContext'
import BrainView from './BrainView'
import SkillsLibrary from './SkillsLibrary'
import LeftPanel from './LeftPanel'
import './ControlMain.css'

// ── Sparkline (line chart) ──────────────────────────────────────────────────
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) {
    return <svg width="60" height="24" />
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 60
  const H = 24
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * W,
    y: H - ((v - min) / range) * H * 0.75 - H * 0.1,
  }))
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Mini bar chart ──────────────────────────────────────────────────────────
function BarChart({ value, max, color }: { value: number; max: number; color: string }) {
  const bars = 5
  const filled = Math.round((value / Math.max(max, 1)) * bars)
  return (
    <div className="bar-chart">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="bar-chart-bar"
          style={{
            background: i < filled ? color : 'rgba(255,255,255,0.07)',
            height: `${50 + i * 10}%`,
          }}
        />
      ))}
    </div>
  )
}

// ── PC Health card ──────────────────────────────────────────────────────────
interface HealthCardProps {
  icon: string
  label: string
  value: string
  sub?: string
  badge?: string
  badgeColor?: string
  sparkData?: number[]
  sparkColor?: string
  barValue?: number
  barMax?: number
  barColor?: string
}

function HealthCard({ icon, label, value, sub, badge, badgeColor, sparkData, sparkColor = '#22c55e', barValue, barMax, barColor }: HealthCardProps) {
  return (
    <div className="health-card">
      <div className="health-card-top">
        <span className="health-card-icon">{icon}</span>
        <span className="health-card-label">{label}</span>
      </div>
      <div className="health-card-value">{value}</div>
      {sub && <div className="health-card-sub">{sub}</div>}
      {badge && (
        <div className="health-card-badge" style={{ color: badgeColor ?? 'var(--text-secondary)' }}>
          {badge}
        </div>
      )}
      <div className="health-card-chart">
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} color={sparkColor} />
        )}
        {barValue !== undefined && barMax !== undefined && (
          <BarChart value={barValue} max={barMax} color={barColor ?? '#22c55e'} />
        )}
      </div>
    </div>
  )
}

// ── Service card ────────────────────────────────────────────────────────────
function ServiceCard({ service }: { service: ServiceState }) {
  const { startService, stopService, restartService, pendingAction } = useLauncher()
  const busy = pendingAction === service.id || service.status === 'starting' || service.status === 'restarting'
  const online = service.status === 'online'

  return (
    <div className={`ctrl-service-card status-${service.status}`}>
      <div className="ctrl-service-head">
        <span className="ctrl-service-icon">⬡</span>
        <div className="ctrl-service-info">
          <span className="ctrl-service-name">{service.name}</span>
          <span className="ctrl-service-port">Port {service.port}</span>
        </div>
        <span className={`ctrl-service-badge status-${service.status}`}>
          {service.status === 'online' ? 'Online' : service.status === 'starting' ? 'Starting...' : service.status === 'restarting' ? 'Restarting...' : service.status === 'error' ? 'Error' : 'Offline'}
        </span>
      </div>
      {service.last_error && <div className="ctrl-service-error">{service.last_error}</div>}
      <div className="ctrl-service-actions">
        <button type="button" disabled={busy || online} onClick={() => startService(service.id)}>
          Start
        </button>
        <button type="button" disabled={busy || !online} onClick={() => stopService(service.id)}>
          Stop
        </button>
        <button type="button" disabled={busy || !online} onClick={() => restartService(service.id)}>
          Restart
        </button>
      </div>
    </div>
  )
}

// ── Main ControlMain ────────────────────────────────────────────────────────
export default function ControlMain() {
  const { health, loops, agents } = useBackend()
  const { reachable, health: lh } = useLauncher()
  const [coreOpen, setCoreOpen] = useState(false)

  // Rolling history buffers for sparklines
  const [cpuHistory, setCpuHistory] = useState<number[]>([])
  const [ramHistory, setRamHistory] = useState<number[]>([])
  const [diskHistory, setDiskHistory] = useState<number[]>([])
  const prevLh = useRef<typeof lh>(null)

  useEffect(() => {
    if (!lh || lh === prevLh.current) return
    prevLh.current = lh
    setCpuHistory((p) => [...p.slice(-9), lh.cpu_percent])
    setRamHistory((p) => [...p.slice(-9), lh.ram_percent])
    setDiskHistory((p) => [...p.slice(-9), lh.disk_percent])
  }, [lh])

  const totalMemory = health?.memory_tiers
    ? Object.values(health.memory_tiers).reduce((a, b) => a + b, 0)
    : null
  const activeLoopsCount = loops.filter((l) => l.status === 'active').length
  const agentsCount = health?.agents_count ?? agents.length

  function formatBytes(bytes: number): string {
    const gb = bytes / 1024 ** 3
    return `${gb.toFixed(1)} GB`
  }

  return (
    <main className="control-main">
      {/* PC HEALTH STRIP */}
      <section className="pc-health-strip">
        <div className="pc-health-label">PC HEALTH</div>
        <div className="pc-health-cards">
          <HealthCard
            icon="💻"
            label="CPU"
            value={lh ? `${lh.cpu_percent.toFixed(0)}%` : '—'}
            sparkData={cpuHistory}
            sparkColor={lh && lh.cpu_percent > 80 ? '#ef4444' : '#22c55e'}
          />
          <HealthCard
            icon="🧮"
            label="RAM"
            value={lh ? `${lh.ram_percent.toFixed(0)}%` : '—'}
            sub={lh ? `${formatBytes(lh.ram_used)} / ${formatBytes(lh.ram_total)}` : undefined}
            sparkData={ramHistory}
            sparkColor="#94a3b8"
          />
          <HealthCard
            icon="💾"
            label="DISK"
            value={lh ? `${lh.disk_percent.toFixed(0)}%` : '—'}
            sparkData={diskHistory}
            sparkColor="#94a3b8"
          />
          <HealthCard
            icon="📱"
            label="MOBILE"
            value=""
            badge={
              !reachable
                ? 'Offline'
                : lh?.mobile_connection.status === 'connected'
                  ? 'Connected'
                  : lh?.mobile_connection.status === 'waiting'
                    ? 'Waiting'
                    : 'Offline'
            }
            badgeColor={lh?.mobile_connection.status === 'connected' ? 'var(--accent-green)' : 'var(--text-secondary)'}
          />
          <HealthCard
            icon="🧠"
            label="MEMORY"
            value={totalMemory !== null ? totalMemory.toLocaleString() : '—'}
            badge={totalMemory !== null && totalMemory > 0 ? '+active' : undefined}
            badgeColor="var(--accent-green)"
            barValue={totalMemory ?? 0}
            barMax={Math.max(totalMemory ?? 0, 1000)}
            barColor="#22c55e"
          />
          <HealthCard
            icon="🤖"
            label="AGENTS"
            value={agentsCount > 0 ? String(agentsCount) : '—'}
            barValue={agentsCount}
            barMax={Math.max(agentsCount, 60)}
            barColor="#22d3ee"
          />
          <HealthCard
            icon="🔁"
            label="LOOPS"
            value={loops.length > 0 ? String(loops.length) : '—'}
            badge={activeLoopsCount > 0 ? `${activeLoopsCount} active` : undefined}
            badgeColor="var(--accent-green)"
            barValue={loops.length}
            barMax={Math.max(loops.length, 20)}
            barColor="#818cf8"
          />
          <HealthCard
            icon="⚙️"
            label="SERVICES"
            value={lh ? String(lh.services.length) : '—'}
            badge={!reachable ? 'Offline' : undefined}
            badgeColor="var(--text-secondary)"
            barValue={lh?.services.filter((s) => s.status === 'online').length ?? 0}
            barMax={lh?.services.length ?? 4}
            barColor="#f59e0b"
          />
        </div>
      </section>

      {/* BRAIN VIEW */}
      <section className="ctrl-brain-section">
        <BrainView />
      </section>

      {/* SERVICES */}
      {reachable && lh && (
        <section className="ctrl-services-section">
          <div className="ctrl-section-header">
            <span className="ctrl-section-title">SERVICES</span>
          </div>
          <div className="ctrl-services-grid">
            {lh.services.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        </section>
      )}

      {/* SKILLS LIBRARY */}
      <section className="ctrl-skills-section">
        <SkillsLibrary />
      </section>

      {/* CORE ENGINE flyout button */}
      <button type="button" className="core-engine-fab" onClick={() => setCoreOpen((o) => !o)} title="Core Engine">
        <span>⚙</span>
        <span className="core-engine-fab-label">Core Engine</span>
      </button>

      {/* Core Engine slide-over */}
      {coreOpen && (
        <>
          <div className="core-engine-backdrop" onClick={() => setCoreOpen(false)} />
          <div className="core-engine-drawer">
            <LeftPanel />
          </div>
        </>
      )}
    </main>
  )
}
