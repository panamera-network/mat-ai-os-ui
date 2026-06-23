import './LeftPanel.css'

interface CoreLayer {
  id: string
  label: string
  status: string
  icon: string
  color: string
  badge?: 'live' | 'soon'
}

const LAYERS: CoreLayer[] = [
  { id: 'memory', label: 'Memory', status: 'Idle', icon: '🧠', color: 'rgba(139, 92, 246, 0.15)' },
  { id: 'skills', label: 'Skills', status: '69 loaded', icon: '⚡', color: 'rgba(59, 130, 246, 0.15)' },
  { id: 'agents', label: 'Agents', status: 'Idle', icon: '🤖', color: 'rgba(34, 197, 94, 0.15)', badge: 'live' },
  { id: 'loops', label: 'Loops', status: 'None active', icon: '🔁', color: 'rgba(245, 158, 11, 0.15)' },
  { id: 'actions', label: 'Actions', status: 'Not available', icon: '🛠️', color: 'rgba(239, 68, 68, 0.15)', badge: 'soon' },
]

export default function LeftPanel() {
  return (
    <aside className="left-panel">
      <div className="panel-card">
        <h3>Core Engine</h3>
        {LAYERS.map((layer) => (
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
        <div className="empty-hint">No operations running</div>
      </div>
    </aside>
  )
}
