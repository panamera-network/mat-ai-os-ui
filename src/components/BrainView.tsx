import { useEffect, useMemo, useState, type MouseEvent, type WheelEvent } from 'react'
import { DOMAINS } from '../data/domains'
import { useBackend } from '../context/BackendContext'
import { useFloatPhysics, type PhysicsNode } from '../hooks/useFloatPhysics'
import { useElementSize } from '../hooks/useElementSize'
import { API_BASE_URL } from '../config'
import './BrainView.css'

type NodeKind = 'core' | 'domain' | 'skill' | 'agent' | 'memory'
type ViewMode = 'skills' | 'knowledge'

interface GraphNode extends PhysicsNode {
  kind: NodeKind
  label: string
  color: string
  parentId?: string
}

interface KGNode {
  id: string
  type: string
  label: string
  metadata: Record<string, unknown>
}

interface KGEdge {
  from: string
  to: string
  relationship: string
}

interface KGNodeDetail {
  node: KGNode
  connections: { node: KGNode; relationship: string; direction: 'incoming' | 'outgoing' }[]
}

const SPHERE_RATIO = 0.65
const DOMAIN_ORBIT_RATIO = 0.52
const SKILL_ORBIT_RATIO = 0.22
const KG_AGENT_ORBIT_RATIO = 0.34

const MIN_ZOOM = 0.4
const MAX_ZOOM = 2.5
const ZOOM_WHEEL_FACTOR = 0.0015
const SKILL_LABEL_ZOOM_THRESHOLD = 1.2

const DOMAIN_COLOR: Record<string, string> = Object.fromEntries(DOMAINS.map((d) => [d.id, d.color]))
const AGENT_COLOR = '#a78bfa'
const MEMORY_COLOR = '#4a4a56'

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

function buildKnowledgeGraph(
  kgNodes: KGNode[],
  kgEdges: KGEdge[],
  width: number,
  height: number,
): { nodes: GraphNode[]; boundary: { cx: number; cy: number; radius: number } } {
  const center = { x: width / 2, y: height / 2 }
  const sphereRadius = width * SPHERE_RATIO
  const domainRadius = sphereRadius * DOMAIN_ORBIT_RATIO
  const skillRadius = sphereRadius * SKILL_ORBIT_RATIO
  const agentRadius = sphereRadius * KG_AGENT_ORBIT_RATIO

  const nodeById = new Map(kgNodes.map((n) => [n.id, n]))
  const domainNodes = kgNodes.filter((n) => n.type === 'domain')

  const nodes: GraphNode[] = [
    { id: '__core__', kind: 'core', label: 'M', color: '#9a9ab0', homeX: center.x, homeY: center.y },
  ]

  const domainPos = new Map<string, { x: number; y: number; color: string }>()
  domainNodes.forEach((d, i) => {
    const angle = (i / domainNodes.length) * Math.PI * 2 - Math.PI / 2
    const x = center.x + Math.cos(angle) * domainRadius
    const y = center.y + Math.sin(angle) * domainRadius
    const color = DOMAIN_COLOR[d.label] ?? '#8b8ba0'
    domainPos.set(d.id, { x, y, color })
    nodes.push({ id: d.id, kind: 'domain', label: d.label, color, homeX: x, homeY: y })
  })

  const skillsByDomain = new Map<string, KGNode[]>()
  const agentsByDomain = new Map<string, KGNode[]>()
  for (const e of kgEdges) {
    if (e.relationship === 'belongs_to') {
      const n = nodeById.get(e.from)
      if (n) skillsByDomain.set(e.to, [...(skillsByDomain.get(e.to) ?? []), n])
    } else if (e.relationship === 'operates_in') {
      const n = nodeById.get(e.from)
      if (n) agentsByDomain.set(e.to, [...(agentsByDomain.get(e.to) ?? []), n])
    }
  }

  for (const [domainId, dp] of domainPos) {
    const skills = skillsByDomain.get(domainId) ?? []
    skills.forEach((s, j) => {
      const angle = (j / Math.max(skills.length, 1)) * Math.PI * 2
      const x = dp.x + Math.cos(angle) * skillRadius
      const y = dp.y + Math.sin(angle) * skillRadius
      nodes.push({ id: s.id, kind: 'skill', label: s.label, color: dp.color, homeX: x, homeY: y, parentId: domainId })
    })

    const agents = agentsByDomain.get(domainId) ?? []
    agents.forEach((a, j) => {
      const angle = (j / Math.max(agents.length, 1)) * Math.PI * 2 + Math.PI / Math.max(agents.length, 1)
      const x = dp.x + Math.cos(angle) * agentRadius
      const y = dp.y + Math.sin(angle) * agentRadius
      nodes.push({ id: a.id, kind: 'agent', label: a.label, color: AGENT_COLOR, homeX: x, homeY: y, parentId: domainId })
    })
  }

  const placedIds = new Set(nodes.map((n) => n.id))
  const memoryNodes = kgNodes.filter((n) => n.type === 'memory')
  memoryNodes.forEach((m) => {
    const edge = kgEdges.find((e) => e.from === m.id || e.to === m.id)
    const otherId = edge ? (edge.from === m.id ? edge.to : edge.from) : undefined
    const anchor = otherId ? nodes.find((n) => n.id === otherId) : undefined
    const baseX = anchor?.homeX ?? center.x
    const baseY = anchor?.homeY ?? center.y
    const jitterAngle = Math.random() * Math.PI * 2
    nodes.push({
      id: m.id,
      kind: 'memory',
      label: m.label,
      color: MEMORY_COLOR,
      homeX: baseX + Math.cos(jitterAngle) * 14,
      homeY: baseY + Math.sin(jitterAngle) * 14,
      parentId: otherId,
    })
    placedIds.add(m.id)
  })

  return { nodes, boundary: { cx: center.x, cy: center.y, radius: sphereRadius } }
}

export default function BrainView() {
  const { activeDomains } = useBackend()
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>()
  const [zoom, setZoom] = useState(1)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const [mode, setMode] = useState<ViewMode>('skills')

  const [kgNodes, setKgNodes] = useState<KGNode[]>([])
  const [kgEdges, setKgEdges] = useState<KGEdge[]>([])
  const [kgLoading, setKgLoading] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })
  const [selectedDetail, setSelectedDetail] = useState<KGNodeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (mode !== 'knowledge') return
    let cancelled = false
    setKgLoading(true)
    fetch(`${API_BASE_URL}/knowledge`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`Request failed: ${res.status}`))))
      .then((data: { nodes: KGNode[]; edges: KGEdge[] }) => {
        if (cancelled) return
        setKgNodes(data.nodes)
        setKgEdges(data.edges)
      })
      .catch(() => {
        if (!cancelled) {
          setKgNodes([])
          setKgEdges([])
        }
      })
      .finally(() => {
        if (!cancelled) setKgLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [mode])

  const { nodes: skillsGraph, boundary: skillsBoundary } = useMemo(() => buildGraph(width, height), [width, height])
  const { nodes: kgGraph, boundary: kgBoundary } = useMemo(
    () => buildKnowledgeGraph(kgNodes, kgEdges, width, height),
    [kgNodes, kgEdges, width, height],
  )

  const graph = mode === 'knowledge' ? kgGraph : skillsGraph
  const boundary = mode === 'knowledge' ? kgBoundary : skillsBoundary
  const nodeById = useMemo(() => new Map(graph.map((n) => [n.id, n])), [graph])
  const jitter = Math.max(width, 1) * 0.00021
  const positions = useFloatPhysics(graph, { jitter, boundary })

  const pos = (id: string): { x: number; y: number } => {
    const node = nodeById.get(id)
    const fallback = node ? { x: node.homeX, y: node.homeY } : { x: width / 2, y: height / 2 }
    return positions[id] ?? fallback
  }

  const connectionCount = (id: string) => kgEdges.filter((e) => e.from === id || e.to === id).length

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

  const switchMode = (next: ViewMode) => {
    setMode(next)
    setHoveredId(null)
    setSelectedDetail(null)
  }

  const handleNodeHover = (id: string, e: MouseEvent) => {
    if (mode !== 'knowledge' || id === '__core__') return
    setHoveredId(id)
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  const handleNodeClick = async (id: string) => {
    if (mode !== 'knowledge' || id === '__core__') return
    setDetailLoading(true)
    setSelectedDetail(null)
    try {
      const res = await fetch(`${API_BASE_URL}/knowledge/${encodeURIComponent(id)}`)
      if (res.ok) {
        const data: KGNodeDetail = await res.json()
        setSelectedDetail(data)
      }
    } catch {
      // leave the panel empty on failure
    } finally {
      setDetailLoading(false)
    }
  }

  const zoomedIn = zoom > SKILL_LABEL_ZOOM_THRESHOLD
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) : null

  return (
    <div className="brain-view-wrap">
      <div className="brain-view-toolbar">
        <h3>Brain View</h3>
        <div className="brain-mode-toggle">
          <button type="button" className={mode === 'skills' ? 'active' : ''} onClick={() => switchMode('skills')}>
            Skills
          </button>
          <button type="button" className={mode === 'knowledge' ? 'active' : ''} onClick={() => switchMode('knowledge')}>
            Knowledge
          </button>
        </div>
        <div className="brain-view-actions">
          <span className="brain-view-action">⛶</span>
          <span className="brain-view-action">⟳</span>
          <span className="brain-view-action">⤢</span>
        </div>
      </div>
      <div className="brain-view">
        {mode === 'knowledge' && kgLoading && <div className="brain-view-loading">Loading knowledge graph…</div>}
        <div
          className={`brain-globe ${zoomedIn ? 'zoomed-in' : ''}`}
          ref={containerRef}
          onWheel={handleWheel}
          style={{ transform: `scale(${zoom})`, transformOrigin: `${origin.x}% ${origin.y}%` }}
        >
          <svg className="brain-edges" viewBox={`0 0 ${width || 1} ${height || 1}`} preserveAspectRatio="none">
            {mode === 'skills' &&
              graph
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
            {mode === 'skills' &&
              graph
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

            {mode === 'knowledge' &&
              graph
                .filter((n) => n.kind === 'domain')
                .map((n) => {
                  const a = pos('__core__')
                  const b = pos(n.id)
                  return <line key={`core-${n.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="brain-edge" />
                })}
            {mode === 'knowledge' &&
              kgEdges.map((e, i) => {
                if (!nodeById.has(e.from) || !nodeById.has(e.to)) return null
                const a = pos(e.from)
                const b = pos(e.to)
                return (
                  <line
                    key={`${e.from}-${e.to}-${i}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    className={`brain-edge kg-edge kg-edge-${e.relationship}`}
                  />
                )
              })}
          </svg>

          {graph.map((n) => {
            const p = pos(n.id)
            const active = mode === 'skills' && n.kind === 'domain' && activeDomains.has(n.id)
            return (
              <div
                key={n.id}
                className={`brain-node ${n.kind} ${active ? 'active' : ''} ${hoveredId === n.id ? 'hovered' : ''}`}
                style={{ left: `${p.x}px`, top: `${p.y}px` }}
                onMouseEnter={(e) => handleNodeHover(n.id, e)}
                onMouseLeave={() => setHoveredId((current) => (current === n.id ? null : current))}
                onClick={() => handleNodeClick(n.id)}
              >
                <span
                  className="brain-node-dot"
                  style={
                    active
                      ? { background: n.color, boxShadow: `0 0 16px 4px ${n.color}88` }
                      : n.kind === 'agent' || n.kind === 'domain'
                        ? { background: n.color }
                        : undefined
                  }
                >
                  {n.kind === 'core' ? 'M' : null}
                </span>
                {n.kind !== 'core' && n.kind !== 'memory' && <span className="brain-node-label">{n.label}</span>}
              </div>
            )
          })}
        </div>

        {mode === 'knowledge' && hoveredNode && (
          <div className="brain-tooltip" style={{ left: hoverPos.x, top: hoverPos.y }}>
            <div className="brain-tooltip-type">{hoveredNode.kind}</div>
            <div className="brain-tooltip-label">{hoveredNode.label}</div>
            <div className="brain-tooltip-connections">{connectionCount(hoveredNode.id)} connection(s)</div>
          </div>
        )}

        {mode === 'knowledge' && (detailLoading || selectedDetail) && (
          <div className="brain-detail-panel">
            <button type="button" className="brain-detail-close" onClick={() => setSelectedDetail(null)} aria-label="Close">
              ✕
            </button>
            {detailLoading && <div className="empty-hint">Loading…</div>}
            {!detailLoading && selectedDetail && (
              <>
                <div className="brain-detail-type">{selectedDetail.node.type}</div>
                <div className="brain-detail-label">{selectedDetail.node.label}</div>
                {Object.entries(selectedDetail.node.metadata).map(([key, value]) => (
                  <div className="brain-detail-meta-row" key={key}>
                    <span>{key}</span>
                    <span className="value-muted">{String(value)}</span>
                  </div>
                ))}
                <div className="brain-detail-section-title">Connections ({selectedDetail.connections.length})</div>
                {selectedDetail.connections.map((c, i) => (
                  <div className="brain-detail-connection" key={i}>
                    <span className="brain-detail-connection-rel">{c.relationship}</span>
                    <span>{c.node.label}</span>
                    <span className="value-muted">({c.node.type})</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
