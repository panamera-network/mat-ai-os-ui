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

  return (
    <div className="panel-card chat-panel">
      <h3>Interface</h3>
      <div className="interface-grid">
        {INTERFACE_MODES.map((mode) => (
          <button
            key={mode.id}
            type="button"
            className={`interface-btn ${activeMode === mode.id ? 'active' : ''}`}
            onClick={() => setActiveMode(mode.id)}
          >
            <span className="interface-btn-icon">{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.length === 0 && <div className="empty-hint">Ask MAT.AI anything</div>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-message ${m.role}`}>
            {m.text}
          </div>
        ))}
        {pending && <div className="chat-message orchestrator pending">Thinking…</div>}
      </div>

      <div className="chat-input-row">
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
