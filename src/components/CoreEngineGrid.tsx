import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import { useMcpApprovals } from '../hooks/useMcpApprovals'
import { useGovernanceLifecycle } from '../hooks/useGovernanceLifecycle'
import {
  MemoryExpand,
  SkillsExpand,
  AgentsExpand,
  LoopsExpand,
  LLMExpand,
  GovernanceExpand,
  GovernanceLifecycleExpand,
  GuardrailsExpand,
  MemoryIntegrityExpand,
  OvernightExpand,
  SparringExpand,
  McpExpand,
  IntegrationsExpand,
  LAYER_OVERLAY_TITLE,
  type LayerId,
} from './LeftPanel'
import './CoreEngineGrid.css'

interface CoreLayer {
  id: LayerId
  label: string
  status: string
  icon: string
  color: string
  badge?: 'live' | 'soon'
  badgeCount?: number
}

const POLL_MS = 5000

export default function CoreEngineGrid() {
  const { health, online, loops } = useBackend()
  const { pending: pendingApprovals, refresh: refreshApprovals } = useMcpApprovals()
  const { awaitingApprovalCount, refresh: refreshLifecycle } = useGovernanceLifecycle()
  const [openLayer, setOpenLayer] = useState<LayerId | null>(null)

  useEffect(() => {
    refreshApprovals()
    const id = setInterval(refreshApprovals, POLL_MS)
    return () => clearInterval(id)
  }, [refreshApprovals])

  useEffect(() => {
    refreshLifecycle()
    const id = setInterval(refreshLifecycle, POLL_MS)
    return () => clearInterval(id)
  }, [refreshLifecycle])

  const activeLoopsCount = loops.filter((l) => l.status === 'active').length

  const layers: CoreLayer[] = [
    {
      id: 'memory',
      label: 'Memory',
      status: online ? 'Connected' : 'Idle',
      icon: '🧠',
      color: 'rgba(139, 92, 246, 0.15)',
      badge: 'live',
    },
    {
      id: 'skills',
      label: 'Skills',
      status: health ? `${health.skills_count} loaded` : '—',
      icon: '⚡',
      color: 'rgba(59, 130, 246, 0.15)',
    },
    {
      id: 'agents',
      label: 'Agents',
      status: health
        ? `${health.active_agents_count} active / ${health.agents_count} total`
        : 'Idle',
      icon: '🤖',
      color: 'rgba(34, 197, 94, 0.15)',
      badge: 'live',
    },
    {
      id: 'loops',
      label: 'Loops',
      status: activeLoopsCount > 0 ? `${activeLoopsCount} running` : 'None active',
      icon: '🔁',
      color: 'rgba(245, 158, 11, 0.15)',
    },
    {
      id: 'llm',
      label: 'LLM',
      status: health?.active_model
        ? `${health.active_model.provider} · ${health.active_model.model}`
        : '—',
      icon: '🖥️',
      color: 'rgba(6, 182, 212, 0.15)',
      badge: 'live',
    },
    {
      id: 'governance',
      label: 'Governance',
      status: 'Active',
      icon: '🛡️',
      color: 'rgba(139, 92, 246, 0.15)',
      badge: 'live',
    },
    {
      id: 'lifecycle',
      label: 'Quality',
      status:
        awaitingApprovalCount > 0
          ? `${awaitingApprovalCount} awaiting approval`
          : 'No open cases',
      icon: '🩺',
      color: 'rgba(236, 72, 153, 0.15)',
      badge: awaitingApprovalCount > 0 ? 'live' : undefined,
      badgeCount: awaitingApprovalCount > 0 ? awaitingApprovalCount : undefined,
    },
    {
      id: 'guardrails',
      label: 'Guardrails',
      status: 'Law · Contract · Trust · Budget',
      icon: '⚖️',
      color: 'rgba(99, 102, 241, 0.15)',
    },
    {
      id: 'integrity',
      label: 'Memory Integrity',
      status: 'Latest health check',
      icon: '🧬',
      color: 'rgba(20, 184, 166, 0.15)',
    },
    {
      id: 'overnight',
      label: 'Overnight',
      status: 'Unsupervised run reports',
      icon: '🌙',
      color: 'rgba(79, 70, 229, 0.15)',
    },
    {
      id: 'sparring',
      label: 'Sparring',
      status: 'Builder · Breaker · Judge',
      icon: '🥊',
      color: 'rgba(217, 70, 239, 0.15)',
    },
    {
      id: 'mcp',
      label: 'MCP',
      status:
        pendingApprovals.length > 0
          ? `${pendingApprovals.length} pending`
          : 'No pending approvals',
      icon: '🔌',
      color: 'rgba(239, 68, 68, 0.15)',
      badge: pendingApprovals.length > 0 ? 'live' : undefined,
      badgeCount: pendingApprovals.length > 0 ? pendingApprovals.length : undefined,
    },
    {
      id: 'integrations',
      label: 'Integrations',
      status: 'Web · Calendar · Email · MT5',
      icon: '🧩',
      color: 'rgba(16, 185, 129, 0.15)',
    },
  ]

  return (
    <>
      <section className="core-engine-grid-section">
        <div className="core-engine-grid-header">
          <span className="core-engine-grid-title">CORE ENGINE</span>
        </div>
        <div className="core-engine-grid">
          {layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`ce-card ${openLayer === layer.id ? 'active' : ''}`}
              style={{ '--ce-card-color': layer.color } as React.CSSProperties}
              onClick={() => setOpenLayer(layer.id)}
            >
              <div className="ce-card-top">
                <span className="ce-card-icon" style={{ background: layer.color }}>
                  {layer.icon}
                </span>
                {layer.badgeCount !== undefined ? (
                  <span className="ce-card-count">{layer.badgeCount}</span>
                ) : layer.badge === 'live' ? (
                  <span className="ce-card-live-dot" />
                ) : null}
              </div>
              <div className="ce-card-label">{layer.label}</div>
              <div className="ce-card-status">{layer.status}</div>
            </button>
          ))}
        </div>
      </section>

      {openLayer && (
        <>
          <div className="ce-modal-backdrop" onClick={() => setOpenLayer(null)} />
          <div className="ce-modal">
            <div className="ce-modal-header">
              <span className="ce-modal-title">{LAYER_OVERLAY_TITLE[openLayer]}</span>
              <button
                type="button"
                className="ce-modal-close"
                onClick={() => setOpenLayer(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="ce-modal-body">
              {openLayer === 'memory' && <MemoryExpand />}
              {openLayer === 'skills' && <SkillsExpand />}
              {openLayer === 'agents' && <AgentsExpand />}
              {openLayer === 'loops' && <LoopsExpand />}
              {openLayer === 'llm' && <LLMExpand />}
              {openLayer === 'governance' && <GovernanceExpand />}
              {openLayer === 'lifecycle' && <GovernanceLifecycleExpand />}
              {openLayer === 'guardrails' && <GuardrailsExpand />}
              {openLayer === 'integrity' && <MemoryIntegrityExpand />}
              {openLayer === 'overnight' && <OvernightExpand />}
              {openLayer === 'sparring' && <SparringExpand />}
              {openLayer === 'mcp' && <McpExpand />}
              {openLayer === 'integrations' && <IntegrationsExpand />}
            </div>
          </div>
        </>
      )}
    </>
  )
}
