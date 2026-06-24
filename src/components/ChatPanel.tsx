import { useState } from 'react'
import { API_BASE_URL } from '../config'
import './ChatPanel.css'

interface ChatMessage {
  id: number
  role: 'user' | 'orchestrator'
  text: string
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
  { id: 'desktop', label: 'Desktop', icon: '🖥️' },
]

export default function ChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [activeMode, setActiveMode] = useState('chat')
  const [pending, setPending] = useState(false)
  const [modePickerOpen, setModePickerOpen] = useState(false)
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const send = async () => {
    const task = input.trim()
    if (!task || pending) return
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: task }])
    setInput('')
    setPending(true)
    try {
      const res = await fetch(`${API_BASE_URL}/task`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      })
      if (!res.ok) throw new Error(`Request failed: ${res.status}`)
      const data: { result: string } = await res.json()
      setMessages((prev) => [...prev, { id: Date.now() + 1, role: 'orchestrator', text: data.result }])
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: 'orchestrator', text: 'Could not reach the Orchestrator. Is the backend running?' },
      ])
    } finally {
      setPending(false)
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
    <div className="panel-card chat-panel">
      <div className="chat-messages">
        {messages.length === 0 && <div className="empty-hint">Ask MAT.AI anything</div>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-message ${m.role}`}>
            {m.text}
            {m.role === 'orchestrator' && (
              <button className="chat-copy-btn" onClick={() => copyMessage(m)} type="button">
                {copiedId === m.id ? 'Copied!' : '📋'}
              </button>
            )}
          </div>
        ))}
        {pending && <div className="chat-message orchestrator pending">Thinking…</div>}
      </div>

      <div className="chat-input-row">
        {modePickerOpen && (
          <div className="mode-picker">
            {INTERFACE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                title={mode.label}
                className={`interface-btn ${activeMode === mode.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveMode(mode.id)
                  setModePickerOpen(false)
                }}
              >
                <span className="interface-btn-icon">{mode.icon}</span>
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
          placeholder="Ask MAT.AI anything..."
          disabled={pending}
        />
        <button onClick={send} disabled={pending}>
          ➤
        </button>
      </div>
    </div>
  )
}
