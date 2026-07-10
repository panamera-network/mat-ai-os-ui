import { useCallback, useState } from 'react'
import { API_BASE_URL } from '../config'

export type GovernanceCaseState =
  | 'problem_detected'
  | 'quarantined'
  | 'fix_loop'
  | 're_verifying'
  | 'active'
  | 'suggested'
  | 'awaiting_approval'
  | 'applied'
  | 'rejected'

export interface GovernanceSuggestion {
  summary: string
  reason: string
  recommended_action: string
  recommended_action_type: string
  confidence: number
  risk_level: 'low' | 'medium' | 'high'
}

export interface GovernanceCase {
  case_id: string
  entity_type: string
  entity_id: string
  state: GovernanceCaseState
  issue: string
  severity: string
  suggestion: GovernanceSuggestion | null
  created_at: string
  updated_at: string
}

export interface GovernanceStatusSummary {
  total_cases: number
  by_state: Record<string, number>
}

// Same shape as useMcpApprovals (pending list + resolve mutators + in-flight state) —
// this is the Universal Governance Lifecycle's (Phase 14) "something for Farez to act
// on" surface: cases in "awaiting_approval" genuinely need a decision (POST
// /governance/fix with approved true/false); "suggested" cases are informational only
// (no MAJOR_ACTION_TYPES change proposed, nothing to approve) and render read-only.
export function useGovernanceLifecycle() {
  const [suggestions, setSuggestions] = useState<GovernanceCase[]>([])
  const [summary, setSummary] = useState<GovernanceStatusSummary>({ total_cases: 0, by_state: {} })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actingId, setActingId] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [suggestionsRes, statusRes] = await Promise.all([
        fetch(`${API_BASE_URL}/governance/suggestions`, { signal: AbortSignal.timeout(5000) }),
        fetch(`${API_BASE_URL}/governance/status`, { signal: AbortSignal.timeout(5000) }),
      ])
      if (suggestionsRes.ok) {
        const data: { cases: GovernanceCase[] } = await suggestionsRes.json()
        setSuggestions(data.cases)
      }
      if (statusRes.ok) {
        setSummary(await statusRes.json())
      }
      setError(null)
    } catch {
      setError('Could not reach the Orchestrator.')
    } finally {
      setLoading(false)
    }
  }, [])

  const resolve = useCallback(async (caseId: string, approved: boolean): Promise<GovernanceCase | null> => {
    setActingId(caseId)
    try {
      const res = await fetch(`${API_BASE_URL}/governance/fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_id: caseId, approved }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.detail || `Request failed: ${res.status}`)
      }
      const record: GovernanceCase = await res.json()
      setSuggestions((prev) => prev.filter((c) => c.case_id !== caseId))
      setError(null)
      return record
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve.')
      return null
    } finally {
      setActingId(null)
    }
  }, [])

  const awaitingApprovalCount = summary.by_state['awaiting_approval'] ?? 0

  return { suggestions, summary, awaitingApprovalCount, loading, error, actingId, refresh, resolve }
}
