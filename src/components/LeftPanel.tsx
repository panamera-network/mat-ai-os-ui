import { useState } from 'react'
import { useBackend } from '../context/BackendContext'
import { DOMAINS } from '../data/domains'
import { API_BASE_URL } from '../config'
import './LeftPanel.css'

type LayerId = 'memory' | 'skills' | 'agents' | 'loops' | 'actions'

interface CoreLayer {
  id: LayerId
  label: string
  icon: string
}

const LAYERS: CoreLayer[] = [
  { id: 'memory', label: 'Memory', icon: '🧠' },
  { id: 'skills', label: 'Skills', icon: '⚡' },
  { id: 'agents', label: 'Agents', icon: '🤖' },
  { id: 'loops', label: 'Loops', icon: '🔁' },
  { id: 'actions', label: 'Actions', icon: '🛠️' },
]

const STATIC_INTEGRATIONS = [
  { id: 'mt5', label: 'MT5', connected: false },
  { id: 'tradingview', label: 'TradingView', connected: false },
  { id: 'telegram', label: 'Telegram', connected: false },
  { id: 'email', label: 'Email', connected: false },
  { id: 'api', label: 'API', connected: true },
]

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
                <input
                  type="checkbox"
                  checked={selectedSkills.has(skill.id)}
                  onChange={() => toggleSkill(skill.id)}
                />
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

function ActionsExpand() {
  return (
    <div className="layer-expand-body">
      {STATIC_INTEGRATIONS.map((integration) => (
        <div className="kv-row" key={integration.id}>
          <span>{integration.label}</span>
          <span className={`integration-status ${integration.connected ? 'connected' : 'disconnected'}`}>
            <span className="integration-dot" />
            {integration.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function LeftPanel() {
  const { agents, loops } = useBackend()
  const [activeLayer, setActiveLayer] = useState<LayerId>('memory')

  const activeAgents = agents.filter((a) => a.status === 'active')

  return (
    <aside className="left-panel">
      <div className="panel-card">
        <h3>Core Engine</h3>
        <div className="layer-buttons">
          {LAYERS.map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`layer-btn ${activeLayer === layer.id ? 'active' : ''}`}
              onClick={() => setActiveLayer(layer.id)}
            >
              <span className="layer-btn-icon">{layer.icon}</span>
              {layer.label}
            </button>
          ))}
        </div>

        <div className="layer-expand">
          {activeLayer === 'memory' && <MemoryExpand />}
          {activeLayer === 'skills' && <SkillsExpand />}
          {activeLayer === 'agents' && <AgentsExpand />}
          {activeLayer === 'loops' && <LoopsExpand />}
          {activeLayer === 'actions' && <ActionsExpand />}
        </div>
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
