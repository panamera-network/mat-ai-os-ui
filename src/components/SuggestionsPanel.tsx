import { useState } from 'react'
import { useBackend } from '../context/BackendContext'
import './SuggestionsPanel.css'

const TYPE_ICON: Record<string, string> = {
  new_skill: '⚡',
  new_agent: '🤖',
  learn_topic: '🎓',
}

interface SuggestionsPanelProps {
  onClose: () => void
}

export default function SuggestionsPanel({ onClose }: SuggestionsPanelProps) {
  const { suggestions, dismissSuggestion, actOnSuggestion } = useBackend()
  const [actingId, setActingId] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})

  const handleAct = async (id: string) => {
    setActingId(id)
    const outcome = await actOnSuggestion(id)
    setActingId(null)
    if (outcome.status === 'ok') {
      setResults((prev) => ({ ...prev, [id]: 'Done.' }))
    } else {
      setResults((prev) => ({ ...prev, [id]: outcome.error ?? 'Could not act on this suggestion.' }))
    }
  }

  return (
    <>
      <div className="suggestions-backdrop" onClick={onClose} />
      <div className="suggestions-panel">
        <div className="suggestions-panel-header">
          <h3>Proactive Suggestions</h3>
          <button type="button" className="suggestions-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="suggestions-list">
          {suggestions.length === 0 && (
            <div className="suggestions-empty">No suggestions yet — keep using MAT.AI!</div>
          )}
          {suggestions.map((s) => (
            <div className="suggestion-card" key={s.id}>
              <div className="suggestion-card-top">
                <span className="suggestion-type-icon">{TYPE_ICON[s.type] ?? '💡'}</span>
                <span className="suggestion-card-title">{s.title}</span>
                <span className={`suggestion-priority-badge priority-${s.priority}`}>{s.priority}</span>
              </div>
              <div className="suggestion-card-reason">{s.reason}</div>
              {results[s.id] ? (
                <div className="suggestion-card-result">{results[s.id]}</div>
              ) : (
                <div className="suggestion-card-actions">
                  <button
                    type="button"
                    className="suggestion-act-btn"
                    disabled={actingId === s.id}
                    onClick={() => handleAct(s.id)}
                  >
                    {actingId === s.id ? 'Acting…' : 'Act'}
                  </button>
                  <button
                    type="button"
                    className="suggestion-dismiss-btn"
                    disabled={actingId === s.id}
                    onClick={() => dismissSuggestion(s.id)}
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
