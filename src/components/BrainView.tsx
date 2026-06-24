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
const DOMAIN_RADIUS = 30
const SKILL_RADIUS = 10

function buildGraph(): GraphNode[] {
  const nodes: GraphNode[] = [
    { id: 'core', kind: 'core', label: 'MAT.AI', color: '#9a9ab0', homeX: CENTER.x, homeY: CENTER.y },
  ]

  DOMAINS.forEach((domain, i) => {
    const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2
    const dx = CENTER.x + Math.cos(angle) * DOMAIN_RADIUS
    const dy = CENTER.y + Math.sin(angle) * DOMAIN_RADIUS * 0.85

    nodes.push({
      id: domain.id,
      kind: 'domain',
      label: domain.label,
      color: domain.color,
      homeX: dx,
      homeY: dy,
    })

    domain.skills.forEach((skill, j) => {
      const skillAngle = angle + (j - (domain.skills.length - 1) / 2) * (Math.PI * 2 / domain.skills.length)
      const sx = dx + Math.cos(skillAngle) * SKILL_RADIUS
      const sy = dy + Math.sin(skillAngle) * SKILL_RADIUS * 0.85

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
            <span className="brain-node-label">{n.label}</span>
          </div>
        )
      })}
      </div>
    </div>
  )
}
