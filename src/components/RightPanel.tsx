import MemorySystem from './MemorySystem'
import ChatPanel from './ChatPanel'

export default function RightPanel() {
  return (
    <aside className="right-panel">
      <MemorySystem />
      <ChatPanel />
    </aside>
  )
}
