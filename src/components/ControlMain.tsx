import { useEffect, useState } from 'react'
import { useLauncher, type ServiceState } from '../context/LauncherContext'
import { useBackend } from '../context/BackendContext'
import { useMcpApprovals } from '../hooks/useMcpApprovals'
import { useGovernanceLifecycle } from '../hooks/useGovernanceLifecycle'
import { API_BASE_URL } from '../config'
import BrainView from './BrainView'
import SkillsLibrary from './SkillsLibrary'
import CoreEngineGrid from './CoreEngineGrid'
import {
  OvernightExpand,
  SparringExpand,
  McpExpand,
  IntegrationsExpand,
  LAYER_OVERLAY_TITLE,
  type LayerId,
} from './LeftPanel'
import './ControlMain.css'

// ── Service card ─────────────────────────────────────────────────────────────
function ServiceCard({ service }: { service: ServiceState }) {
  const { startService, stopService, restartService, pendingAction } = useLauncher()
  const busy = pendingAction === service.id || service.status === 'starting' || service.status === 'restarting'
  const isOnline = service.status === 'online'
  const statusLabel =
    service.status === 'online' ? 'Online'
    : service.status === 'starting' ? 'Starting...'
    : service.status === 'restarting' ? 'Restarting...'
    : service.status === 'error' ? 'Error'
    : 'Offline'

  return (
    <div className={`ctrl-service-card status-${service.status}`}>
      <div className="ctrl-service-head">
        <span className="ctrl-service-icon">⬡</span>
        <div className="ctrl-service-info">
          <span className="ctrl-service-name">{service.name}</span>
          <span className="ctrl-service-port">Port {service.port}</span>
        </div>
        <span className={`ctrl-service-badge status-${service.status}`}>{statusLabel}</span>
      </div>
      {service.last_error && <div className="ctrl-service-error">{service.last_error}</div>}
      <div className="ctrl-service-actions">
        <button type="button" disabled={busy || isOnline}  onClick={() => startService(service.id)}>Start</button>
        <button type="button" disabled={busy || !isOnline} onClick={() => stopService(service.id)}>Stop</button>
        <button type="button" disabled={busy || !isOnline} onClick={() => restartService(service.id)}>Restart</button>
      </div>
    </div>
  )
}

// ── Tools panel (beside Brain View) ──────────────────────────────────────────
type ToolLayer = { id: LayerId; label: string; status: string; icon: string; color: string; badgeCount?: number }
interface IntegritySummary { status: string }

function ToolsPanel() {
  const { pending: pendingApprovals } = useMcpApprovals()
  const { awaitingApprovalCount } = useGovernanceLifecycle()
  const [openLayer, setOpenLayer] = useState<LayerId | null>(null)
  const [integrity, setIntegrity] = useState<IntegritySummary | null>(null)

  useEffect(() => {
    fetch(`${API_BASE_URL}/memory/integrity`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setIntegrity(d) })
      .catch(() => {})
  }, [])

  const integrityPct = integrity?.status === 'critical' ? 30 : integrity?.status === 'warning' ? 65 : 100
  const integrityColor = integrity?.status === 'critical' ? 'var(--accent-red)' : integrity?.status === 'warning' ? 'var(--accent-amber)' : 'var(--accent-green)'
  const integrityLabel = integrity?.status === 'critical' ? 'Critical' : integrity?.status === 'warning' ? 'Warning' : 'Excellent'

  const tools: ToolLayer[] = [
    { id: 'overnight',    label: 'Overnight',    status: 'Unsupervised runs',         icon: '🌙', color: '#4f46e5' },
    { id: 'sparring',     label: 'Sparring',     status: 'Builder · Breaker · Judge', icon: '🥊', color: '#d946ef' },
    {
      id: 'mcp',
      label: 'MCP',
      status: pendingApprovals.length > 0 ? `${pendingApprovals.length} pending` : 'No pending',
      icon: '🔌',
      color: '#ef4444',
      badgeCount: pendingApprovals.length > 0 ? pendingApprovals.length : undefined,
    },
    { id: 'integrations', label: 'Integrations', status: 'Web · Cal · Email · MT5',  icon: '🧩', color: '#10b981' },
  ]

  const expandMap: Partial<Record<LayerId, React.ReactNode>> = {
    overnight:    <OvernightExpand />,
    sparring:     <SparringExpand />,
    mcp:          <McpExpand />,
    integrations: <IntegrationsExpand />,
  }

  return (
    <>
      <div className="ctrl-tools-panel">
        <div className="ctrl-tools-label">TOOLS</div>
        {tools.map(t => (
          <button
            key={t.id}
            type="button"
            className={`ctrl-tool-card ${openLayer === t.id ? 'active' : ''}`}
            onClick={() => setOpenLayer(t.id)}
          >
            <span className="ctrl-tool-icon" style={{ background: `${t.color}22`, color: t.color }}>
              {t.icon}
            </span>
            <div className="ctrl-tool-body">
              <span className="ctrl-tool-label">{t.label}</span>
              <span className="ctrl-tool-status">{t.status}</span>
            </div>
            {t.badgeCount !== undefined && (
              <span className="ctrl-tool-badge">{t.badgeCount}</span>
            )}
          </button>
        ))}

        {/* Governance */}
        <div className="ctrl-metric-card">
          <div className="ctrl-metric-head">
            <span className="ctrl-metric-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#8b5cf6' }}>🛡️</span>
            <div className="ctrl-metric-info">
              <span className="ctrl-metric-title">GOVERNANCE</span>
              <span className="ctrl-metric-badge" style={{ color: 'var(--accent-green)' }}>Active •</span>
            </div>
          </div>
          <div className="ctrl-metric-bar">
            <div className="ctrl-metric-fill" style={{ width: '100%', background: 'var(--accent-green)' }} />
          </div>
          <span className="ctrl-metric-value">100%</span>
        </div>

        {/* Memory Integrity */}
        <div className="ctrl-metric-card">
          <div className="ctrl-metric-head">
            <span className="ctrl-metric-icon" style={{ background: 'rgba(20,184,166,0.15)', color: '#14b8a6' }}>🧬</span>
            <div className="ctrl-metric-info">
              <span className="ctrl-metric-title">MEMORY INTEGRITY</span>
              <span className="ctrl-metric-badge" style={{ color: integrityColor }}>{integrityLabel}</span>
            </div>
          </div>
          <div className="ctrl-metric-bar">
            <div className="ctrl-metric-fill" style={{ width: `${integrityPct}%`, background: integrityColor }} />
          </div>
          <span className="ctrl-metric-sub">Long-Term Health Check</span>
        </div>
      </div>

      {openLayer && (
        <>
          <div className="ce-modal-backdrop" onClick={() => setOpenLayer(null)} />
          <div className="ce-modal">
            <div className="ce-modal-header">
              <span className="ce-modal-title">{LAYER_OVERLAY_TITLE[openLayer]}</span>
              <button type="button" className="ce-modal-close" onClick={() => setOpenLayer(null)}>✕</button>
            </div>
            <div className="ce-modal-body">{expandMap[openLayer]}</div>
          </div>
        </>
      )}
    </>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ControlMain() {
  const { reachable, health: lh } = useLauncher()
  const onlineCount = lh?.services.filter((s) => s.status === 'online').length ?? 0
  const totalCount  = lh?.services.length ?? 0

  return (
    <main className="control-main">
      {/* LEFT — Core Engine card grid */}
      <aside className="ctrl-core-col">
        <CoreEngineGrid />
      </aside>

      {/* RIGHT — main content */}
      <div className="ctrl-content-col">
        {/* SERVICES */}
        <section className="ctrl-services-section">
          <div className="ctrl-section-header">
            <span className="ctrl-section-title">SERVICES</span>
            {reachable && lh ? (
              <span className="ctrl-section-sub">{onlineCount}/{totalCount} online</span>
            ) : (
              <span className="ctrl-section-sub warn">Launcher offline</span>
            )}
          </div>
          {reachable && lh ? (
            <div className="ctrl-services-grid">
              {lh.services.map((s) => <ServiceCard key={s.id} service={s} />)}
            </div>
          ) : (
            <div className="ctrl-services-offline-hint">Start the launcher to manage services.</div>
          )}
        </section>

        {/* BRAIN + TOOLS row */}
        <div className="ctrl-mid-row">
          <section className="ctrl-brain-section">
            <BrainView />
          </section>
          <ToolsPanel />
        </div>

        {/* SKILLS LIBRARY */}
        <section className="ctrl-skills-section">
          <SkillsLibrary />
        </section>
      </div>
    </main>
  )
}
