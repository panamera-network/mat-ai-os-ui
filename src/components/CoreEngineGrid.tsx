import { useEffect, useState } from 'react'
import { useBackend } from '../context/BackendContext'
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
  badge?: 'live'
  badgeCount?: number
}

const POLL_MS = 5000

export default function CoreEngineGrid() {
  const { health, online, loops } = useBackend()
  const { awaitingApprovalCount, refresh: refreshLifecycle } = useGovernanceLifecycle()
  const [openLayer, setOpenLayer] = useState<LayerId | null>(null)

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
      color: '#8b5cf6',
      badge: 'live',
    },
    {
      id: 'skills',
      label: 'Skills',
      status: health ? `${health.skills_count} loaded` : '—',
      icon: '⚡',
      color: '#3b82f6',
    },
    {
      id: 'agents',
      label: 'Agents',
      status: health
        ? `${health.active_agents_count} active`
        : 'Idle',
      icon: '🤖',
      color: '#22c55e',
      badge: 'live',
    },
    {
      id: 'loops',
      label: 'Loops',
      status: activeLoopsCount > 0 ? `${activeLoopsCount} running` : 'None active',
      icon: '🔁',
      color: '#f59e0b',
    },
    {
      id: 'llm',
      label: 'LLM',
      status: health?.active_model
        ? `${health.active_model.provider}`
        : 'Idle',
      icon: '🖥️',
      color: '#06b6d4',
      badge: 'live',
    },
    {
      id: 'governance',
      label: 'Governance',
      status: 'Active',
      icon: '🛡️',
      color: '#8b5cf6',
      badge: 'live',
    },
    {
      id: 'lifecycle',
      label: 'Quality',
      status: awaitingApprovalCount > 0 ? `${awaitingApprovalCount} awaiting` : 'Clear',
      icon: '🩺',
      color: '#ec4899',
      badge: awaitingApprovalCount > 0 ? 'live' : undefined,
      badgeCount: awaitingApprovalCount > 0 ? awaitingApprovalCount : undefined,
    },
    {
      id: 'guardrails',
      label: 'Guardrails',
      status: 'Law · Trust',
      icon: '⚖️',
      color: '#6366f1',
    },
    {
      id: 'integrity',
      label: 'Integrity',
      status: 'Memory health',
      icon: '🧬',
      color: '#14b8a6',
    },
  ]

  const expandMap: Partial<Record<LayerId, React.ReactNode>> = {
    memory:     <MemoryExpand />,
    skills:     <SkillsExpand />,
    agents:     <AgentsExpand />,
    loops:      <LoopsExpand />,
    llm:        <LLMExpand />,
    governance: <GovernanceExpand />,
    lifecycle:  <GovernanceLifecycleExpand />,
    guardrails: <GuardrailsExpand />,
    integrity:  <MemoryIntegrityExpand />,
  }

  return (
    <>
      <div className="ce-panel">
        <div className="ce-panel-header">
          <span className="ce-panel-title">CORE ENGINE</span>
          <span className="ce-panel-sub">{online ? 'Online' : 'Offline'}</span>
        </div>
        <div className="ce-grid">
          {layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`ce-card ${openLayer === layer.id ? 'active' : ''}`}
              onClick={() => setOpenLayer(layer.id)}
            >
              <span className="ce-card-icon" style={{ background: `${layer.color}22`, color: layer.color }}>
                {layer.icon}
              </span>
              <div className="ce-card-body">
                <span className="ce-card-label">{layer.label}</span>
                <span className="ce-card-status">{layer.status}</span>
              </div>
              <div className="ce-card-right">
                {layer.badgeCount !== undefined
                  ? <span className="ce-badge-count">{layer.badgeCount}</span>
                  : layer.badge === 'live'
                    ? <span className="ce-badge-dot" />
                    : null}
                <span className="ce-card-chevron">›</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {openLayer && (
        <>
          <div className="ce-modal-backdrop" onClick={() => setOpenLayer(null)} />
          <div className="ce-modal">
            <div className="ce-modal-header">
              <span className="ce-modal-title">{LAYER_OVERLAY_TITLE[openLayer]}</span>
              <button type="button" className="ce-modal-close" onClick={() => setOpenLayer(null)} aria-label="Close">✕</button>
            </div>
            <div className="ce-modal-body">{expandMap[openLayer]}</div>
          </div>
        </>
      )}
    </>
  )
}
