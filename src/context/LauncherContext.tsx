import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { LAUNCHER_BASE_URL } from '../config'

export type ServiceId = 'core' | 'engine' | 'dashboard' | 'mk1'
export type ServiceStatus = 'online' | 'offline' | 'starting' | 'restarting' | 'error'
export type MobileStatus = 'waiting' | 'connected' | 'offline'

export interface ServiceState {
  id: ServiceId
  name: string
  status: ServiceStatus
  port: number
  pid: number | null
  last_error: string | null
}

export interface LauncherHealth {
  cpu_percent: number
  ram_percent: number
  ram_used: number
  ram_total: number
  disk_percent: number
  services: ServiceState[]
  mobile: { status: MobileStatus }
}

interface LauncherState {
  reachable: boolean
  health: LauncherHealth | null
  startService: (id: ServiceId) => Promise<void>
  stopService: (id: ServiceId) => Promise<void>
  restartService: (id: ServiceId) => Promise<void>
  pendingAction: ServiceId | null
}

const LauncherContext = createContext<LauncherState>({
  reachable: false,
  health: null,
  startService: async () => {},
  stopService: async () => {},
  restartService: async () => {},
  pendingAction: null,
})

// The launcher API can't push events (it's designed to work even while Core's WebSocket
// stack is offline), so this context just polls — 3s is fast enough for "Starting..." to
// feel responsive without hammering psutil.
const POLL_MS = 3000

export function LauncherProvider({ children }: { children: ReactNode }) {
  const [reachable, setReachable] = useState(false)
  const [health, setHealth] = useState<LauncherHealth | null>(null)
  const [pendingAction, setPendingAction] = useState<ServiceId | null>(null)

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${LAUNCHER_BASE_URL}/launcher/health`, { signal: AbortSignal.timeout(3000) })
      if (res.ok) {
        setHealth(await res.json())
        setReachable(true)
      } else {
        setReachable(false)
      }
    } catch {
      setReachable(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
    const id = setInterval(fetchHealth, POLL_MS)
    return () => clearInterval(id)
  }, [fetchHealth])

  const callAction = useCallback(
    async (id: ServiceId, action: 'start' | 'stop' | 'restart') => {
      setPendingAction(id)
      try {
        const res = await fetch(`${LAUNCHER_BASE_URL}/launcher/services/${id}/${action}`, { method: 'POST' })
        if (res.ok) {
          const service: ServiceState = await res.json()
          setHealth((prev) => (prev ? { ...prev, services: prev.services.map((s) => (s.id === id ? service : s)) } : prev))
        }
      } catch {
        // next poll reconciles the real state
      } finally {
        setPendingAction(null)
        fetchHealth()
      }
    },
    [fetchHealth],
  )

  const startService = useCallback((id: ServiceId) => callAction(id, 'start'), [callAction])
  const stopService = useCallback((id: ServiceId) => callAction(id, 'stop'), [callAction])
  const restartService = useCallback((id: ServiceId) => callAction(id, 'restart'), [callAction])

  return (
    <LauncherContext.Provider value={{ reachable, health, startService, stopService, restartService, pendingAction }}>
      {children}
    </LauncherContext.Provider>
  )
}

export function useLauncher() {
  return useContext(LauncherContext)
}
