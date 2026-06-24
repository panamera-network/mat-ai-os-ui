import { useMemo } from 'react'
import { DOMAINS } from '../data/domains'
import { useBackend } from '../context/BackendContext'
import { useFloatPhysics, type PhysicsNode } from '../hooks/useFloatPhysics'
import './BrainView.css'

type NodeKind = 'core' | 'domain' | 'skill'

interface GraphNode extends PhysicsNode {
  kind: NodeKind
  label: string
  color: string
  parentId?: string
}

const CENTER = { x: 50, y: 50 }
const MAX_RADIUS = 48
const DOMAIN_RADIUS_MIN = 8
const DOMAIN_RADIUS_MAX = 42
const SKILL_RADIUS_MIN = 3
const SKILL_RADIUS_MAX = 18

/** Keeps the layout within the circular viewport instead of clipping at the square edges. */
function clampToCircle(x: number, y: number, maxRadius = MAX_RADIUS): { x: number; y: number } {
  const dx = x - CENTER.x
  const dy = y - CENTER.y
  const dist = Math.hypot(dx, dy)
  if (dist <= maxRadius) return { x, y }
  const scale = maxRadius / dist
  return { x: CENTER.x + dx * scale, y: CENTER.y + dy * scale }
}

function buildGraph(): GraphNode[] {
  const nodes: GraphNode[] = [
    { id: 'core', kind: 'core', label: 'MAT.AI', color: '#9a9ab0', homeX: CENTER.x, homeY: CENTER.y },
  ]

  DOMAINS.forEach((domain, i) => {
    const baseAngle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2
    const angle = baseAngle + (Math.random() - 0.5) * 1.2
    const radius = DOMAIN_RADIUS_MIN + Math.random() * (DOMAIN_RADIUS_MAX - DOMAIN_RADIUS_MIN)
    const { x: dx, y: dy } = clampToCircle(CENTER.x + Math.cos(angle) * radius, CENTER.y + Math.sin(angle) * radius)

    nodes.push({
      id: domain.id,
      kind: 'domain',
      label: domain.label,
      color: domain.color,
      homeX: dx,
      homeY: dy,
    })

    domain.skills.forEach((skill) => {
      const skillAngle = Math.random() * Math.PI * 2
      const skillRadius = SKILL_RADIUS_MIN + Math.random() * (SKILL_RADIUS_MAX - SKILL_RADIUS_MIN)
      const { x: sx, y: sy } = clampToCircle(dx + Math.cos(skillAngle) * skillRadius, dy + Math.sin(skillAngle) * skillRadius)

      nodes.push({
        id: `${domain.id}-${skill}`,
        kind: 'skill',
        label: skill,
        color: domain.color,
        homeX: sx,
        homeY: sy,
        parentId: domain.id,
      })
    })
  })

  return nodes
}

export default function BrainView() {
  const graph = useMemo(buildGraph, [])
  const positions = useFloatPhysics(graph)
  const { activeDomains } = useBackend()

  const pos = (id: string, fallback: { x: number; y: number }) => positions[id] ?? fallback

  return (
    <div className="brain-view-wrap">
      <div className="brain-view-toolbar">
        <h3>Brain View</h3>
        <div className="brain-view-actions">
          <span className="brain-view-action">⛶</span>
          <span className="brain-view-action">⟳</span>
          <span className="brain-view-action">⤢</span>
        </div>
      </div>
      <div className="brain-view">
      <div className="brain-globe">
      <svg className="brain-edges" viewBox="0 0 100 100" preserveAspectRatio="none">
        {graph
          .filter((n) => n.kind === 'domain')
          .map((n) => {
            const a = pos('core', CENTER)
            const b = pos(n.id, { x: n.homeX, y: n.homeY })
            const active = activeDomains.has(n.id)
            return (
              <line
                key={n.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="brain-edge"
                style={active ? { stroke: n.color, opacity: 0.8 } : undefined}
              />
            )
          })}
        {graph
          .filter((n) => n.kind === 'skill')
          .map((n) => {
            const a = pos(n.parentId!, CENTER)
            const b = pos(n.id, { x: n.homeX, y: n.homeY })
            const active = activeDomains.has(n.parentId!)
            return (
              <line
                key={n.id}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className="brain-edge skill-edge"
                style={active ? { stroke: n.color, opacity: 0.7 } : undefined}
              />
            )
          })}
      </svg>

      {graph.map((n) => {
        const p = pos(n.id, { x: n.homeX, y: n.homeY })
        const active = n.kind === 'domain' && activeDomains.has(n.id)
        return (
          <div
            key={n.id}
            className={`brain-node ${n.kind} ${active ? 'active' : ''}`}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span
              className="brain-node-dot"
              style={active ? { background: n.color, boxShadow: `0 0 16px 4px ${n.color}88` } : undefined}
            />
            {n.kind !== 'skill' && <span className="brain-node-label">{n.label}</span>}
            {n.kind === 'skill' && <span className="brain-node-tooltip">{n.label}</span>}
          </div>
        )
      })}
      </div>
      </div>
    </div>
  )
}
