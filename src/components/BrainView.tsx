import { useMemo, useState, type WheelEvent } from 'react'
import { DOMAINS } from '../data/domains'
import { useBackend } from '../context/BackendContext'
import { useFloatPhysics, type PhysicsNode } from '../hooks/useFloatPhysics'
import { useElementSize } from '../hooks/useElementSize'
import './BrainView.css'

type NodeKind = 'core' | 'domain' | 'skill'

interface GraphNode extends PhysicsNode {
  kind: NodeKind
  label: string
  color: string
  parentId?: string
}

const SPHERE_RATIO = 0.65
const DOMAIN_ORBIT_RATIO = 0.52
const SKILL_ORBIT_RATIO = 0.22

const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5
const ZOOM_WHEEL_FACTOR = 0.0015
const SKILL_LABEL_ZOOM_THRESHOLD = 1.2

function buildGraph(width: number, height: number): { nodes: GraphNode[]; boundary: { cx: number; cy: number; radius: number } } {
  const center = { x: width / 2, y: height / 2 }
  const sphereRadius = width * SPHERE_RATIO
  const domainRadius = sphereRadius * DOMAIN_ORBIT_RATIO
  const skillRadius = sphereRadius * SKILL_ORBIT_RATIO

  const nodes: GraphNode[] = [
    { id: 'core', kind: 'core', label: 'M', color: '#9a9ab0', homeX: center.x, homeY: center.y },
  ]

  DOMAINS.forEach((domain, i) => {
    const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2
    const dx = center.x + Math.cos(angle) * domainRadius
    const dy = center.y + Math.sin(angle) * domainRadius

    nodes.push({ id: domain.id, kind: 'domain', label: domain.label, color: domain.color, homeX: dx, homeY: dy })

    domain.skills.forEach((skill, j) => {
      const skillAngle = (j / domain.skills.length) * Math.PI * 2
      const sx = dx + Math.cos(skillAngle) * skillRadius
      const sy = dy + Math.sin(skillAngle) * skillRadius

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

  return { nodes, boundary: { cx: center.x, cy: center.y, radius: sphereRadius } }
}

export default function BrainView() {
  const { activeDomains } = useBackend()
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(1)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })

  const { nodes: graph, boundary } = useMemo(() => buildGraph(width, height), [width, height])
  const nodeById = useMemo(() => new Map(graph.map((n) => [n.id, n])), [graph])
  const jitter = Math.max(width, 1) * 0.00021
  const positions = useFloatPhysics(graph, { jitter, boundary })

  const pos = (id: string): { x: number; y: number } => {
    const node = nodeById.get(id)
    const fallback = node ? { x: node.homeX, y: node.homeY } : { x: width / 2, y: height / 2 }
    return positions[id] ?? fallback
  }

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setOrigin({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    })
    setZoom((z) => {
      const next = z * (1 - e.deltaY * ZOOM_WHEEL_FACTOR)
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
    })
  }

  const zoomedIn = zoom > SKILL_LABEL_ZOOM_THRESHOLD

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
        <div
          className={`brain-globe ${zoomedIn ? 'zoomed-in' : ''}`}
          ref={containerRef}
          onWheel={handleWheel}
          style={{ transform: `scale(${zoom})`, transformOrigin: `${origin.x}% ${origin.y}%` }}
        >
          <svg className="brain-edges" viewBox={`0 0 ${width || 1} ${height || 1}`} preserveAspectRatio="none">
            {graph
              .filter((n) => n.kind === 'domain')
              .map((n) => {
                const a = pos('core')
                const b = pos(n.id)
                const active = activeDomains.has(n.id)
                return (
                  <line
                    key={n.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="brain-edge"
                    style={active ? { stroke: n.color, opacity: 0.7, strokeWidth: 1.2 } : undefined}
                  />
                )
              })}
            {graph
              .filter((n) => n.kind === 'skill')
              .map((n) => {
                const a = pos(n.parentId!)
                const b = pos(n.id)
                const active = activeDomains.has(n.parentId!)
                return (
                  <line
                    key={n.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className="brain-edge skill-edge"
                    style={active ? { stroke: n.color, opacity: 0.7, strokeWidth: 1.2 } : undefined}
                  />
                )
              })}
          </svg>

          {graph.map((n) => {
            const p = pos(n.id)
            const active = n.kind === 'domain' && activeDomains.has(n.id)
            return (
              <div
                key={n.id}
                className={`brain-node ${n.kind} ${active ? 'active' : ''}`}
                style={{ left: `${p.x}px`, top: `${p.y}px` }}
              >
                <span
                  className="brain-node-dot"
                  style={active ? { background: n.color, boxShadow: `0 0 16px 4px ${n.color}88` } : undefined}
                >
                  {n.kind === 'core' ? 'M' : null}
                </span>
                {n.kind !== 'core' && <span className="brain-node-label">{n.label}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
