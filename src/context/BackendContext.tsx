import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { API_BASE_URL } from '../config'
import { useSocket } from '../hooks/useSocket'

export interface Agent {
  agent_id: string
  name: string
  domain: string
  skill_ids: string[]
  status: 'active' | 'idle'
}

export interface SkillSummary {
  id: string
  name: string
  domain: string
  description: string
}

export interface LoopInfo {
  id?: string
  name?: string
  status?: string
  [key: string]: unknown
}

export interface Health {
  status: string
  agents_count: number
  active_agents_count: number
  skills_count: number
  domains_count: number
}

interface OrchestratorEvent {
  type: 'agent_active' | 'agent_idle' | 'task_started' | 'task_completed'
  agent_id?: string
  domain?: string
  task?: string
  result?: string
}

interface BackendState {
  online: boolean
  health: Health | null
  agents: Agent[]
  loops: LoopInfo[]
  skillsByDomain: Record<string, SkillSummary[]>
  activeDomains: Set<string>
  refreshAgents: () => Promise<void>
  refreshSkills: () => Promise<void>
  refreshHealth: () => Promise<void>
}

const BackendContext = createContext<BackendState>({
  online: false,
  health: null,
  agents: [],
  loops: [],
  skillsByDomain: {},
  activeDomains: new Set(),
  refreshAgents: async () => {},
  refreshSkills: async () => {},
  refreshHealth: async () => {},
})

export function BackendProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loops, setLoops] = useState<LoopInfo[]>([])
  const [skillsByDomain, setSkillsByDomain] = useState<Record<string, SkillSummary[]>>({})
  const [activeDomains, setActiveDomains] = useState<Set<string>>(new Set())

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) })
      setOnline(res.ok)
      if (res.ok) setHealth(await res.json())
    } catch {
      setOnline(false)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/agents`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setAgents(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const fetchLoops = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/loops`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setLoops(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const fetchSkills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/skills`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setSkillsByDomain(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    fetchAgents()
    fetchLoops()
    fetchSkills()
    const id = setInterval(() => {
      fetchHealth()
      fetchAgents()
      fetchLoops()
    }, 5000)
    return () => clearInterval(id)
  }, [fetchHealth, fetchAgents, fetchLoops, fetchSkills])

  const handleSocketMessage = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const event = data as OrchestratorEvent

      if (event.type === 'agent_active' && event.domain) {
        setActiveDomains((prev) => new Set(prev).add(event.domain!))
        fetchAgents()
      } else if (event.type === 'agent_idle' && event.domain) {
        setActiveDomains((prev) => {
          const next = new Set(prev)
          next.delete(event.domain!)
          return next
        })
        fetchAgents()
      } else if (event.type === 'task_completed') {
        fetchHealth()
      }
    },
    [fetchAgents, fetchHealth],
  )

  useSocket(handleSocketMessage)

  return (
    <BackendContext.Provider
      value={{
        online,
        health,
        agents,
        loops,
        skillsByDomain,
        activeDomains,
        refreshAgents: fetchAgents,
        refreshSkills: fetchSkills,
        refreshHealth: fetchHealth,
      }}
    >
      {children}
    </BackendContext.Provider>
  )
}

export function useBackend() {
  return useContext(BackendContext)
}
