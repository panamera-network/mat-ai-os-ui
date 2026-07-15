import { useEffect, useMemo, useRef, useState, type MouseEvent, type WheelEvent } from 'react'
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

const DOMAIN_ICONS: Record<string, string> = {
  trading:        '📈',
  coding:         '⌨️',
  research:       '🔬',
  business:       '💼',
  personal:       '✅',
  legal:          '⚖️',
  creative:       '🎨',
  ai_automation:  '🤖',
  data_analytics: '📊',
  web3_blockchain:'⛓️',
}

// Seeded pseudo-random stars so they don't regenerate on every re-render
function genStars() {
  let s = 42
  const rand = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0xFFFFFFFF }
  return Array.from({ length: 90 }, (_, i) => ({
    id: i,
    cx: rand() * 100,
    cy: rand() * 100,
    r:  rand() * 1.1 + 0.2,
    op: rand() * 0.45 + 0.08,
  }))
}
const STARS = genStars()

function buildGraph(width: number, height: number) {
  const center = { x: width / 2, y: height / 2 }
  const sphereRadius = width * SPHERE_RATIO
  const domainRadius = sphereRadius * DOMAIN_ORBIT_RATIO
  const skillRadius  = sphereRadius * SKILL_ORBIT_RATIO

  const nodes: GraphNode[] = [
    { id: 'core', kind: 'core', label: 'M', color: '#9a9ab0', homeX: center.x, homeY: center.y },
  ]

  DOMAINS.forEach((domain, i) => {
    const angle = (i / DOMAINS.length) * Math.PI * 2 - Math.PI / 2
    const dx = center.x + Math.cos(angle) * domainRadius
    const dy = center.y + Math.sin(angle) * domainRadius
    nodes.push({ id: domain.id, kind: 'domain', label: domain.label, color: domain.color, homeX: dx, homeY: dy })

    domain.skills.forEach((skill, j) => {
      const sa = (j / domain.skills.length) * Math.PI * 2
      nodes.push({
        id: `${domain.id}-${skill}`, kind: 'skill', label: skill,
        color: domain.color, homeX: dx + Math.cos(sa) * skillRadius, homeY: dy + Math.sin(sa) * skillRadius,
        parentId: domain.id,
      })
    })
  })

  return { nodes, boundary: { cx: center.x, cy: center.y, radius: sphereRadius }, domainRadius }
}

function buildKnowledgeGraph(kgNodes: KGNode[], kgEdges: KGEdge[], width: number, height: number) {
  const center = { x: width / 2, y: height / 2 }
  const sphereRadius = width * SPHERE_RATIO
  const domainRadius = sphereRadius * DOMAIN_ORBIT_RATIO
  const skillRadius  = sphereRadius * SKILL_ORBIT_RATIO
  const agentRadius  = sphereRadius * KG_AGENT_ORBIT_RATIO

  const nodeById    = new Map(kgNodes.map((n) => [n.id, n]))
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
      nodes.push({ id: s.id, kind: 'skill', label: s.label, color: dp.color,
        homeX: dp.x + Math.cos(angle) * skillRadius, homeY: dp.y + Math.sin(angle) * skillRadius, parentId: domainId })
    })
    const agents = agentsByDomain.get(domainId) ?? []
    agents.forEach((a, j) => {
      const angle = (j / Math.max(agents.length, 1)) * Math.PI * 2 + Math.PI / Math.max(agents.length, 1)
      nodes.push({ id: a.id, kind: 'agent', label: a.label, color: AGENT_COLOR,
        homeX: dp.x + Math.cos(angle) * agentRadius, homeY: dp.y + Math.sin(angle) * agentRadius, parentId: domainId })
    })
  }

  const memoryNodes = kgNodes.filter((n) => n.type === 'memory')
  memoryNodes.forEach((m) => {
    const edge   = kgEdges.find((e) => e.from === m.id || e.to === m.id)
    const other  = edge ? (edge.from === m.id ? edge.to : edge.from) : undefined
    const anchor = other ? nodes.find((n) => n.id === other) : undefined
    const bx = anchor?.homeX ?? center.x
    const by = anchor?.homeY ?? center.y
    const ja = Math.random() * Math.PI * 2
    nodes.push({ id: m.id, kind: 'memory', label: m.label, color: MEMORY_COLOR,
      homeX: bx + Math.cos(ja) * 14, homeY: by + Math.sin(ja) * 14, parentId: other })
  })

  return { nodes, boundary: { cx: center.x, cy: center.y, radius: sphereRadius }, domainRadius }
}

export default function BrainView() {
  const { activeDomains } = useBackend()
  const [containerRef, { width, height }] = useElementSize<HTMLDivElement>()
  const [zoom,   setZoom]   = useState(1)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const [pan,    setPan]    = useState({ x: 0, y: 0 })
  const [mode,   setMode]   = useState<ViewMode>('skills')
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  const [kgNodes,        setKgNodes]        = useState<KGNode[]>([])
  const [kgEdges,        setKgEdges]        = useState<KGEdge[]>([])
  const [kgLoading,      setKgLoading]      = useState(false)
  const [hoveredId,      setHoveredId]      = useState<string | null>(null)
  const [hoverPos,       setHoverPos]       = useState({ x: 0, y: 0 })
  const [selectedDetail, setSelectedDetail] = useState<KGNodeDetail | null>(null)
  const [detailLoading,  setDetailLoading]  = useState(false)

  useEffect(() => {
    if (mode !== 'knowledge') return
    let cancelled = false
    setKgLoading(true)
    fetch(`${API_BASE_URL}/knowledge`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { nodes: KGNode[]; edges: KGEdge[] }) => {
        if (!cancelled) { setKgNodes(data.nodes); setKgEdges(data.edges) }
      })
      .catch(() => { if (!cancelled) { setKgNodes([]); setKgEdges([]) } })
      .finally(() => { if (!cancelled) setKgLoading(false) })
    return () => { cancelled = true }
  }, [mode])

  const { nodes: skillsGraph, boundary: skillsBoundary, domainRadius: skillsDR } =
    useMemo(() => buildGraph(width, height), [width, height])
  const { nodes: kgGraph, boundary: kgBoundary, domainRadius: kgDR } =
    useMemo(() => buildKnowledgeGraph(kgNodes, kgEdges, width, height), [kgNodes, kgEdges, width, height])

  const graph        = mode === 'knowledge' ? kgGraph      : skillsGraph
  const boundary     = mode === 'knowledge' ? kgBoundary   : skillsBoundary
  const domainRadius = mode === 'knowledge' ? kgDR         : skillsDR
  const nodeById     = useMemo(() => new Map(graph.map((n) => [n.id, n])), [graph])
  const positions    = useFloatPhysics(graph, { jitter: 0, boundary })

  const pos = (id: string) => {
    const node = nodeById.get(id)
    const fallback = node ? { x: node.homeX, y: node.homeY } : { x: width / 2, y: height / 2 }
    return positions[id] ?? fallback
  }

  const coreId = mode === 'knowledge' ? '__core__' : 'core'

  const connectionCount = (id: string) => kgEdges.filter((e) => e.from === id || e.to === id).length

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
  }

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    setPan({
      x: dragRef.current.panX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.panY + (e.clientY - dragRef.current.startY),
    })
  }

  const handleMouseUp = () => { dragRef.current = null }

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setOrigin({ x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 })
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * (1 - e.deltaY * ZOOM_WHEEL_FACTOR))))
  }

  const switchMode = (next: ViewMode) => { setMode(next); setHoveredId(null); setSelectedDetail(null) }

  const wrapRef = useRef<HTMLDivElement>(null)

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
  }

  const handleReset = () => {
    setZoom(1)
    setOrigin({ x: 50, y: 50 })
    setPan({ x: 0, y: 0 })
    if (mode === 'knowledge') {
      setKgNodes([])
      setKgEdges([])
      setKgLoading(true)
      fetch(`${API_BASE_URL}/knowledge`)
        .then(r => r.ok ? r.json() : Promise.reject())
        .then((data: { nodes: KGNode[]; edges: KGEdge[] }) => { setKgNodes(data.nodes); setKgEdges(data.edges) })
        .catch(() => {})
        .finally(() => setKgLoading(false))
    }
  }

  const handleNodeHover = (id: string, e: MouseEvent) => {
    if (mode !== 'knowledge' || id === '__core__') return
    setHoveredId(id)
    setHoverPos({ x: e.clientX, y: e.clientY })
  }

  const handleNodeClick = async (id: string) => {
    if (mode !== 'knowledge' || id === '__core__') return
    setDetailLoading(true); setSelectedDetail(null)
    try {
      const res = await fetch(`${API_BASE_URL}/knowledge/${encodeURIComponent(id)}`)
      if (res.ok) setSelectedDetail(await res.json())
    } catch { /* leave empty */ } finally { setDetailLoading(false) }
  }

  const zoomedIn   = zoom > SKILL_LABEL_ZOOM_THRESHOLD
  const hoveredNode = hoveredId ? nodeById.get(hoveredId) : null
  const cp          = pos(coreId)

  return (
    <div className="brain-view-wrap" ref={wrapRef}>
      {/* ── TOOLBAR ── */}
      <div className="brain-view-toolbar">
        <span className="brain-view-title">BRAIN VIEW <span className="brain-view-info">ⓘ</span></span>
        <div className="brain-mode-toggle">
          <button type="button" className={mode === 'skills'    ? 'active' : ''} onClick={() => switchMode('skills')}>Skills</button>
          <button type="button" className={mode === 'knowledge' ? 'active' : ''} onClick={() => switchMode('knowledge')}>Knowledge</button>
        </div>
        <div className="brain-view-actions">
          <span className="brain-view-action" onClick={handleFullscreen} title="Fullscreen">⛶</span>
          <span className="brain-view-action" onClick={handleReset} title="Reset view">⟳</span>
          <span className="brain-view-action" title="More options">⋮</span>
        </div>
      </div>

      {/* ── CANVAS ── */}
      <div
        className="brain-view"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: 'grab' }}
      >
        {mode === 'knowledge' && kgLoading && <div className="brain-view-loading">Loading knowledge graph…</div>}

        <div
          className={`brain-globe ${zoomedIn ? 'zoomed-in' : ''}`}
          ref={containerRef}
          onWheel={handleWheel}
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: `${origin.x}% ${origin.y}%` }}
        >
          <svg className="brain-edges" viewBox={`0 0 ${width || 1} ${height || 1}`} preserveAspectRatio="none">
            <defs>
              <radialGradient id="bv-core-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#7c3aed" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0"/>
              </radialGradient>
            </defs>

            {/* Starfield */}
            {STARS.map(s => (
              <circle key={s.id} cx={`${s.cx}%`} cy={`${s.cy}%`} r={s.r} fill="white" opacity={s.op} />
            ))}

            {/* Orbit rings */}
            {width > 0 && <>
              <circle cx={cp.x} cy={cp.y} r={domainRadius * 0.38}
                fill="none" stroke="rgba(139,92,246,0.14)" strokeWidth="0.8" strokeDasharray="3 6" />
              <circle cx={cp.x} cy={cp.y} r={domainRadius * 0.95}
                fill="none" stroke="rgba(139,92,246,0.1)"  strokeWidth="0.8" strokeDasharray="3 8" />
              {/* Core ambient glow */}
              <circle cx={cp.x} cy={cp.y} r={domainRadius * 0.18} fill="url(#bv-core-glow)" />
            </>}

            {/* Domain edges */}
            {mode === 'skills' && graph.filter(n => n.kind === 'domain').map(n => {
              const a = cp; const b = pos(n.id)
              const active = activeDomains.has(n.id)
              return (
                <line key={n.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? n.color : 'rgba(139,92,246,0.35)'}
                  strokeWidth={active ? 1.2 : 0.8}
                  strokeDasharray={active ? '5 5' : '4 6'}
                  opacity={active ? 0.75 : 0.45} />
              )
            })}

            {/* Skill edges */}
            {mode === 'skills' && graph.filter(n => n.kind === 'skill').map(n => {
              const a = pos(n.parentId!); const b = pos(n.id)
              const active = activeDomains.has(n.parentId!)
              return (
                <line key={n.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={active ? n.color : 'rgba(255,255,255,0.12)'}
                  strokeWidth="0.5" opacity={active ? 0.5 : 0.2} />
              )
            })}

            {/* Knowledge edges */}
            {mode === 'knowledge' && graph.filter(n => n.kind === 'domain').map(n => {
              const b = pos(n.id)
              return <line key={`c-${n.id}`} x1={cp.x} y1={cp.y} x2={b.x} y2={b.y}
                stroke="rgba(139,92,246,0.4)" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.6" />
            })}
            {mode === 'knowledge' && kgEdges.map((e, i) => {
              if (!nodeById.has(e.from) || !nodeById.has(e.to)) return null
              const a = pos(e.from); const b = pos(e.to)
              return <line key={`${e.from}-${e.to}-${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                className={`brain-edge kg-edge kg-edge-${e.relationship}`} />
            })}
          </svg>

          {/* ── NODES ── */}
          {graph.map((n) => {
            const p      = pos(n.id)
            const active = mode === 'skills' && n.kind === 'domain' && activeDomains.has(n.id)

            if (n.kind === 'core') {
              return (
                <div key={n.id} className="brain-node core" style={{ left: `${p.x}px`, top: `${p.y}px` }}>
                  <div className="brain-core-glow" />
                  <div className="brain-core-hex">
                    <span className="brain-core-letter">M</span>
                  </div>
                </div>
              )
            }

            if (n.kind === 'domain') {
              const icon = DOMAIN_ICONS[n.id] ?? '⚡'
              return (
                <div
                  key={n.id}
                  className={`brain-node domain ${active ? 'active' : ''} ${hoveredId === n.id ? 'hovered' : ''}`}
                  style={{ left: `${p.x}px`, top: `${p.y}px` }}
                  onMouseEnter={(e) => handleNodeHover(n.id, e)}
                  onMouseLeave={() => setHoveredId((c) => c === n.id ? null : c)}
                  onClick={() => handleNodeClick(n.id)}
                >
                  <div
                    className="brain-domain-icon"
                    style={{
                      background:  `${n.color}22`,
                      borderColor: active ? n.color : `${n.color}66`,
                      boxShadow:   active ? `0 0 18px ${n.color}88, 0 0 6px ${n.color}44 inset` : `0 0 8px ${n.color}22`,
                    }}
                  >
                    <span>{icon}</span>
                  </div>
                  <span className="brain-node-label">{n.label}</span>
                </div>
              )
            }

            return (
              <div
                key={n.id}
                className={`brain-node ${n.kind} ${hoveredId === n.id ? 'hovered' : ''}`}
                style={{ left: `${p.x}px`, top: `${p.y}px` }}
                onMouseEnter={(e) => handleNodeHover(n.id, e)}
                onMouseLeave={() => setHoveredId((c) => c === n.id ? null : c)}
                onClick={() => handleNodeClick(n.id)}
              >
                <span
                  className="brain-node-dot"
                  style={
                    n.kind === 'agent' || n.kind === 'domain'
                      ? { background: n.color }
                      : undefined
                  }
                />
                {n.kind !== 'memory' && <span className="brain-node-label">{n.label}</span>}
              </div>
            )
          })}
        </div>

        {/* Tooltip */}
        {mode === 'knowledge' && hoveredNode && (
          <div className="brain-tooltip" style={{ left: hoverPos.x, top: hoverPos.y }}>
            <div className="brain-tooltip-type">{hoveredNode.kind}</div>
            <div className="brain-tooltip-label">{hoveredNode.label}</div>
            <div className="brain-tooltip-connections">{connectionCount(hoveredNode.id)} connection(s)</div>
          </div>
        )}

        {/* Detail panel */}
        {mode === 'knowledge' && (detailLoading || selectedDetail) && (
          <div className="brain-detail-panel">
            <button type="button" className="brain-detail-close" onClick={() => setSelectedDetail(null)}>✕</button>
            {detailLoading && <div className="empty-hint">Loading…</div>}
            {!detailLoading && selectedDetail && (
              <>
                <div className="brain-detail-type">{selectedDetail.node.type}</div>
                <div className="brain-detail-label">{selectedDetail.node.label}</div>
                {Object.entries(selectedDetail.node.metadata).map(([k, v]) => (
                  <div className="brain-detail-meta-row" key={k}>
                    <span>{k}</span><span className="value-muted">{String(v)}</span>
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
