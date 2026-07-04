import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { API_BASE_URL } from '../config'
import { useSocket } from '../hooks/useSocket'

export type ProjectType = 'youtube' | 'tiktok' | 'shorts' | 'general'
export type ProjectStatus = 'draft' | 'in_progress' | 'ready' | 'published'
export type OutputKind = 'script' | 'voice' | 'image' | 'video' | 'music'

export interface CreatorOutput {
  output: OutputKind
  capability: string
  job_id: string
  status: 'completed' | 'failed' | 'pending' | 'running' | string
  output_path: string | null
  output_url: string | null
  result_text: string | null
  error: string | null
  created_at: string
}

export interface CreatorPendingJob {
  output: OutputKind
  capability: string
  job_id: string
  status: string
}

export interface CreatorProject {
  project_id: string
  user_id: string
  title: string
  type: ProjectType
  status: ProjectStatus
  goal: string
  requested_outputs: OutputKind[]
  scripts: { job_id: string; text: string | null; created_at: string }[]
  assets: { output: OutputKind; job_id: string; path: string | null; url: string | null }[]
  outputs: CreatorOutput[]
  jobs: CreatorPendingJob[]
  created_at: string
  updated_at: string
}

interface CreatorEvent {
  type: 'creator_project_updated' | 'creator_output_ready' | string
  project?: CreatorProject
}

// Fallback poll for the open project — covers the WebSocket connection dropping or not
// being up yet; creator_project_updated/creator_output_ready events keep things live in
// between polls.
const SELECTED_PROJECT_POLL_MS = 5000

interface CreatorState {
  projects: CreatorProject[]
  selectedProjectId: string | null
  selectedProject: CreatorProject | null
  loadingProjects: boolean
  error: string | null
  running: boolean
  selectProject: (id: string | null) => void
  refreshProjects: () => Promise<void>
  createProject: (title: string, type: ProjectType, goal: string) => Promise<CreatorProject | null>
  runProject: (goal: string, requestedOutputs: OutputKind[]) => Promise<void>
}

const CreatorContext = createContext<CreatorState>({
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

function upsertProject(projects: CreatorProject[], updated: CreatorProject): CreatorProject[] {
  const idx = projects.findIndex((p) => p.project_id === updated.project_id)
  if (idx === -1) return [updated, ...projects]
  const next = [...projects]
  next[idx] = updated
  return next
}

export function CreatorProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<CreatorProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [selectedProject, setSelectedProject] = useState<CreatorProject | null>(null)
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const selectedProjectIdRef = useRef<string | null>(null)
  selectedProjectIdRef.current = selectedProjectId

  const refreshProjects = useCallback(async () => {
    setLoadingProjects(true)
    try {
      const res = await fetch(`${API_BASE_URL}/creator/projects`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data: { projects: CreatorProject[] } = await res.json()
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
      const res = await fetch(`${API_BASE_URL}/creator/projects/${id}`, { signal: AbortSignal.timeout(5000) })
      if (!res.ok) return
      const project: CreatorProject = await res.json()
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

  const createProject = useCallback(
    async (title: string, type: ProjectType, goal: string) => {
      try {
        const res = await fetch(`${API_BASE_URL}/creator/projects`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, type, goal }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || `Request failed: ${res.status}`)
        }
        const project: CreatorProject = await res.json()
        setProjects((prev) => upsertProject(prev, project))
        setSelectedProjectId(project.project_id)
        setSelectedProject(project)
        setError(null)
        return project
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create project.')
        return null
      }
    },
    [],
  )

  const runProject = useCallback(
    async (goal: string, requestedOutputs: OutputKind[]) => {
      const id = selectedProjectIdRef.current
      if (!id) return
      setRunning(true)
      setError(null)
      try {
        const res = await fetch(`${API_BASE_URL}/creator/projects/${id}/run`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ goal, requested_outputs: requestedOutputs }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.detail || `Request failed: ${res.status}`)
        }
        const project: CreatorProject = await res.json()
        if (selectedProjectIdRef.current === id) setSelectedProject(project)
        setProjects((prev) => upsertProject(prev, project))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to run project.')
      } finally {
        setRunning(false)
      }
    },
    [],
  )

  const handleSocketMessage = useCallback((data: unknown) => {
    if (typeof data !== 'object' || data === null) return
    const event = data as CreatorEvent
    if (event.type !== 'creator_project_updated' && event.type !== 'creator_output_ready') return
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
    <CreatorContext.Provider
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
    </CreatorContext.Provider>
  )
}

export function useCreator() {
  return useContext(CreatorContext)
}
