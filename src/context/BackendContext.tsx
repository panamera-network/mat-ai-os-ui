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
  source?: string
  auto_generated?: boolean
}

export interface LoopInfo {
  id: string
  name: string
  description: string
  trigger: 'cron' | 'interval' | 'event' | string
  schedule: string
  task: string
  domain: string | null
  status: 'active' | 'paused' | string
  last_run: string | null
  next_run: string | null
  run_count: number
  created_at: string
}

export interface ModelOption {
  provider: string
  model: string
  size?: number
}

export interface Health {
  status: string
  agents_count: number
  active_agents_count: number
  skills_count: number
  domains_count: number
  active_model?: ModelOption
  memory_tiers?: Record<string, number>
  telegram_status?: 'online' | 'offline' | 'disabled'
}

export interface MemoryTierStats {
  counts: Record<string, number>
  total_memories: number
  estimated_size_bytes: number
}

export interface ModelsInfo {
  active: ModelOption
  online: ModelOption[]
  local: ModelOption[]
}

export interface SoulInfo {
  soul_prompt: string
  response_styles: Record<string, string>
  safety_rules: string
  active_style: string
}

export interface IdentityProfile {
  name: string
  nickname: string
  language: string
  profession: string[]
  active_projects: string[]
  goals: {
    short_term: string[]
    long_term: string[]
  }
  preferences: {
    communication_style: string
    work_hours: string
  }
  timezone: string
}

export interface Suggestion {
  id: string
  type: 'new_skill' | 'new_agent' | 'learn_topic' | string
  title: string
  reason: string
  action: Record<string, unknown>
  priority: 'high' | 'medium' | 'low' | string
  status: string
  created_at: string
}

export interface QueueTask {
  id: string
  task: string
  session_id: string | null
  priority: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | string
  result: string | null
  error: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
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
  models: ModelsInfo | null
  soul: SoulInfo | null
  identity: IdentityProfile | null
  memoryTiers: MemoryTierStats | null
  sessionId: string
  suggestions: Suggestion[]
  queueTasks: QueueTask[]
  activeDomains: Set<string>
  refreshAgents: () => Promise<void>
  refreshSkills: () => Promise<void>
  refreshHealth: () => Promise<void>
  refreshModels: () => Promise<void>
  refreshLoops: () => Promise<void>
  refreshSoul: () => Promise<void>
  refreshIdentity: () => Promise<void>
  updateIdentity: (field: string, value: unknown) => Promise<boolean>
  refreshMemoryTiers: () => Promise<void>
  refreshSuggestions: () => Promise<void>
  refreshQueue: () => Promise<void>
  dismissSuggestion: (id: string) => Promise<void>
  actOnSuggestion: (id: string) => Promise<{ status: string; result?: unknown; error?: string }>
  newConversation: () => void
}

function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const BackendContext = createContext<BackendState>({
  online: false,
  health: null,
  agents: [],
  loops: [],
  skillsByDomain: {},
  models: null,
  soul: null,
  identity: null,
  memoryTiers: null,
  sessionId: '',
  suggestions: [],
  queueTasks: [],
  activeDomains: new Set(),
  refreshAgents: async () => {},
  refreshSkills: async () => {},
  refreshHealth: async () => {},
  refreshModels: async () => {},
  refreshLoops: async () => {},
  refreshSoul: async () => {},
  refreshIdentity: async () => {},
  updateIdentity: async () => false,
  refreshMemoryTiers: async () => {},
  refreshSuggestions: async () => {},
  refreshQueue: async () => {},
  dismissSuggestion: async () => {},
  actOnSuggestion: async () => ({ status: 'error' }),
  newConversation: () => {},
})

export function BackendProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [agents, setAgents] = useState<Agent[]>([])
  const [loops, setLoops] = useState<LoopInfo[]>([])
  const [skillsByDomain, setSkillsByDomain] = useState<Record<string, SkillSummary[]>>({})
  const [models, setModels] = useState<ModelsInfo | null>(null)
  const [soul, setSoul] = useState<SoulInfo | null>(null)
  const [identity, setIdentity] = useState<IdentityProfile | null>(null)
  const [memoryTiers, setMemoryTiers] = useState<MemoryTierStats | null>(null)
  const [sessionId, setSessionId] = useState<string>(() => generateSessionId())
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [queueTasks, setQueueTasks] = useState<QueueTask[]>([])
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

  const fetchModels = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/models`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setModels(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const fetchSoul = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/soul`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setSoul(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const fetchIdentity = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/identity`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setIdentity(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const updateIdentity = useCallback(async (field: string, value: unknown) => {
    try {
      const res = await fetch(`${API_BASE_URL}/identity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value }),
      })
      if (res.ok) {
        setIdentity(await res.json())
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const fetchMemoryTiers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/memory/tiers`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) setMemoryTiers(await res.json())
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/suggestions`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data: { suggestions: Suggestion[] } = await res.json()
        setSuggestions(data.suggestions)
      }
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/queue`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        const data: { tasks: QueueTask[] } = await res.json()
        setQueueTasks(data.tasks)
      }
    } catch {
      // health polling already reflects offline state
    }
  }, [])

  const dismissSuggestion = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/suggestions/dismiss/${id}`, { method: 'POST' })
      if (res.ok) setSuggestions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // leave the suggestion in place if the request failed
    }
  }, [])

  const actOnSuggestion = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/suggestions/act/${id}`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        return { status: 'error', error: body.detail ?? `Request failed: ${res.status}` }
      }
      const data: { suggestion_id: string; result: unknown } = await res.json()
      setSuggestions((prev) => prev.filter((s) => s.id !== id))
      return { status: 'ok', result: data.result }
    } catch {
      return { status: 'error', error: 'Could not reach the Orchestrator.' }
    }
  }, [])

  const newConversation = useCallback(() => {
    setSessionId(generateSessionId())
  }, [])

  useEffect(() => {
    fetchMemoryTiers()
    const id = setInterval(fetchMemoryTiers, 30000)
    return () => clearInterval(id)
  }, [fetchMemoryTiers])

  useEffect(() => {
    fetchSuggestions()
    const id = setInterval(fetchSuggestions, 60000)
    return () => clearInterval(id)
  }, [fetchSuggestions])

  useEffect(() => {
    fetchQueue()
    const id = setInterval(fetchQueue, 5000)
    return () => clearInterval(id)
  }, [fetchQueue])

  useEffect(() => {
    fetchHealth()
    fetchAgents()
    fetchLoops()
    fetchSkills()
    fetchModels()
    fetchSoul()
    fetchIdentity()
    const id = setInterval(() => {
      fetchHealth()
      fetchAgents()
      fetchLoops()
    }, 5000)
    return () => clearInterval(id)
  }, [fetchHealth, fetchAgents, fetchLoops, fetchSkills, fetchModels, fetchSoul, fetchIdentity])

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
        models,
        soul,
        identity,
        memoryTiers,
        sessionId,
        suggestions,
        queueTasks,
        activeDomains,
        refreshAgents: fetchAgents,
        refreshSkills: fetchSkills,
        refreshHealth: fetchHealth,
        refreshModels: fetchModels,
        refreshLoops: fetchLoops,
        refreshSoul: fetchSoul,
        refreshIdentity: fetchIdentity,
        updateIdentity,
        refreshMemoryTiers: fetchMemoryTiers,
        refreshSuggestions: fetchSuggestions,
        refreshQueue: fetchQueue,
        dismissSuggestion,
        actOnSuggestion,
        newConversation,
      }}
    >
      {children}
    </BackendContext.Provider>
  )
}

export function useBackend() {
  return useContext(BackendContext)
}
