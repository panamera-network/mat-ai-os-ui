import { useEffect, useRef, useState, type DragEvent } from 'react'
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

// Phase 14.1's execution-path metadata (see Orchestrator.handle_task's docstring) —
// only the fields the badge below actually reads; the backend sends more (law_result,
// contract_result, rule_result, selected_service/capability) but they're not surfaced
// in chat, just in the tooltip breakdown text.
interface ExecutionPath {
  resolved_by?: string | null
  verifier_result?: { verdict: 'pass' | 'fail' | 'queue'; reason: string } | null
  gate_result?: { gate_result: 'pass' | 'fail'; checks: { name: string; status: string }[] } | null
  governance_action?: string | null
}

interface ChatMessage {
  id: number
  role: 'user' | 'orchestrator' | 'governance' | 'briefing'
  text: string
  govKind?: GovernanceKind
  suggestion?: LearnSuggestion
  collaboration?: CollaborationData
  durationMs?: number
  feedbackTaskId?: string
  feedbackRating?: number
  attachmentName?: string
  executionPath?: ExecutionPath
}

// A message only gets a badge when the quality pipeline actually resolved (pass/fail on
// both Verifier and Gate) — a "queue" verdict is Verifier's own "genuinely ambiguous, ask
// a human" signal (see core/verifier.py), not a problem, so it deliberately stays quiet
// rather than flagging most ordinary replies.
function executionBadge(ep: ExecutionPath): { icon: string; label: string; title: string; cls: string } | null {
  const verifierFail = ep.verifier_result?.verdict === 'fail'
  const gateFail = ep.gate_result?.gate_result === 'fail'
  const verifierPass = ep.verifier_result?.verdict === 'pass'
  if (!verifierFail && !gateFail && !verifierPass) return null

  const title = [
    ep.resolved_by ? `routed via ${ep.resolved_by}` : null,
    ep.verifier_result ? `verifier: ${ep.verifier_result.verdict} — ${ep.verifier_result.reason}` : null,
    ep.gate_result ? `gate: ${ep.gate_result.gate_result}` : null,
    ep.governance_action && ep.governance_action !== 'none' ? `governance: ${ep.governance_action}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  if (verifierFail || gateFail) {
    return { icon: '⚠', label: 'flagged', title, cls: 'exec-badge-flagged' }
  }
  return { icon: '✓', label: 'verified', title, cls: 'exec-badge-ok' }
}

// A fallback reply ends with "\n\n_<provider label>_" (see agents/base_agent.py's
// run() + core/llm_provider.py's normalize_provider_label) - split it off so it can be
// rendered smaller/italic/muted instead of as part of the main answer text.
const MODEL_LABEL_PATTERN = /\n\n_([^_\n]+)_$/

function splitModelLabel(text: string): { body: string; label: string | null } {
  const match = text.match(MODEL_LABEL_PATTERN)
  if (!match) return { body: text, label: null }
  return { body: text.slice(0, match.index), label: match[1] }
}

const ACCEPTED_ATTACHMENT_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv', '.png', '.jpg', '.jpeg']

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isAcceptedAttachment(file: File): boolean {
  const lower = file.name.toLowerCase()
  return ACCEPTED_ATTACHMENT_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

interface BriefingPayload {
  greeting: string
  generated_at: string
  goals: { active_count: number; average_progress: number }
  pending_tasks: number
  active_loops: number
  total_loops: number
  suggestions_count: number
  alerts: unknown[]
}

const LAST_SEEN_BRIEFING_KEY = 'mat-ai-os-last-seen-briefing'

const QUEUE_POLL_INTERVAL_MS = 2000
const QUEUE_POLL_MAX_ATTEMPTS = 300 // ~10 minutes, then point at the Queue panel instead

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

interface ChatPanelProps {
  prefillMessage?: string
  onPrefillConsumed?: () => void
}

export default function ChatPanel({ prefillMessage, onPrefillConsumed }: ChatPanelProps = {}) {
  const { sessionId, newConversation } = useBackend()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [activeMode, setActiveMode] = useState('chat')
  const [pending, setPending] = useState(false)
  const [modePickerOpen, setModePickerOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set())
  const [elapsedMs, setElapsedMs] = useState(0)
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const pendingStartRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  useEffect(() => {
    if (!prefillMessage) return
    setInput(prefillMessage)
    onPrefillConsumed?.()
  }, [prefillMessage, onPrefillConsumed])

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

  const playTtsResponse = async (text: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/voice/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.addEventListener('ended', () => URL.revokeObjectURL(url))
      await audio.play()
    } catch {
      // TTS is a nice-to-have for voice turns; silently skip if it's not configured/reachable
    }
  }

  // When POST /task came back {queued: true} (orchestrator busy), the result arrives via
  // the background queue worker — poll GET /queue/{task_id} until it lands, then show it
  // in the conversation like any other reply.
  const pollQueuedTask = async (taskId: string, startedAt: number, autoSpeak: boolean) => {
    for (let attempt = 0; attempt < QUEUE_POLL_MAX_ATTEMPTS; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, QUEUE_POLL_INTERVAL_MS))
      let record: { status: string; result: string | null; error: string | null }
      try {
        const res = await fetch(`${API_BASE_URL}/queue/${taskId}`)
        if (!res.ok) continue
        record = await res.json()
      } catch {
        continue
      }
      if (record.status === 'completed') {
        const text = record.result ?? ''
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'orchestrator', text, durationMs: Date.now() - startedAt },
        ])
        if (autoSpeak && text) await playTtsResponse(text)
        return
      }
      if (record.status === 'failed' || record.status === 'cancelled') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            role: 'orchestrator',
            text:
              record.status === 'cancelled'
                ? 'The queued task was cancelled before it ran.'
                : `The queued task failed: ${record.error ?? 'unknown error'}`,
          },
        ])
        return
      }
    }
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), role: 'orchestrator', text: 'Still waiting on the queued task — check the Queue panel for its result.' },
    ])
  }

  const sendTask = async (task: string, file: File | null, autoSpeak = false) => {
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: task, attachmentName: file?.name }])
    setPending(true)
    const startedAt = Date.now()
    try {
      let res: Response
      if (file) {
        const formData = new FormData()
        formData.append('task', task)
        formData.append('session_id', sessionId)
        formData.append('priority', 'normal')
        formData.append('file', file)
        res = await fetch(`${API_BASE_URL}/task/upload`, { method: 'POST', body: formData })
      } else {
        res = await fetch(`${API_BASE_URL}/task`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task, session_id: sessionId }),
        })
      }
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: {
        result: string | null
        queued?: boolean
        task_id?: string | null
        collaboration?: CollaborationData | null
        feedback_task_id?: string | null
        execution_path?: ExecutionPath | null
        stage?: string | null
        action?: string | null
        detail?: string | null
      } = await res.json()
      if (data.queued && data.task_id) {
        // Phase 14.1: a guardrail stage (Law/Contract/Rule) can defer a task, not just
        // concurrency overflow — `detail` carries the real reason when that happened.
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now() + 1,
            role: 'orchestrator',
            text: data.detail
              ? `BOSS, this task was queued (${data.stage}: ${data.action}) — ${data.detail}. It'll run once dispatched.`
              : 'The Orchestrator is busy with another task, so this one was queued — the result will appear here once it runs.',
          },
        ])
        pollQueuedTask(data.task_id, startedAt, autoSpeak)
        return
      }
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: 'orchestrator',
          text: data.result ?? '',
          collaboration: data.collaboration ?? undefined,
          durationMs: Date.now() - startedAt,
          feedbackTaskId: data.feedback_task_id ?? undefined,
          executionPath: data.execution_path ?? undefined,
        },
      ])
      if (autoSpeak && data.result) await playTtsResponse(data.result)
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
    if ((!value && !attachedFile) || pending) return
    setInput('')
    const file = attachedFile
    setAttachedFile(null)
    if (activeMode === 'learn') {
      await sendLearn(value)
    } else {
      await sendTask(value || `Attached file: ${file?.name ?? ''}`, file)
    }
  }

  const handleFilePicked = (file: File | undefined) => {
    if (!file) return
    if (!isAcceptedAttachment(file)) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'governance', govKind: 'rejected', text: `Unsupported file type: ${file.name} (PDF, TXT, MD, CSV, PNG, JPG only)` },
      ])
      return
    }
    setAttachedFile(file)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    handleFilePicked(e.dataTransfer.files?.[0])
  }

  const transcribeAndSend = async (blob: Blob) => {
    setIsTranscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')
      const res = await fetch(`${API_BASE_URL}/voice/transcribe`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: { text: string } = await res.json()
      const text = data.text.trim()
      if (!text) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'governance', govKind: 'rejected', text: "Couldn't make out any speech in that recording." },
        ])
        return
      }
      setInput(text)
      await sendTask(text, null, true)
      setInput('')
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'governance', govKind: 'rejected', text: 'Could not transcribe — is the backend running and STT configured?' },
      ])
    } finally {
      setIsTranscribing(false)
    }
  }

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        setIsRecording(false)
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        if (blob.size > 0) transcribeAndSend(blob)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'governance', govKind: 'rejected', text: 'Could not access the microphone — check browser permissions.' },
      ])
    }
  }

  useEffect(() => {
    const checkBriefing = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/briefing`, { signal: AbortSignal.timeout(3000) })
        if (!res.ok) return
        const data: { daily: BriefingPayload | null } = await res.json()
        if (!data.daily) return
        const lastSeen = localStorage.getItem(LAST_SEEN_BRIEFING_KEY)
        if (lastSeen === data.daily.generated_at) return
        localStorage.setItem(LAST_SEEN_BRIEFING_KEY, data.daily.generated_at)
        const b = data.daily
        const lines = [
          `${b.greeting}!`,
          `Goals: ${b.goals.active_count} active, avg progress ${b.goals.average_progress}%`,
          `Tasks waiting: ${b.pending_tasks}`,
          `Loops: ${b.active_loops}/${b.total_loops} active`,
          `Suggestions: ${b.suggestions_count}`,
        ]
        if (b.alerts.length > 0) lines.push(`Alerts: ${b.alerts.length} active`)
        setMessages((prev) => [{ id: Date.now(), role: 'briefing', text: lines.join('\n') }, ...prev])
      } catch {
        // briefing is a nice-to-have; silently skip if the backend isn't reachable yet
      }
    }
    checkBriefing()
  }, [])

  const submitFeedback = async (messageId: number, taskId: string, rating: number) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, feedbackRating: rating } : m)))
    try {
      await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId, rating }),
      })
    } catch {
      // the optimistic UI update already reflects the user's choice; a failed POST
      // just means the rating wasn't recorded server-side, not worth surfacing
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
      <div
        className={`chat-messages ${isDragging ? 'drag-active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && <div className="chat-drop-overlay">Drop file to attach (PDF, TXT, MD, CSV, PNG, JPG)</div>}
        {messages.length === 0 && <div className="empty-hint">Ask MAT.AI anything</div>}
        {messages.map((m) => {
          if (m.role === 'briefing') {
            return (
              <div key={m.id} className="chat-message briefing">
                {m.text}
              </div>
            )
          }

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

          const { body, label } = m.role === 'orchestrator' ? splitModelLabel(m.text) : { body: m.text, label: null }

          return (
            <div key={m.id} className={`chat-message ${m.role}`}>
              {m.attachmentName && <div className="chat-attachment-chip">📎 {m.attachmentName}</div>}
              {body}
              {label && <div className="chat-model-label">{label}</div>}
              {m.role === 'orchestrator' && (
                <>
                  {m.durationMs !== undefined && <span className="chat-duration-badge">{formatDuration(m.durationMs)}</span>}
                  {m.executionPath &&
                    (() => {
                      const badge = executionBadge(m.executionPath!)
                      return badge ? (
                        <span className={`chat-exec-badge ${badge.cls}`} title={badge.title}>
                          {badge.icon} {badge.label}
                        </span>
                      ) : null
                    })()}
                  <button className="chat-copy-btn" onClick={() => copyMessage(m)} type="button">
                    {copiedId === m.id ? 'Copied!' : '📋'}
                  </button>
                  {m.feedbackTaskId && (
                    <div className="chat-feedback-row">
                      <button
                        type="button"
                        className={`chat-feedback-btn ${m.feedbackRating === 5 ? 'active up' : ''}`}
                        disabled={m.feedbackRating !== undefined}
                        onClick={() => submitFeedback(m.id, m.feedbackTaskId!, 5)}
                        aria-label="Good response"
                      >
                        👍
                      </button>
                      <button
                        type="button"
                        className={`chat-feedback-btn ${m.feedbackRating !== undefined && m.feedbackRating <= 2 ? 'active down' : ''}`}
                        disabled={m.feedbackRating !== undefined}
                        onClick={() => submitFeedback(m.id, m.feedbackTaskId!, 1)}
                        aria-label="Poor response"
                      >
                        👎
                      </button>
                    </div>
                  )}
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

      {attachedFile && (
        <div className="chat-attachment-preview">
          <span className="chat-attachment-preview-name">
            📎 {attachedFile.name} <span className="chat-attachment-preview-size">({formatFileSize(attachedFile.size)})</span>
          </span>
          <button type="button" className="chat-attachment-remove-btn" onClick={() => setAttachedFile(null)} aria-label="Remove attachment">
            ✕
          </button>
        </div>
      )}

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
        <button
          type="button"
          className="attach-toggle-btn"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach file"
          title="Attach a file"
          disabled={pending}
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_ATTACHMENT_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={(e) => {
            handleFilePicked(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button
          type="button"
          className={`mic-toggle-btn ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          aria-label={isRecording ? 'Stop recording' : 'Record voice message'}
          title={isRecording ? 'Stop recording' : 'Record voice message'}
          disabled={pending || isTranscribing}
        >
          {isTranscribing ? '…' : isRecording ? '⏹️' : '🎤'}
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
