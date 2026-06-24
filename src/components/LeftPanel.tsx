import { useBackend } from '../context/BackendContext'
import './LeftPanel.css'

interface CoreLayer {
  id: string
  label: string
  status: string
  icon: string
  color: string
  badge?: 'live' | 'soon'
}

export default function LeftPanel() {
  const { health, agents, online } = useBackend()

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
    { id: 'loops', label: 'Loops', status: 'None active', icon: '🔁', color: 'rgba(245, 158, 11, 0.15)' },
    { id: 'actions', label: 'Actions', status: 'Not available', icon: '🛠️', color: 'rgba(239, 68, 68, 0.15)', badge: 'soon' },
  ]

  return (
    <aside className="left-panel">
      <div className="panel-card">
        <h3>Core Engine</h3>
        {layers.map((layer) => (
          <div className="core-layer-row" key={layer.id}>
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
          </div>
        ))}
      </div>

      <div className="panel-card">
        <h3>Active Loops</h3>
        <div className="empty-hint">No active loops</div>
      </div>

      <div className="panel-card">
        <h3>Agent Operations</h3>
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
                  <span className={`core-layer-badge ${agent.status === 'active' ? 'live' : 'soon'}`}>
                    {agent.status}
                  </span>
                </div>
                <span className="core-layer-status">{agent.domain}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  )
}
