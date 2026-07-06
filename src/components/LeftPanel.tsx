import { useEffect, useRef, useState } from 'react'
import { useBackend } from '../context/BackendContext'
import { DOMAINS } from '../data/domains'
import { API_BASE_URL } from '../config'
import { useMcpApprovals } from '../hooks/useMcpApprovals'
import './LeftPanel.css'

type LayerId = 'memory' | 'skills' | 'agents' | 'loops' | 'llm' | 'governance' | 'mcp'

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

function SoulPromptSection() {
  const { soul, refreshSoul } = useBackend()
  const [draft, setDraft] = useState(soul?.soul_prompt ?? '')
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  if (!touched && soul && draft !== soul.soul_prompt) {
    setDraft(soul.soul_prompt)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/soul/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: draft }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await refreshSoul()
      setTouched(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save soul prompt.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="soul-section">
      <div className="model-section-title">Soul Prompt</div>
      <textarea
        className="soul-textarea"
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value)
          setTouched(true)
        }}
        placeholder="Base personality prompt..."
      />
      {error && <div className="form-error">{error}</div>}
      <button type="button" className="expand-action-btn solid" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  )
}

const STYLE_MODES: { id: string; label: string }[] = [
  { id: 'casual', label: 'Casual' },
  { id: 'technical', label: 'Technical' },
  { id: 'analytical', label: 'Analytical' },
]

function ResponseStylesSection() {
  const { soul, refreshSoul } = useBackend()
  const [activeTab, setActiveTab] = useState('casual')
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const currentDraft = drafts[activeTab] ?? soul?.response_styles[activeTab] ?? ''

  const setDraft = (value: string) => {
    setDrafts((prev) => ({ ...prev, [activeTab]: value }))
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/soul/style/${activeTab}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ style: currentDraft }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await refreshSoul()
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save response style.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="soul-section">
      <div className="model-section-title">Response Styles</div>
      <div className="style-tabs">
        {STYLE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`style-tab ${activeTab === mode.id ? 'active' : ''}`}
            onClick={() => setActiveTab(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
      <textarea
        className="soul-textarea"
        value={currentDraft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={`${activeTab} response style...`}
      />
      {error && <div className="form-error">{error}</div>}
      <button type="button" className="expand-action-btn solid" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
      </button>
    </div>
  )
}

interface AnalyticsStats {
  total_skills_learned: number
  total_improved: number
  total_rejected: number
  total_approved: number
  total_discarded: number
  most_active_domain: string | null
  learning_velocity_per_week: number
  top_performing_agents: { agent_id: string; count: number }[]
}

interface TimelineEvent {
  type: string
  data: Record<string, unknown>
  timestamp: string
}

const EVENT_ICON: Record<string, string> = {
  approved: '✅',
  improved: '🔄',
  learned: '✅',
  created: '✅',
  rejected: '❌',
  discarded: '🗑️',
}

function formatTimelineTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function AnalyticsSection() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [statsRes, timelineRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics`),
        fetch(`${API_BASE_URL}/analytics/timeline`),
      ])
      if (statsRes.ok) setStats(await statsRes.json())
      if (timelineRes.ok) {
        const data: { timeline: TimelineEvent[] } = await timelineRes.json()
        setTimeline([...data.timeline].reverse())
      }
    } catch {
      setError('Could not reach the Orchestrator.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  return (
    <div className="layer-expand-body">
      <button type="button" className="expand-action-btn" onClick={load} disabled={loading}>
        {loading ? 'Refreshing…' : '⟳ Refresh'}
      </button>
      {error && <div className="form-error">{error}</div>}

      {stats && (
        <>
          <div className="stat-grid">
            <div className="stat-cell">
              <span className="stat-value">{stats.total_skills_learned}</span>
              <span className="stat-label">Skills learned</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value">{stats.total_improved}</span>
              <span className="stat-label">Improved</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value">{stats.total_rejected}</span>
              <span className="stat-label">Rejected</span>
            </div>
            <div className="stat-cell">
              <span className="stat-value">{stats.most_active_domain ?? '—'}</span>
              <span className="stat-label">Most active domain</span>
            </div>
          </div>
          <div className="kv-row">
            <span>Learning velocity</span>
            <span className="value-muted">{stats.learning_velocity_per_week}/week</span>
          </div>

          <div className="model-section-title">Top Performing Agents</div>
          {stats.top_performing_agents.length === 0 ? (
            <div className="empty-hint">No agent performance data yet</div>
          ) : (
            stats.top_performing_agents.map((a) => (
              <div className="kv-row" key={a.agent_id}>
                <span>{a.agent_id}</span>
                <span className="value-muted">{a.count}</span>
              </div>
            ))
          )}
        </>
      )}

      <div className="model-section-title">Timeline</div>
      {timeline.length === 0 && <div className="empty-hint">No learning events yet</div>}
      {timeline.map((event, i) => (
        <div className="timeline-row" key={i}>
          <span className="timeline-icon">{EVENT_ICON[event.type] ?? '•'}</span>
          <div className="timeline-text">
            <div className="timeline-top">
              <span className="timeline-type">{event.type}</span>
              <span className="timeline-time">{formatTimelineTime(event.timestamp)}</span>
            </div>
            <div className="timeline-detail">
              {String(event.data.skill_id ?? event.data.source ?? '')}
              {event.data.domain ? ` · ${event.data.domain}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const MEMORY_TABS = ['overview', 'soul', 'styles', 'analytics'] as const

function MemoryExpand() {
  const { health, online } = useBackend()
  const [activeTab, setActiveTab] = useState<(typeof MEMORY_TABS)[number]>('overview')

  return (
    <div className="layer-expand-body">
      <div className="expand-tabs">
        <button type="button" className={`expand-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button type="button" className={`expand-tab ${activeTab === 'soul' ? 'active' : ''}`} onClick={() => setActiveTab('soul')}>
          Soul
        </button>
        <button type="button" className={`expand-tab ${activeTab === 'styles' ? 'active' : ''}`} onClick={() => setActiveTab('styles')}>
          Styles
        </button>
        <button
          type="button"
          className={`expand-tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'overview' && (
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
      )}

      {activeTab === 'soul' && <SoulPromptSection />}
      {activeTab === 'styles' && <ResponseStylesSection />}
      {activeTab === 'analytics' && <AnalyticsSection />}
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
        {domainIds.map((domainId) => {
          const skills = skillsByDomain[domainId] ?? []
          const abilityCount = skills.filter((s) => s.kind === 'ability').length
          return (
            <div className="kv-row" key={domainId}>
              <span>{domainId}</span>
              <span className="value-muted">
                {skills.length}
                {abilityCount > 0 && ` (${abilityCount} ability)`}
              </span>
            </div>
          )
        })}
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

function formatLoopTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

const TRIGGER_TYPES = ['interval', 'cron'] as const

function LoopsExpand() {
  const { loops, refreshLoops } = useBackend()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    task: '',
    trigger: 'interval' as (typeof TRIGGER_TYPES)[number],
    schedule: '',
    domain: '',
  })

  const togglePause = async (loop: (typeof loops)[number]) => {
    setBusyId(loop.id)
    try {
      await fetch(`${API_BASE_URL}/loops/${loop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: loop.status === 'active' ? 'paused' : 'active' }),
      })
      await refreshLoops()
    } catch {
      // best-effort — next poll will reconcile
    } finally {
      setBusyId(null)
    }
  }

  const deleteLoop = async (loopId: string) => {
    setBusyId(loopId)
    try {
      await fetch(`${API_BASE_URL}/loops/${loopId}`, { method: 'DELETE' })
      await refreshLoops()
    } catch {
      // best-effort — next poll will reconcile
    } finally {
      setBusyId(null)
    }
  }

  const runNow = async (loopId: string) => {
    setBusyId(loopId)
    try {
      await fetch(`${API_BASE_URL}/loops/${loopId}/run`, { method: 'POST' })
      await refreshLoops()
    } catch {
      // best-effort — next poll will reconcile
    } finally {
      setBusyId(null)
    }
  }

  const submit = async () => {
    if (!form.name.trim() || !form.task.trim() || !form.schedule.trim()) {
      setError('Name, task, and schedule are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/loops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          task: form.task,
          trigger: form.trigger,
          schedule: form.schedule,
          domain: form.domain || null,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await refreshLoops()
      setForm({ name: '', task: '', trigger: 'interval', schedule: '', domain: '' })
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create loop.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="layer-expand-body">
      {loops.length === 0 ? (
        <div className="empty-hint">No loops yet</div>
      ) : (
        loops.map((loop) => (
          <div className="loop-card" key={loop.id}>
            <div className="loop-card-top">
              <span className="loop-card-name">{loop.name}</span>
              <span className={`loop-status-badge status-${loop.status}`}>{loop.status}</span>
            </div>
            <div className="loop-card-task">{loop.task}</div>
            <div className="loop-card-meta">
              <span>Last run: {formatLoopTime(loop.last_run)}</span>
              <span>Runs: {loop.run_count}</span>
              <span>Next: {loop.status === 'active' ? formatLoopTime(loop.next_run) : '—'}</span>
            </div>
            <div className="loop-card-actions">
              <button type="button" disabled={busyId === loop.id} onClick={() => togglePause(loop)}>
                {loop.status === 'active' ? 'Pause' : 'Resume'}
              </button>
              <button type="button" onClick={() => runNow(loop.id)} disabled={busyId === loop.id}>
                Run now
              </button>
              <button
                type="button"
                className="delete-btn"
                onClick={() => deleteLoop(loop.id)}
                disabled={busyId === loop.id}
                aria-label="Delete loop"
              >
                🗑
              </button>
            </div>
          </div>
        ))
      )}

      {!formOpen && (
        <button type="button" className="expand-action-btn" onClick={() => setFormOpen(true)}>
          + Create Loop
        </button>
      )}

      {formOpen && (
        <div className="inline-form">
          <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea
            placeholder="task to send the Orchestrator"
            value={form.task}
            onChange={(e) => setForm({ ...form, task: e.target.value })}
          />
          <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as typeof form.trigger })}>
            {TRIGGER_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            placeholder={form.trigger === 'cron' ? 'cron string, e.g. */5 * * * *' : 'interval seconds, e.g. 3600'}
            value={form.schedule}
            onChange={(e) => setForm({ ...form, schedule: e.target.value })}
          />
          <select value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })}>
            <option value="">No domain</option>
            {DOMAINS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id}
              </option>
            ))}
          </select>
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

interface McpServer {
  name: string
  url: string
  description: string
  registered_at: string
}

interface McpTool {
  name: string
  description: string
  [key: string]: unknown
}

function McpExpand() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [toolCounts, setToolCounts] = useState<Record<string, number>>({})
  const [tools, setTools] = useState<Record<string, McpTool[]>>({})
  const [expandedServer, setExpandedServer] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyName, setBusyName] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', url: '', description: '' })

  const loadServers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/mcp/servers`)
      if (!res.ok) return
      const data: { servers: McpServer[] } = await res.json()
      setServers(data.servers)
      const counts: Record<string, number> = {}
      await Promise.all(
        data.servers.map(async (s) => {
          try {
            const r = await fetch(`${API_BASE_URL}/mcp/servers/${s.name}/tools`)
            if (r.ok) {
              const td: { tools: McpTool[] } = await r.json()
              counts[s.name] = td.tools.length
            }
          } catch {
            // tool discovery failing for one server shouldn't block the rest
          }
        }),
      )
      setToolCounts(counts)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServers()
  }, [])

  const removeServer = async (name: string) => {
    setBusyName(name)
    try {
      await fetch(`${API_BASE_URL}/mcp/servers/${name}`, { method: 'DELETE' })
      await loadServers()
    } catch {
      // best-effort
    } finally {
      setBusyName(null)
    }
  }

  const toggleTools = async (name: string) => {
    if (expandedServer === name) {
      setExpandedServer(null)
      return
    }
    setExpandedServer(name)
    if (!tools[name]) {
      try {
        const res = await fetch(`${API_BASE_URL}/mcp/servers/${name}/tools`)
        if (res.ok) {
          const data: { tools: McpTool[] } = await res.json()
          setTools((prev) => ({ ...prev, [name]: data.tools }))
        }
      } catch {
        // leave tools list empty on failure
      }
    }
  }

  const submit = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      setError('Name and URL are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/mcp/servers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      await loadServers()
      setForm({ name: '', url: '', description: '' })
      setFormOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register MCP server.')
    } finally {
      setSubmitting(false)
    }
  }

  const { pending, loading: approvalsLoading, refresh: refreshApprovals, approve, deny } = useMcpApprovals()
  const [actingId, setActingId] = useState<string | null>(null)

  useEffect(() => {
    refreshApprovals()
  }, [refreshApprovals])

  const handleApprove = async (id: string) => {
    setActingId(id)
    await approve(id)
    setActingId(null)
  }

  const handleDeny = async (id: string) => {
    setActingId(id)
    await deny(id)
    setActingId(null)
  }

  return (
    <div className="layer-expand-body">
      <div className="model-section-title">Pending Approvals</div>
      {approvalsLoading && pending.length === 0 && <div className="empty-hint">Loading approvals…</div>}
      {!approvalsLoading && pending.length === 0 && <div className="empty-hint">No commands awaiting approval</div>}
      {pending.map((approval) => (
        <div className="mcp-server-card" key={approval.id}>
          <div className="mcp-server-top">
            <span className="mcp-server-name">
              {approval.server} · {approval.tool}
            </span>
          </div>
          <pre className="mcp-server-description">{JSON.stringify(approval.params, null, 2)}</pre>
          <div className="inline-form-actions">
            <button type="button" onClick={() => handleApprove(approval.id)} disabled={actingId === approval.id}>
              {actingId === approval.id ? '…' : '✓ Approve'}
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => handleDeny(approval.id)}
              disabled={actingId === approval.id}
            >
              ✕ Deny
            </button>
          </div>
        </div>
      ))}

      <div className="model-section-title">Registered Servers</div>
      {loading && <div className="empty-hint">Loading MCP servers…</div>}
      {!loading && servers.length === 0 && <div className="empty-hint">No MCP servers registered yet</div>}
      {servers.map((s) => (
        <div className="mcp-server-card" key={s.name}>
          <div className="mcp-server-top" onClick={() => toggleTools(s.name)}>
            <span className="mcp-server-name">{s.name}</span>
            {toolCounts[s.name] !== undefined && (
              <span className="mcp-server-tool-count">{toolCounts[s.name]} tools</span>
            )}
            <button
              type="button"
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation()
                removeServer(s.name)
              }}
              disabled={busyName === s.name}
              aria-label="Remove server"
            >
              🗑
            </button>
          </div>
          <div className="mcp-server-url">{s.url}</div>
          {s.description && <div className="mcp-server-description">{s.description}</div>}
          {expandedServer === s.name && (
            <div className="mcp-tools-list">
              {(tools[s.name] ?? []).length === 0 && <div className="empty-hint">No tools found (or still loading)</div>}
              {(tools[s.name] ?? []).map((tool) => (
                <div className="mcp-tool-row" key={tool.name}>
                  <div className="mcp-tool-name">{tool.name}</div>
                  <div className="mcp-tool-description">{tool.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {!formOpen && (
        <button type="button" className="expand-action-btn" onClick={() => setFormOpen(true)}>
          + Add Server
        </button>
      )}

      {formOpen && (
        <div className="inline-form">
          <input placeholder="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
          <input
            placeholder="description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
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

function GovernanceExpand() {
  const { skillsByDomain } = useBackend()
  const allSkills = Object.values(skillsByDomain).flat()
  const learnedCount = allSkills.filter((s) => s.source && s.source !== 'manual_add').length

  return (
    <div className="layer-expand-body">
      <div className="kv-row">
        <span>Security check</span>
        <span className="status-active">● Active</span>
      </div>
      <div className="kv-row">
        <span>Quality check</span>
        <span className="status-active">● Active</span>
      </div>
      <div className="kv-row">
        <span>Relevance check</span>
        <span className="status-active">● Active</span>
      </div>
      <div className="kv-row">
        <span>Learned skills</span>
        <span className="value-muted">{learnedCount}</span>
      </div>
      <div className="kv-row">
        <span>Rejected (total)</span>
        <span className="value-muted">Not tracked yet</span>
      </div>
    </div>
  )
}

const LAYER_OVERLAY_TITLE: Record<LayerId, string> = {
  memory: 'Memory',
  skills: 'Skills',
  agents: 'Agents',
  loops: 'Loops',
  llm: 'LLM',
  governance: 'Governance',
  mcp: 'MCP',
}

// Polling interval for the pending-approval count badge on the Core Engine's MCP
// button — same convention as the other 5s fallback polls in this app (e.g. Creator/
// Dev Workspace's selected-project poll); a WebSocket-only signal isn't worth wiring
// here since this is a small at-a-glance count, not the full approval detail.
const MCP_APPROVAL_COUNT_POLL_MS = 5000

export default function LeftPanel() {
  const { health, online, agents, loops } = useBackend()
  const { pending: pendingApprovals, refresh: refreshApprovals } = useMcpApprovals()
  const [overlayLayer, setOverlayLayer] = useState<LayerId | null>(null)
  const [overlayTop, setOverlayTop] = useState(0)
  const [overlayLeft, setOverlayLeft] = useState(0)
  const asideRef = useRef<HTMLElement>(null)
  const activeLoops = loops.filter((loop) => loop.status === 'active')

  useEffect(() => {
    refreshApprovals()
    const id = setInterval(refreshApprovals, MCP_APPROVAL_COUNT_POLL_MS)
    return () => clearInterval(id)
  }, [refreshApprovals])

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
      status: activeLoops.length > 0 ? `${activeLoops.length} running` : 'None active',
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
    {
      id: 'governance',
      label: 'Governance',
      status: 'Active',
      icon: '🛡️',
      color: 'rgba(139, 92, 246, 0.15)',
      badge: 'live',
    },
    {
      id: 'mcp',
      label: 'MCP',
      status: pendingApprovals.length > 0 ? `⚠ ${pendingApprovals.length} pending` : 'No pending approvals',
      icon: '🔌',
      color: 'rgba(239, 68, 68, 0.15)',
      badge: pendingApprovals.length > 0 ? 'live' : undefined,
    },
  ]

  const toggleLayer = (id: LayerId, el: HTMLElement) => {
    if (overlayLayer === id) {
      setOverlayLayer(null)
      return
    }
    const maxOverlayHeight = window.innerHeight * 0.8
    const maxTop = window.innerHeight - maxOverlayHeight - 16
    setOverlayTop(Math.min(el.getBoundingClientRect().top, Math.max(maxTop, 0)))
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
                {overlayLayer === 'governance' && <GovernanceExpand />}
                {overlayLayer === 'mcp' && <McpExpand />}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="panel-card">
        <h3>Running Loops</h3>
        {activeLoops.length === 0 ? (
          <div className="empty-hint">No active loops</div>
        ) : (
          activeLoops.map((loop) => (
            <div className="kv-row" key={loop.id}>
              <span>{loop.name}</span>
              <span className="value-muted">{loop.run_count} run{loop.run_count === 1 ? '' : 's'}</span>
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
