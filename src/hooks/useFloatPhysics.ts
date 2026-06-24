import { useEffect, useRef, useState } from 'react'

export interface PhysicsNode {
  id: string
  homeX: number
  homeY: number
}

export interface PhysicsBoundary {
  cx: number
  cy: number
  radius: number
}

export interface PhysicsOptions {
  spring?: number
  damping?: number
  jitter?: number
  boundary?: PhysicsBoundary
}

interface PhysicsState {
  x: number
  y: number
  vx: number
  vy: number
}

const DEFAULT_SPRING = 0.004
const DEFAULT_DAMPING = 0.965
const DEFAULT_JITTER = 0.4
const BOUNDARY_SPRING = 0.05

export function useFloatPhysics(nodes: PhysicsNode[], options: PhysicsOptions = {}) {
  const stateRef = useRef<Map<string, PhysicsState>>(new Map())
  const nodesRef = useRef(nodes)
  const optionsRef = useRef(options)
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Refs are updated every render so the animation loop (started once below) always
  // sees the latest node home positions and options, even when the node array's
  // identity changes (e.g. on container resize) without its id list changing.
  nodesRef.current = nodes
  optionsRef.current = options
  for (const n of nodes) {
    if (!stateRef.current.has(n.id)) {
      stateRef.current.set(n.id, { x: n.homeX, y: n.homeY, vx: 0, vy: 0 })
    }
  }

  useEffect(() => {
    let frame: number

    const tick = () => {
      const { spring = DEFAULT_SPRING, damping = DEFAULT_DAMPING, jitter = DEFAULT_JITTER, boundary } = optionsRef.current
      const next: Record<string, { x: number; y: number }> = {}

      for (const n of nodesRef.current) {
        const s = stateRef.current.get(n.id)
        if (!s) continue
        s.vx += (n.homeX - s.x) * spring + (Math.random() - 0.5) * jitter
        s.vy += (n.homeY - s.y) * spring + (Math.random() - 0.5) * jitter

        if (boundary) {
          const dx = s.x - boundary.cx
          const dy = s.y - boundary.cy
          const dist = Math.hypot(dx, dy)
          if (dist > boundary.radius) {
            const over = dist - boundary.radius
            s.vx -= (dx / dist) * over * BOUNDARY_SPRING
            s.vy -= (dy / dist) * over * BOUNDARY_SPRING
          }
        }

        s.vx *= damping
        s.vy *= damping
        s.x += s.vx
        s.y += s.vy
        next[n.id] = { x: s.x, y: s.y }
      }

      setPositions(next)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  return positions
}
