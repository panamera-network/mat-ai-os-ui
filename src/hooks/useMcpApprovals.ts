import { useCallback, useState } from 'react'
import { API_BASE_URL } from '../config'

export type McpApprovalStatus = 'pending' | 'executed' | 'failed' | 'denied'

export interface McpApprovalRecord {
  id: string
  status: McpApprovalStatus
  agent_id: string
  domain: string
  server: string
  tool: string
  params: Record<string, unknown>
  reason: string
  result: string | null
  error: string | null
  created_at: string
  resolved_at: string | null
}

// Shared approve/deny + pending-list fetching for anywhere an MCP approval can be acted
// on — the MCP Core Engine panel and Dev Workspace's command cards both call this
// instead of duplicating the fetch calls.
export function useMcpApprovals() {
  const [pending, setPending] = useState<McpApprovalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/mcp/approvals`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) {
        const data: { approvals: McpApprovalRecord[] } = await res.json()
        setPending(data.approvals)
      }
      setError(null)
    } catch {
      setError('Could not reach the Orchestrator.')
    } finally {
      setLoading(false)
    }
  }, [])

  const approve = useCallback(async (id: string): Promise<McpApprovalRecord | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/mcp/approvals/${id}/approve`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      const record: McpApprovalRecord = await res.json()
      setPending((prev) => prev.filter((a) => a.id !== id))
      setError(null)
      return record
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve.')
      return null
    }
  }, [])

  const deny = useCallback(async (id: string, reason = ''): Promise<McpApprovalRecord | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/mcp/approvals/${id}/deny`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      const record: McpApprovalRecord = await res.json()
      setPending((prev) => prev.filter((a) => a.id !== id))
      setError(null)
      return record
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deny.')
      return null
    }
  }, [])

  return { pending, loading, error, refresh, approve, deny }
}
