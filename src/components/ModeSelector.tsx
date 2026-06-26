import { useBackend } from '../context/BackendContext'
import './ModeSelector.css'

const MODES: Array<{ id: 'work' | 'trading' | 'learning'; label: string; icon: string }> = [
  { id: 'work', label: 'Work', icon: '💼' },
  { id: 'trading', label: 'Trading', icon: '📈' },
  { id: 'learning', label: 'Learning', icon: '🎓' },
]

export default function ModeSelector() {
  const { identity, updateIdentity } = useBackend()
  const activeMode = identity?.active_mode ?? 'work'

  return (
    <div className="mode-selector">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`mode-btn ${activeMode === mode.id ? 'active' : ''}`}
          onClick={() => updateIdentity('active_mode', mode.id)}
          title={`${mode.label} mode`}
        >
          <span>{mode.icon}</span>
          {mode.label}
        </button>
      ))}
    </div>
  )
}
