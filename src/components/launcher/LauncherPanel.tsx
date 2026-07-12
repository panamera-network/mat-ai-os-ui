import { useLauncher, type ServiceState } from '../../context/LauncherContext'
import './LauncherPanel.css'

const STATUS_LABEL: Record<ServiceState['status'], string> = {
  online: 'Online',
  offline: 'Offline',
  starting: 'Starting...',
  restarting: 'Restarting...',
  error: 'Error',
}

const MOBILE_LABEL: Record<'waiting' | 'connected' | 'offline', string> = {
  waiting: 'Waiting',
  connected: 'Connected',
  offline: 'Offline',
}

function formatBytes(bytes: number): string {
  const gb = bytes / 1024 ** 3
  return `${gb.toFixed(1)} GB`
}

function ServiceCard({ service }: { service: ServiceState }) {
  const { startService, stopService, restartService, pendingAction } = useLauncher()
  const busy = pendingAction === service.id || service.status === 'starting' || service.status === 'restarting'
  const online = service.status === 'online'

  return (
    <div className={`launcher-service-card status-${service.status}`}>
      <div className="launcher-service-head">
        <span className="launcher-service-name">{service.name}</span>
        <span className={`launcher-status-badge status-${service.status}`}>{STATUS_LABEL[service.status]}</span>
      </div>
      <div className="launcher-service-meta">
        <span>Port {service.port}</span>
        {service.pid !== null && <span>PID {service.pid}</span>}
      </div>
      {service.last_error && <div className="launcher-service-error">{service.last_error}</div>}
      <div className="launcher-service-actions">
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

export default function LauncherPanel() {
  const { reachable, health } = useLauncher()

  if (!reachable || !health) {
    return (
      <div className="launcher-panel">
        <div className="panel-card launcher-unreachable">
          <h3>CONTROL CENTER</h3>
          <p className="empty-hint">
            Can't reach the launcher API at http://localhost:8090. Start it with scripts\start-ui.bat (or
            start-ui.ps1) — this is a separate lightweight process from MAT-AI-OS Core.
          </p>
        </div>
      </div>
    )
  }

  const mobileStatus = health.mobile.status

  return (
    <div className="launcher-panel">
      <div className="panel-card">
        <h3>PC HEALTH</h3>
        <div className="launcher-health-grid">
          <div className="launcher-health-stat">
            <span className="launcher-health-label">CPU</span>
            <span className="launcher-health-value">{health.cpu_percent.toFixed(0)}%</span>
          </div>
          <div className="launcher-health-stat">
            <span className="launcher-health-label">RAM</span>
            <span className="launcher-health-value">{health.ram_percent.toFixed(0)}%</span>
            <span className="launcher-health-sub">
              {formatBytes(health.ram_used)} / {formatBytes(health.ram_total)}
            </span>
          </div>
          <div className="launcher-health-stat">
            <span className="launcher-health-label">Disk</span>
            <span className="launcher-health-value">{health.disk_percent.toFixed(0)}%</span>
          </div>
          <div className="launcher-health-stat">
            <span className="launcher-health-label">Mobile</span>
            <span className={`launcher-status-badge status-${mobileStatus === 'connected' ? 'online' : mobileStatus === 'offline' ? 'offline' : 'starting'}`}>
              {MOBILE_LABEL[mobileStatus]}
            </span>
          </div>
        </div>
      </div>

      <div className="panel-card launcher-services-card">
        <h3>SERVICES</h3>
        <div className="launcher-services-grid">
          {health.services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </div>
  )
}
