import { useEffect, useState } from 'react'
import { API_BASE_URL } from '../config'

export type ConnectionStatus = 'online' | 'offline'

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>('offline')

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) })
        if (!cancelled) setStatus(res.ok ? 'online' : 'offline')
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }

    check()
    const id = setInterval(check, 5000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return status
}
