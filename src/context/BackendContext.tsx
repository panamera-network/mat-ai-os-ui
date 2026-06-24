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
  activeDomains: Set<string>
}

const BackendContext = createContext<BackendState>({
  online: false,
  health: null,
  agents: [],
  activeDomains: new Set(),
})

export function BackendProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
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

  useEffect(() => {
    fetchHealth()
    fetchAgents()
    const id = setInterval(() => {
      fetchHealth()
      fetchAgents()
    }, 5000)
    return () => clearInterval(id)
  }, [fetchHealth, fetchAgents])

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
    <BackendContext.Provider value={{ online, health, agents, activeDomains }}>{children}</BackendContext.Provider>
  )
}

export function useBackend() {
  return useContext(BackendContext)
}
