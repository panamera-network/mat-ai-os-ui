import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { API_BASE_URL } from '../config'
import { useSocket } from '../hooks/useSocket'

export type DevProjectStatus = 'draft' | 'in_progress' | 'ready'
export type DevCardKind = 'response' | 'command'
export type McpApprovalStatus = 'pending' | 'executed' | 'failed' | 'denied'

export interface DevResponseCard {
  kind: 'response'
  text: string
  created_at: string
}

export interface DevCommandCard {
  kind: 'command'
  approval_id: string
  server: string
  tool: string
  params: Record<string, unknown>
  status: McpApprovalStatus
  result: string | null
  error: string | null
  created_at: string
  resolved_at: string | null
}

export type DevCard = DevResponseCard | DevCommandCard

export interface DevProject {
  project_id: string
  user_id: string
  title: string
  status: DevProjectStatus
  goal: string
  cards: DevCard[]
  created_at: string
  updated_at: string
}

interface DevEvent {
  type: 'dev_project_updated' | string
  project?: DevProject
}

// Fallback poll for the open project — covers the WebSocket connection dropping or not
// being up yet; dev_project_updated events keep things live in between polls.
const SELECTED_PROJECT_POLL_MS = 5000

interface DevState {
  projects: DevProject[]
  selectedProjectId: string | null
  selectedProject: DevProject | null
  loadingProjects: boolean
  error: string | null
  running: boolean
  selectProject: (id: string | null) => void
  refreshProjects: () => Promise<void>
  createProject: (title: string, goal: string) => Promise<DevProject | null>
  runProject: (goal: string) => Promise<void>
}

const DevContext = createContext<DevState>({
  projects: [],
  selectedProjectId: null,
  selectedProject: null,
  loadingProjects: false,
  error: null,
  running: false,
  selectProject: () => {},
  refreshProjects: async () => {},
  createProject: async () => null,
  runProject: async () => {},
})

function upsertProject(projects: DevProject[], updated: DevProject): DevProject[] {
  const idx = projects.findIndex((p) => p.project_id === updated.project_id)
  if (idx === -1) return [updated, ...projects]
  const next = [...projects]
  next[idx] = updated
  return next
}

export function DevProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<DevProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<DevProject | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const selectedProjectIdRef = useRef<string | null>(null)
  selectedProjectIdRef.current = selectedProjectId

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const res = await fetch(`${API_BASE_URL}/dev/projects`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data: { projects: DevProject[] } = await res.json()
        setProjects(data.projects)
      }
      setError(null)
    } catch {
      setError('Could not reach the Orchestrator.')
    } finally {
      setLoadingProjects(false)
    }
  }, [])

  const fetchProject = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/dev/projects/${id}`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return
      const project: DevProject = await res.json()
      if (selectedProjectIdRef.current === id) setSelectedProject(project)
      setProjects((prev) => upsertProject(prev, project))
    } catch {
      // next poll or WS event will reconcile
    }
  }, [])

  const selectProject = useCallback(
    (id: string | null) => {
      setSelectedProjectId(id)
      setSelectedProject(id ? projects.find((p) => p.project_id === id) ?? null : null)
      if (id) void fetchProject(id)
    },
    [projects, fetchProject],
  )

  const createProject = useCallback(async (title: string, goal: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/dev/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, goal }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      const project: DevProject = await res.json()
      setProjects((prev) => upsertProject(prev, project))
      setSelectedProjectId(project.project_id)
      setSelectedProject(project)
      setError(null)
      return project
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project.')
      return null
    }
  }, [])

  const runProject = useCallback(async (goal: string) => {
    const id = selectedProjectIdRef.current
    if (!id) return
    setRunning(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/dev/projects/${id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      const project: DevProject = await res.json()
      if (selectedProjectIdRef.current === id) setSelectedProject(project)
      setProjects((prev) => upsertProject(prev, project))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run project.')
    } finally {
      setRunning(false)
    }
  }, [])

  const handleSocketMessage = useCallback((data: unknown) => {
    if (typeof data !== 'object' || data === null) return
    const event = data as DevEvent
    if (event.type !== 'dev_project_updated') return
    const project = event.project
    if (!project) return
    setProjects((prev) => upsertProject(prev, project))
    if (selectedProjectIdRef.current === project.project_id) setSelectedProject(project)
  }, [])

  useSocket(handleSocketMessage)

  useEffect(() => {
    refreshProjects()
  }, [refreshProjects])

  // Fallback poll for the open project only — keeps working even if the WebSocket
  // connection above is down or reconnecting.
  useEffect(() => {
    if (!selectedProjectId) return
    const id = setInterval(() => fetchProject(selectedProjectId), SELECTED_PROJECT_POLL_MS)
    return () => clearInterval(id)
  }, [selectedProjectId, fetchProject])

  return (
    <DevContext.Provider
      value={{
        projects,
        selectedProjectId,
        selectedProject,
        loadingProjects,
        error,
        running,
        selectProject,
        refreshProjects,
        createProject,
        runProject,
      }}
    >
      {children}
    </DevContext.Provider>
  )
}

export function useDev() {
  return useContext(DevContext)
}
