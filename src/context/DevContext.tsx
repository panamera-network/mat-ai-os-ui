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

export interface LoggedError {
  id: string
  logger_name: string
  message: string
  traceback: string | null
  created_at: string
  resolved: boolean
}

interface DevEvent {
  type: 'dev_project_updated' | 'error_logged' | string
  project?: DevProject
  error?: LoggedError
}

function buildInvestigateGoal(err: LoggedError): string {
  return [
    'Investigate this error and suggest a fix.',
    '',
    `Logger: ${err.logger_name}`,
    `Message: ${err.message}`,
    '',
    'Traceback:',
    err.traceback || '(no traceback captured)',
  ].join('\n')
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
  errors: LoggedError[]
  investigatingErrorId: string | null
  selectProject: (id: string | null) => void
  refreshProjects: () => Promise<void>
  createProject: (title: string, goal: string) => Promise<DevProject | null>
  runProject: (goal: string, projectId?: string) => Promise<void>
  refreshErrors: () => Promise<void>
  investigateError: (err: LoggedError) => Promise<void>
  resolveError: (id: string) => Promise<void>
}

const DevContext = createContext<DevState>({
  projects: [],
  selectedProjectId: null,
  selectedProject: null,
  loadingProjects: false,
  error: null,
  running: false,
  errors: [],
  investigatingErrorId: null,
  selectProject: () => {},
  refreshProjects: async () => {},
  createProject: async () => null,
  runProject: async () => {},
  refreshErrors: async () => {},
  investigateError: async () => {},
  resolveError: async () => {},
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
  const [errors, setErrors] = useState<LoggedError[]>([])
  const [investigatingErrorId, setInvestigatingErrorId] = useState<string | null>(null)
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

  const runProject = useCallback(async (goal: string, projectId?: string) => {
    const id = projectId ?? selectedProjectIdRef.current
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

  const refreshErrors = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/errors?include_resolved=false`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data: { errors: LoggedError[] } = await res.json()
        setErrors(data.errors)
      }
    } catch {
      // next poll or error_logged event will reconcile
    }
  }, [])

  // Step 0's whole point: notice a bug without babysitting the console, then let the
  // human manually send it to the coding agent - this is that "manually" step made one
  // click instead of copy-pasting a traceback into a new project by hand. No automatic
  // fix proposal here; the agent just investigates and replies (or asks for an MCP
  // approval), exactly like any other Dev Workspace run.
  const investigateError = useCallback(
    async (err: LoggedError) => {
      setInvestigatingErrorId(err.id)
      try {
        const project = await createProject(`Bug: ${err.logger_name}`, buildInvestigateGoal(err))
        if (project) await runProject(buildInvestigateGoal(err), project.project_id)
      } finally {
        setInvestigatingErrorId(null)
      }
    },
    [createProject, runProject],
  )

  const resolveError = useCallback(async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/errors/${id}/resolve`, { method: 'POST' })
      if (res.ok) setErrors((prev) => prev.filter((e) => e.id !== id))
    } catch {
      // best-effort; the error stays listed and can be retried
    }
  }, [])

  const handleSocketMessage = useCallback(
    (data: unknown) => {
      if (typeof data !== 'object' || data === null) return
      const event = data as DevEvent
      if (event.type === 'dev_project_updated' && event.project) {
        setProjects((prev) => upsertProject(prev, event.project!))
        if (selectedProjectIdRef.current === event.project.project_id) setSelectedProject(event.project)
      } else if (event.type === 'error_logged') {
        void refreshErrors()
      }
    },
    [refreshErrors],
  )

  useSocket(handleSocketMessage)

  useEffect(() => {
    refreshProjects()
    refreshErrors()
  }, [refreshProjects, refreshErrors])

  // Fallback poll for the open project only — keeps working even if the WebSocket
  // connection above is down or reconnecting.
  useEffect(() => {
    if (!selectedProjectId) return
    const id = setInterval(() => fetchProject(selectedProjectId), SELECTED_PROJECT_POLL_MS)
    return () => clearInterval(id)
  }, [selectedProjectId, fetchProject])

  // Same fallback rationale as above, for the unresolved-errors list.
  useEffect(() => {
    const id = setInterval(refreshErrors, SELECTED_PROJECT_POLL_MS)
    return () => clearInterval(id)
  }, [refreshErrors])

  return (
    <DevContext.Provider
      value={{
        projects,
        selectedProjectId,
        selectedProject,
        loadingProjects,
        error,
        running,
        errors,
        investigatingErrorId,
        selectProject,
        refreshProjects,
        createProject,
        runProject,
        refreshErrors,
        investigateError,
        resolveError,
      }}
    >
      {children}
    </DevContext.Provider>
  )
}

export function useDev() {
  return useContext(DevContext)
}
