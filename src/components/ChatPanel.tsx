import { useEffect, useRef, useState } from 'react'
import { API_BASE_URL } from '../config'
import { useBackend } from '../context/BackendContext'
import './ChatPanel.css'

interface LearnSuggestion {
  status: 'suggest' | 'rejected'
  decision: 'create' | 'improve' | 'new_domain' | 'reject'
  skill_id: string | null
  domain: string | null
  reason: string
  source: string
  name: string | null
  description: string | null
  prompt_fragment: string | null
}

type GovernanceKind = 'rejected' | 'suggestion' | 'approved' | 'discarded'

interface CollaborationSubtask {
  domain: string
  task: string
  agent_id: string
  agent_name: string
}

interface CollaborationSubResult extends CollaborationSubtask {
  result: string
}

interface CollaborationData {
  id: string
  type: 'sequential' | 'parallel' | 'review'
  reason: string
  plan: { subtasks: CollaborationSubtask[] }
  sub_results: CollaborationSubResult[]
  final_result: string
}

interface ChatMessage {
  id: number
  role: 'user' | 'orchestrator' | 'governance'
  text: string
  govKind?: GovernanceKind
  suggestion?: LearnSuggestion
  collaboration?: CollaborationData
  durationMs?: number
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

const DOMAIN_ICONS: Record<string, string> = {
  trading: '📈',
  coding: '🧩',
  research: '🔬',
  business: '📋',
  personal: '✅',
  legal: '⚖️',
  creative: '🎨',
  ai_automation: '🤖',
  data_analytics: '📊',
  web3_blockchain: '⛓️',
}

interface InterfaceMode {
  id: string
  label: string
  icon: string
}

const INTERFACE_MODES: InterfaceMode[] = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'voice', label: 'Voice', icon: '🎙️' },
  { id: 'vision', label: 'Vision', icon: '📷' },
  { id: 'learn', label: 'Learn', icon: '🎓' },
]

const DECISION_LABEL: Record<LearnSuggestion['decision'], string> = {
  create: 'Create new skill',
  improve: 'Improve existing skill',
  new_domain: 'Create new domain',
  reject: 'Reject',
}

export default function ChatPanel() {
  const { sessionId, newConversation } = useBackend()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [activeMode, setActiveMode] = useState('chat')
  const [pending, setPending] = useState(false)
  const [modePickerOpen, setModePickerOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set())
  const [elapsedMs, setElapsedMs] = useState(0)
  const pendingStartRef = useRef<number | null>(null)

  useEffect(() => {
    if (!pending) return
    pendingStartRef.current = Date.now()
    setElapsedMs(0)
    const id = setInterval(() => {
      if (pendingStartRef.current !== null) setElapsedMs(Date.now() - pendingStartRef.current)
    }, 100)
    return () => clearInterval(id)
  }, [pending])

  const startNewConversation = () => {
    newConversation()
    setMessages([])
    setResolvedIds(new Set())
  }

  const sendTask = async (task: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: task }])
    setPending(true)
    const startedAt = Date.now()
    try {
      const res = await fetch(`${API_BASE_URL}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task, session_id: sessionId }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: { result: string; collaboration?: CollaborationData | null } = await res.json()
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'orchestrator',
          text: data.result,
          collaboration: data.collaboration ?? undefined,
          durationMs: Date.now() - startedAt,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'orchestrator', text: 'Could not reach the Orchestrator. Is the backend running?' },
      ])
    } finally {
      setPending(false)
    }
  }

  const sendLearn = async (source: string) => {
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: `Learn: ${source}` }])
    setPending(true)
    const startedAt = Date.now()
    try {
      const res = await fetch(`${API_BASE_URL}/learn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const suggestion: LearnSuggestion = await res.json()
      const durationMs = Date.now() - startedAt
      if (suggestion.status === 'rejected') {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'governance', govKind: 'rejected', text: suggestion.reason, suggestion, durationMs },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, role: 'governance', govKind: 'suggestion', text: suggestion.reason, suggestion, durationMs },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'governance', govKind: 'rejected', text: 'Could not reach the Orchestrator. Is the backend running?' },
      ])
    } finally {
      setPending(false)
    }
  }

  const resolveSuggestion = async (messageId: number, suggestion: LearnSuggestion, approved: boolean) => {
    setResolvedIds((prev) => new Set(prev).add(messageId))
    try {
      const res = await fetch(`${API_BASE_URL}/learn/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestion, approved }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const outcome: { status: string; skill_id?: string; domain?: string; reason?: string } = await res.json()

      if (outcome.status === 'discarded') {
        setMessages((prev) => [...prev, { id: Date.now(), role: 'governance', govKind: 'discarded', text: 'Discarded.' }])
      } else if (outcome.status === 'created') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'governance',
            govKind: 'approved',
            text: `Created skill '${outcome.skill_id}' in domain '${outcome.domain}'.`,
          },
        ])
      } else if (outcome.status === 'improved') {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'governance', govKind: 'approved', text: `Improved skill '${outcome.skill_id}'.` },
        ])
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'governance', govKind: 'rejected', text: 'Could not reach the Orchestrator. Is the backend running?' },
      ])
    }
  }

  const send = async () => {
    const value = input.trim()
    if (!value || pending) return
    setInput('')
    if (activeMode === 'learn') {
      await sendLearn(value)
    } else {
      await sendTask(value)
    }
  }

  const copyMessage = async (message: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(message.text)
      setCopiedId(message.id)
      setTimeout(() => setCopiedId((current) => (current === message.id ? null : current)), 1500)
    } catch {
      // clipboard access denied — silently ignore
    }
  }

  return (
    <div className="chat-panel-card chat-panel">
      <div className="chat-panel-toolbar">
        <button type="button" className="new-conversation-btn" onClick={startNewConversation} disabled={pending}>
          + New Conversation
        </button>
      </div>
      <div className="chat-messages">
        {messages.length === 0 && <div className="empty-hint">Ask MAT.AI anything</div>}
        {messages.map((m) => {
          if (m.role === 'governance') {
            if (m.govKind === 'suggestion' && m.suggestion) {
              const s = m.suggestion
              const resolved = resolvedIds.has(m.id)
              return (
                <div key={m.id} className="chat-message governance suggestion">
                  <div className="gov-card-title">
                    {DECISION_LABEL[s.decision]}
                    {m.durationMs !== undefined && <span className="chat-duration-badge">{formatDuration(m.durationMs)}</span>}
                  </div>
                  {s.domain && <div className="gov-card-row">Domain: {s.domain}</div>}
                  {s.skill_id && <div className="gov-card-row">Skill: {s.skill_id}</div>}
                  <div className="gov-card-reason">{s.reason}</div>
                  <div className="gov-card-actions">
                    <button
                      type="button"
                      className="gov-approve-btn"
                      disabled={resolved}
                      onClick={() => resolveSuggestion(m.id, s, true)}
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      className="gov-reject-btn"
                      disabled={resolved}
                      onClick={() => resolveSuggestion(m.id, s, false)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )
            }
            return (
              <div key={m.id} className={`chat-message governance ${m.govKind}`}>
                {m.text}
                {m.durationMs !== undefined && <span className="chat-duration-badge">{formatDuration(m.durationMs)}</span>}
              </div>
            )
          }

          if (m.role === 'orchestrator' && m.collaboration) {
            const c = m.collaboration
            const agents = c.plan.subtasks
            return (
              <div key={m.id} className="chat-message orchestrator collaboration">
                <div className="collab-header">
                  <span className="collab-badge">{c.type} collaboration</span>
                  <div className="collab-avatars">
                    {agents.map((a) => (
                      <span className="collab-avatar" key={a.agent_id} title={`${a.agent_name} (${a.domain})`}>
                        {DOMAIN_ICONS[a.domain] ?? '🤖'}
                      </span>
                    ))}
                  </div>
                  {m.durationMs !== undefined && <span className="chat-duration-badge">{formatDuration(m.durationMs)}</span>}
                </div>
                <div className="collab-reason">{c.reason}</div>
                <div className="collab-subtasks">
                  {c.sub_results.map((sr, i) => (
                    <div className="collab-subtask" key={sr.agent_id + i}>
                      <div className="collab-subtask-agent">
                        {DOMAIN_ICONS[sr.domain] ?? '🤖'} {sr.agent_name}
                      </div>
                      <div className="collab-subtask-text">{sr.task}</div>
                    </div>
                  ))}
                </div>
                <div className="collab-final-label">Merged result</div>
                <div className="collab-final-result">{c.final_result}</div>
                <button className="chat-copy-btn" onClick={() => copyMessage(m)} type="button">
                  {copiedId === m.id ? 'Copied!' : '📋'}
                </button>
              </div>
            )
          }

          return (
            <div key={m.id} className={`chat-message ${m.role}`}>
              {m.text}
              {m.role === 'orchestrator' && (
                <>
                  {m.durationMs !== undefined && <span className="chat-duration-badge">{formatDuration(m.durationMs)}</span>}
                  <button className="chat-copy-btn" onClick={() => copyMessage(m)} type="button">
                    {copiedId === m.id ? 'Copied!' : '📋'}
                  </button>
                </>
              )}
            </div>
          )
        })}
        {pending && (
          <div className="chat-message orchestrator pending">
            Thinking… <span className="chat-elapsed-time">{formatDuration(elapsedMs)}</span>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        {modePickerOpen && (
          <div className="mode-picker">
            {INTERFACE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`interface-btn ${activeMode === mode.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveMode(mode.id)
                  setModePickerOpen(false)
                }}
              >
                <span className="interface-btn-icon">{mode.icon}</span>
                <span className="interface-btn-label">{mode.label}</span>
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          className="mode-toggle-btn"
          onClick={() => setModePickerOpen((open) => !open)}
          aria-label="Choose interface mode"
        >
          +
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={activeMode === 'learn' ? 'Enter URL, GitHub repo, or idea...' : 'Ask MAT.AI anything...'}
          disabled={pending}
        />
        <button onClick={send} disabled={pending}>
          ➤
        </button>
      </div>
    </div>
  )
}
