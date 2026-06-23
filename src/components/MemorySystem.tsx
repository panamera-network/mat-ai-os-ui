import './MemorySystem.css'

interface MemoryTier {
  id: string
  label: string
  icon: string
  color: string
  hint: string
}

const MEMORY_TIERS: MemoryTier[] = [
  { id: 'hot', label: 'Hot Memory', icon: '🔥', color: 'rgba(239, 68, 68, 0.15)', hint: 'Current context' },
  { id: 'warm', label: 'Warm Memory', icon: '☀️', color: 'rgba(245, 158, 11, 0.15)', hint: 'Recent activities' },
  { id: 'cold', label: 'Cold Memory', icon: '❄️', color: 'rgba(59, 130, 246, 0.15)', hint: 'Long-term knowledge' },
  { id: 'archive', label: 'Archive', icon: '🗄️', color: 'rgba(139, 92, 246, 0.15)', hint: 'Historical data' },
]

export default function MemorySystem() {
  return (
    <div className="panel-card">
      <h3>Memory System</h3>
      <div className="memory-grid">
        {MEMORY_TIERS.map((tier) => (
          <div className="memory-tier-card" key={tier.id}>
            <span className="memory-tier-icon" style={{ background: tier.color }}>
              {tier.icon}
            </span>
            <div className="memory-tier-text">
              <div className="memory-tier-label">{tier.label}</div>
              <div className="memory-tier-value">{tier.hint}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
