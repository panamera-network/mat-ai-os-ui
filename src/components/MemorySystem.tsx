import { useState, type CSSProperties } from 'react'
import { useBackend } from '../context/BackendContext'
import { API_BASE_URL } from '../config'
import './MemorySystem.css'

interface MemoryTier {
  id: string
  label: string
  icon: string
  bg: string
  accent: string
  hint: string
}

const MEMORY_TIERS: MemoryTier[] = [
  { id: 'hot', label: 'Hot Memory', icon: '🔥', bg: 'rgba(239, 68, 68, 0.15)', accent: 'var(--accent-red)', hint: 'Current context' },
  { id: 'warm', label: 'Warm Memory', icon: '☀️', bg: 'rgba(245, 158, 11, 0.15)', accent: 'var(--accent-amber)', hint: 'Recent activities' },
  { id: 'cold', label: 'Cold Memory', icon: '❄️', bg: 'rgba(59, 130, 246, 0.15)', accent: 'var(--accent-blue)', hint: 'Long-term knowledge' },
  { id: 'archive', label: 'Archive', icon: '🗄️', bg: 'rgba(139, 92, 246, 0.15)', accent: 'var(--accent-purple)', hint: 'Historical data' },
]

interface PopoverPosition {
  left: number
  top: number
  width: number
}

interface TierMemory {
  id?: string
  memory?: string
  text?: string
  content?: string
  created_at?: string
}

export default function MemorySystem() {
  const { health, online, memoryTiers } = useBackend()
  const [openTier, setOpenTier] = useState<MemoryTier | null>(null)
  const [popoverPos, setPopoverPos] = useState<PopoverPosition>({ left: 0, top: 0, width: 0 })
  const [tierMemories, setTierMemories] = useState<TierMemory[]>([])
  const [loadingTier, setLoadingTier] = useState(false)

  const loadTierMemories = async (tierId: string) => {
    setLoadingTier(true)
    try {
      const res = await fetch(`${API_BASE_URL}/memory/tiers/${tierId}?limit=10`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data: { memories: TierMemory[] } = await res.json()
        setTierMemories(data.memories)
      } else {
        setTierMemories([])
      }
    } catch {
      setTierMemories([])
    } finally {
      setLoadingTier(false)
    }
  }

  const toggleTier = (tier: MemoryTier, el: HTMLElement) => {
    if (openTier?.id === tier.id) {
      setOpenTier(null)
      return
    }
    const rect = el.getBoundingClientRect()
    setPopoverPos({ left: rect.left, top: rect.bottom + 6, width: rect.width })
    setOpenTier(tier)
    setTierMemories([])
    loadTierMemories(tier.id)
  }

  return (
    <div className="panel-card">
      <h3>Memory System</h3>
      <div className="memory-summary">
        {online && health
          ? `${health.agents_count} agent${health.agents_count === 1 ? '' : 's'} · ${health.skills_count} skills · ${health.domains_count} domains`
          : 'Backend offline'}
      </div>
      <div className="memory-grid">
        {MEMORY_TIERS.map((tier) => {
          const count = memoryTiers?.counts[tier.id]
          return (
            <div
              className={`memory-tier-card ${openTier?.id === tier.id ? 'active' : ''}`}
              key={tier.id}
              style={{ '--tier-accent': tier.accent } as CSSProperties}
              onClick={(e) => toggleTier(tier, e.currentTarget)}
              role="button"
              tabIndex={0}
            >
              <span className="memory-tier-icon" style={{ background: tier.bg }}>
                {tier.icon}
              </span>
              <div className="memory-tier-text">
                <div className="memory-tier-label">{tier.label}</div>
                <div className="memory-tier-value">{tier.hint}</div>
              </div>
              {count !== undefined && <span className="memory-tier-badge">{count}</span>}
            </div>
          )
        })}
      </div>

      {openTier && <div className="memory-popover-backdrop" onClick={() => setOpenTier(null)} />}
      {openTier && (
        <div
          className="memory-popover"
          style={{ left: popoverPos.left, top: popoverPos.top, '--tier-accent': openTier.accent } as CSSProperties}
        >
          <div className="memory-popover-title">
            {openTier.label} ({memoryTiers?.counts[openTier.id] ?? 0})
          </div>
          {loadingTier && <div className="memory-popover-note">Loading…</div>}
          {!loadingTier && tierMemories.length === 0 && <div className="memory-popover-note">No memories in this tier.</div>}
          {!loadingTier &&
            tierMemories.map((m, i) => (
              <div className="memory-popover-row memory-popover-entry" key={m.id ?? i}>
                <span className="memory-popover-entry-text">{m.memory || m.text || m.content || '—'}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
