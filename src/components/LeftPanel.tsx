import { useRef, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import { DOMAINS } from '../data/domains'
import { API_BASE_URL } from '../config'
import './LeftPanel.css'

type LayerId = 'memory' | 'skills' | 'agents' | 'loops' | 'llm'

interface CoreLayer {
  id: LayerId
  label: string
  status: string
  icon: string
  color: string
  badge?: 'live' | 'soon'
}

function formatBytes(bytes?: number): string {
  if (!bytes) return ''
  const gb = bytes / 1024 ** 3
  if (gb >= 1) return `${gb.toFixed(1)} GB`
  return `${(bytes / 1024 ** 2).toFixed(0)} MB`
}

function MemoryExpand() {
  const { health, online } = useBackend()
  return (
    <div className="layer-expand-body">
      <div className="empty-hint" style={{ marginBottom: 8 }}>
        Memory tier breakdown isn't tracked by the backend yet — showing system snapshot.
      </div>
      <div className="stat-grid">
        <div className="stat-cell">
          <span className="stat-value">{online ? 'Online' : 'Offline'}</span>
          <span className="stat-label">Connection</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{health?.agents_count ?? '—'}</span>
          <span className="stat-label">Agents</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{health?.skills_count ?? '—'}</span>
          <span className="stat-label">Skills</span>
        </div>
        <div className="stat-cell">
          <span className="stat-value">{health?.domains_count ?? '—'}</span>
          <span className="stat-label">Domains</span>
        </div>
      </div>
    </div>
  )
}

function SkillsExpand() {
  const { skillsByDomain, refreshSkills, refreshHealth } = useBackend()
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ id: '', name: '', domain: DOMAINS[0]?.id ?? '', description: '', prompt_fragment: '' })

  const domainIds = Object.keys(skillsByDomain).length > 0 ? Object.keys(skillsByDomain) : DOMAINS.map((d) => d.id)

  const submit = async () => {
    if (!form.id.trim() || !form.name.trim() || !form.domain.trim() || !form.prompt_fragment.trim()) {
      setError('Id, name, domain, and prompt are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/skills/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await Promise.all([refreshSkills(), refreshHealth()])
      setForm({ id: '', name: '', domain: DOMAINS[0]?.id ?? '', description: '', prompt_fragment: '' })
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add skill.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="layer-expand-body">
      <div className="domain-count-list">
        {domainIds.map((domainId) => (
          <div className="kv-row" key={domainId}>
            <span>{domainId}</span>
            <span className="value-muted">{skillsByDomain[domainId]?.length ?? 0}</span>
          </div>
        ))}
      </div>

      {!formOpen && (
        <button type="button" className="expand-action-btn" onClick={() => setFormOpen(true)}>
          + Add Skill
        </button>
      )}

      {formOpen && (
        <div className="inline-form">
          <input placeholder="id (snake_case)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
          <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
            {domainIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <input
            placeholder="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <textarea
            placeholder="prompt fragment"
            value={form.prompt_fragment}
            onChange={(e) => setForm({ ...form, prompt_fragment: e.target.value })}
          />
          {error && <div className="form-error">{error}</div>}
          <div className="inline-form-actions">
            <button type="button" onClick={submit} disabled={submitting}>
              {submitting ? 'Adding…' : 'Add'}
            </button>
            <button type="button" className="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function AgentsExpand() {
  const { agents, skillsByDomain, refreshAgents } = useBackend()
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [domain, setDomain] = useState(DOMAINS[0]?.id ?? '')
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())

  const domainIds = Object.keys(skillsByDomain).length > 0 ? Object.keys(skillsByDomain) : DOMAINS.map((d) => d.id)
  const availableSkills = skillsByDomain[domain] ?? []

  const toggleSkill = (id: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async () => {
    if (!name.trim() || !domain.trim() || selectedSkills.size === 0) {
      setError('Name, domain, and at least one skill are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/agents/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, domain, skill_ids: Array.from(selectedSkills) }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await refreshAgents()
      setName('')
      setSelectedSkills(new Set())
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteAgent = async (agentId: string) => {
    try {
      await fetch(`${API_BASE_URL}/agents/${agentId}`, { method: 'DELETE' })
      await refreshAgents()
    } catch {
      // best-effort — next poll will reconcile
    }
  }

  return (
    <div className="layer-expand-body">
      {agents.length === 0 ? (
        <div className="empty-hint">No agents created yet</div>
      ) : (
        agents.map((agent) => (
          <div className="core-layer-row" key={agent.agent_id}>
            <span className="core-layer-icon" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
              🧑‍💼
            </span>
            <div className="core-layer-text">
              <div className="core-layer-top">
                <span className="core-layer-label">{agent.name}</span>
                <span className={`core-layer-badge ${agent.status === 'active' ? 'live' : 'soon'}`}>{agent.status}</span>
              </div>
              <span className="core-layer-status">{agent.domain}</span>
            </div>
            <button type="button" className="delete-btn" onClick={() => deleteAgent(agent.agent_id)} aria-label="Delete agent">
              🗑
            </button>
          </div>
        ))
      )}

      {!formOpen && (
        <button type="button" className="expand-action-btn" onClick={() => setFormOpen(true)}>
          + Create Agent
        </button>
      )}

      {formOpen && (
        <div className="inline-form">
          <input placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
          <select
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value)
              setSelectedSkills(new Set())
            }}
          >
            {domainIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <div className="skill-multiselect">
            {availableSkills.length === 0 && <div className="empty-hint">No skills loaded for this domain</div>}
            {availableSkills.map((skill) => (
              <label key={skill.id} className="skill-checkbox">
                <input type="checkbox" checked={selectedSkills.has(skill.id)} onChange={() => toggleSkill(skill.id)} />
                {skill.name}
              </label>
            ))}
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="inline-form-actions">
            <button type="button" onClick={submit} disabled={submitting}>
              {submitting ? 'Creating…' : 'Create'}
            </button>
            <button type="button" className="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LoopsExpand() {
  const { loops } = useBackend()
  return (
    <div className="layer-expand-body">
      {loops.length === 0 ? (
        <div className="empty-hint">No active loops</div>
      ) : (
        loops.map((loop, i) => (
          <div className="kv-row" key={loop.id ?? i}>
            <span>{loop.name ?? loop.id ?? `Loop ${i + 1}`}</span>
            <span className="value-muted">{loop.status ?? '—'}</span>
          </div>
        ))
      )}
      <button type="button" className="expand-action-btn" disabled title="Coming soon">
        + Create Loop (Coming Soon)
      </button>
    </div>
  )
}

function LLMExpand() {
  const { models, refreshModels, refreshHealth } = useBackend()
  const [selecting, setSelecting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const active = models?.active
  const isActive = (option: { provider: string; model: string }) =>
    active?.provider === option.provider && active?.model === option.model

  const selectModel = async (option: { provider: string; model: string }) => {
    const key = `${option.provider}:${option.model}`
    setSelecting(key)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/models/select`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(option),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await Promise.all([refreshModels(), refreshHealth()])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch model.')
    } finally {
      setSelecting(null)
    }
  }

  return (
    <div className="layer-expand-body">
      <div className="active-model-banner">
        <span className="active-model-label">Active model</span>
        <span className="active-model-value">
          {active ? `${active.provider} · ${active.model}` : '—'}
        </span>
      </div>

      <div className="model-section-title">Online Models</div>
      {(models?.online ?? []).map((option) => (
        <button
          key={`${option.provider}:${option.model}`}
          type="button"
          className={`model-row ${isActive(option) ? 'selected' : ''}`}
          onClick={() => selectModel(option)}
          disabled={selecting !== null}
        >
          <span className="model-row-text">
            <span className="model-row-provider">{option.provider}</span>
            <span className="model-row-name">{option.model}</span>
          </span>
          {isActive(option) && <span className="model-check">✓</span>}
        </button>
      ))}

      <div className="model-section-title">Local Models</div>
      {(models?.local ?? []).length === 0 && (
        <div className="empty-hint">No local Ollama models found (is Ollama running on localhost:11434?)</div>
      )}
      {(models?.local ?? []).map((option) => (
        <button
          key={`${option.provider}:${option.model}`}
          type="button"
          className={`model-row ${isActive(option) ? 'selected' : ''}`}
          onClick={() => selectModel(option)}
          disabled={selecting !== null}
        >
          <span className="model-row-text">
            <span className="model-row-provider">ollama</span>
            <span className="model-row-name">{option.model}</span>
          </span>
          <span className="model-row-size">{formatBytes(option.size)}</span>
          {isActive(option) && <span className="model-check">✓</span>}
        </button>
      ))}

      {error && <div className="form-error">{error}</div>}
    </div>
  )
}

const LAYER_OVERLAY_TITLE: Record<LayerId, string> = {
  memory: 'Memory',
  skills: 'Skills',
  agents: 'Agents',
  loops: 'Loops',
  llm: 'LLM',
}

export default function LeftPanel() {
  const { health, online, agents, loops } = useBackend()
  const [overlayLayer, setOverlayLayer] = useState<LayerId | null>(null)
  const [overlayTop, setOverlayTop] = useState(0)
  const [overlayLeft, setOverlayLeft] = useState(0)
  const asideRef = useRef<HTMLElement>(null)

  const layers: CoreLayer[] = [
    { id: 'memory', label: 'Memory', status: online ? 'Connected' : 'Idle', icon: '🧠', color: 'rgba(139, 92, 246, 0.15)' },
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
      status: health ? `${health.active_agents_count} active / ${health.agents_count} total` : 'Idle',
      icon: '🤖',
      color: 'rgba(34, 197, 94, 0.15)',
      badge: 'live',
    },
    {
      id: 'loops',
      label: 'Loops',
      status: loops.length > 0 ? `${loops.length} running` : 'None active',
      icon: '🔁',
      color: 'rgba(245, 158, 11, 0.15)',
    },
    {
      id: 'llm',
      label: 'LLM',
      status: health?.active_model ? `${health.active_model.provider} · ${health.active_model.model}` : '—',
      icon: '🖥️',
      color: 'rgba(6, 182, 212, 0.15)',
      badge: 'live',
    },
  ]

  const toggleLayer = (id: LayerId, el: HTMLElement) => {
    if (overlayLayer === id) {
      setOverlayLayer(null)
      return
    }
    setOverlayTop(el.getBoundingClientRect().top)
    setOverlayLeft(asideRef.current?.getBoundingClientRect().right ?? 200)
    setOverlayLayer(id)
  }

  const activeAgents = agents.filter((a) => a.status === 'active')

  return (
    <aside className="left-panel" ref={asideRef}>
      <div className="panel-card layer-panel-card">
        <h3>Core Engine</h3>
        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            className={`core-layer-row layer-row-btn ${overlayLayer === layer.id ? 'active' : ''}`}
            onClick={(e) => toggleLayer(layer.id, e.currentTarget)}
          >
            <span className="core-layer-icon" style={{ background: layer.color }}>
              {layer.icon}
            </span>
            <div className="core-layer-text">
              <div className="core-layer-top">
                <span className="core-layer-label">{layer.label}</span>
                {layer.badge && <span className={`core-layer-badge ${layer.badge}`}>{layer.badge}</span>}
              </div>
              <span className="core-layer-status">{layer.status}</span>
            </div>
          </button>
        ))}

        {overlayLayer && (
          <>
            <div className="layer-overlay-backdrop" onClick={() => setOverlayLayer(null)} />
            <div className="layer-overlay" style={{ top: overlayTop, left: overlayLeft }}>
              <div className="layer-overlay-header">
                <span>{LAYER_OVERLAY_TITLE[overlayLayer]}</span>
                <button type="button" className="layer-overlay-close" onClick={() => setOverlayLayer(null)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className="layer-overlay-body">
                {overlayLayer === 'memory' && <MemoryExpand />}
                {overlayLayer === 'skills' && <SkillsExpand />}
                {overlayLayer === 'agents' && <AgentsExpand />}
                {overlayLayer === 'loops' && <LoopsExpand />}
                {overlayLayer === 'llm' && <LLMExpand />}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="panel-card">
        <h3>Running Loops</h3>
        {loops.length === 0 ? (
          <div className="empty-hint">No active loops</div>
        ) : (
          loops.map((loop, i) => (
            <div className="kv-row" key={loop.id ?? i}>
              <span>{loop.name ?? loop.id ?? `Loop ${i + 1}`}</span>
              <span className="value-muted">{loop.status ?? '—'}</span>
            </div>
          ))
        )}
      </div>

      <div className="panel-card">
        <h3>Active Agents</h3>
        {activeAgents.length === 0 ? (
          <div className="empty-hint">No active agents</div>
        ) : (
          activeAgents.map((agent) => (
            <div className="core-layer-row active-agent-row" key={agent.agent_id}>
              <span className="active-agent-glow" />
              <div className="core-layer-text">
                <span className="core-layer-label">{agent.name}</span>
                <span className="core-layer-status">{agent.domain}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
