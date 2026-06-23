import { useState } from 'react'
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

  const send = () => {
    if (!input.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), role: 'user', text: input.trim() }])
    setInput('')
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
      </div>

      <div className="chat-input-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Ask MAT.AI anything..."
        />
        <button onClick={send}>➤</button>
      </div>
    </div>
  )
}
