import { useEffect, useRef, useState } from 'react'

export interface PhysicsNode {
  id: string
  homeX: number
  homeY: number
}

interface PhysicsState {
  x: number
  y: number
  vx: number
  vy: number
}

const SPRING = 0.004
const DAMPING = 0.965
const JITTER = 0.012

export function useFloatPhysics(nodes: PhysicsNode[]) {
  const stateRef = useRef<Map<string, PhysicsState>>(new Map())
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  useEffect(() => {
    const map = stateRef.current
    for (const n of nodes) {
      if (!map.has(n.id)) {
        map.set(n.id, { x: n.homeX, y: n.homeY, vx: 0, vy: 0 })
      }
    }

    let frame: number

    const tick = () => {
      const next: Record<string, { x: number; y: number }> = {}

      for (const n of nodes) {
        const s = map.get(n.id)!
        s.vx += (n.homeX - s.x) * SPRING + (Math.random() - 0.5) * JITTER
        s.vy += (n.homeY - s.y) * SPRING + (Math.random() - 0.5) * JITTER
        s.vx *= DAMPING
        s.vy *= DAMPING
        s.x += s.vx
        s.y += s.vy
        next[n.id] = { x: s.x, y: s.y }
      }

      setPositions(next)
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.map((n) => n.id).join(',')])

  return positions
}
